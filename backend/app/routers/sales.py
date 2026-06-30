from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date
import calendar
from app.database import get_db
from app.models.store import Store
from app.models.recipe import Recipe
from app.models.daily_sales import DailySales
from app.models.weather_log import WeatherLog
from app.schemas.sales import (
    DailySalesCreate, DailySalesResponse, RankingItem,
    WeatherSalesItem, WeekdayHeatmapItem, TodayRecommend, WeatherCorrelationPoint
)
from app.services.sales_analyzer import (
    get_sales_ranking, get_weekday_heatmap, get_weather_sales,
    get_today_recommendations, get_weather_correlation
)
from app.routers.deps import get_current_store
import uuid

router = APIRouter(prefix="/api/sales", tags=["sales"])

@router.get("/daily", response_model=List[DailySalesResponse])
def get_daily_sales(sold_date: date = Query(default=None), store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    target = sold_date or date.today()
    rows = db.query(DailySales).filter(DailySales.store_id == store.id, DailySales.sold_date == target).all()
    result = []
    for r in rows:
        result.append(DailySalesResponse(
            id=r.id, recipe_id=r.recipe_id,
            recipe_name=r.recipe.name if r.recipe else "",
            sold_date=r.sold_date, quantity=r.quantity,
            revenue=float(r.revenue), day_of_week=r.day_of_week,
        ))
    return result

@router.post("/daily")
def upsert_daily_sales(payload: DailySalesCreate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    for entry in payload.entries:
        recipe = db.query(Recipe).filter(Recipe.id == entry.recipe_id, Recipe.store_id == store.id).first()
        if not recipe:
            raise HTTPException(400, f"Recipe {entry.recipe_id} not found")
        revenue = float(recipe.selling_price or 0) * entry.quantity
        existing = db.query(DailySales).filter(
            DailySales.store_id == store.id,
            DailySales.recipe_id == entry.recipe_id,
            DailySales.sold_date == payload.sold_date,
        ).first()
        dow = payload.sold_date.weekday()
        if existing:
            existing.quantity = entry.quantity
            existing.revenue = revenue
        else:
            db.add(DailySales(
                store_id=store.id, recipe_id=entry.recipe_id,
                sold_date=payload.sold_date, quantity=entry.quantity,
                revenue=revenue, day_of_week=dow,
            ))
    db.commit()
    return {"ok": True}

@router.get("/analysis/ranking", response_model=List[RankingItem])
def sales_ranking(
    period: str = Query(default="week", regex="^(day|week|month)$"),
    ref_date: Optional[date] = Query(default=None),
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    return get_sales_ranking(db, store.id, period, ref_date or date.today())

@router.get("/analysis/by-weekday", response_model=List[WeekdayHeatmapItem])
def by_weekday(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    return get_weekday_heatmap(db, store.id)

@router.get("/analysis/by-weather", response_model=List[WeatherSalesItem])
def by_weather(condition: Optional[str] = None, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    return get_weather_sales(db, store.id, condition)

@router.get("/analysis/today-recommend", response_model=List[TodayRecommend])
def today_recommend(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    today_log = db.query(WeatherLog).filter(
        WeatherLog.store_id == store.id,
        WeatherLog.weather_date == date.today(),
    ).first()
    if not today_log:
        return []
    return get_today_recommendations(db, store.id, today_log.condition, float(today_log.temp_max or 20))

@router.get("/analysis/weather-correlation", response_model=List[WeatherCorrelationPoint])
def weather_correlation(recipe_id: uuid.UUID, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    return get_weather_correlation(db, store.id, recipe_id)

@router.get("/analysis/monthly")
def monthly_sales(
    year: int = Query(default=None),
    month: int = Query(default=None),
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    """月間の日別売上合計を返す。デフォルトは当月。"""
    today = date.today()
    y = year or today.year
    m = month or today.month

    # 月の初日〜末日
    _, last_day = calendar.monthrange(y, m)
    month_start = date(y, m, 1)
    month_end = date(y, m, last_day)

    # 日別合計
    rows = (
        db.query(
            DailySales.sold_date,
            func.sum(DailySales.revenue).label("total_revenue"),
            func.sum(DailySales.quantity).label("total_quantity"),
        )
        .filter(
            DailySales.store_id == store.id,
            DailySales.sold_date >= month_start,
            DailySales.sold_date <= month_end,
        )
        .group_by(DailySales.sold_date)
        .order_by(DailySales.sold_date)
        .all()
    )

    # 日別の詳細（クリックしたとき用）
    detail_rows = (
        db.query(DailySales)
        .filter(
            DailySales.store_id == store.id,
            DailySales.sold_date >= month_start,
            DailySales.sold_date <= month_end,
        )
        .all()
    )

    # 日付ごとのメニュー詳細をまとめる
    detail_map: dict = {}
    for r in detail_rows:
        key = str(r.sold_date)
        if key not in detail_map:
            detail_map[key] = []
        detail_map[key].append({
            "recipe_id": str(r.recipe_id),
            "recipe_name": r.recipe.name if r.recipe else "",
            "quantity": r.quantity,
            "revenue": float(r.revenue),
        })

    daily = [
        {
            "date": str(row.sold_date),
            "total_revenue": float(row.total_revenue or 0),
            "total_quantity": int(row.total_quantity or 0),
            "items": detail_map.get(str(row.sold_date), []),
        }
        for row in rows
    ]

    total_revenue = sum(d["total_revenue"] for d in daily)
    sales_days = len(daily)

    return {
        "year": y,
        "month": m,
        "daily": daily,
        "total_revenue": total_revenue,
        "sales_days": sales_days,
        "avg_daily_revenue": total_revenue / sales_days if sales_days > 0 else 0,
    }
