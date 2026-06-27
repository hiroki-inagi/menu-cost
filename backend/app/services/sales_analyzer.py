from datetime import date, timedelta
from typing import List, Optional
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from app.models.daily_sales import DailySales
from app.models.weather_log import WeatherLog
from app.models.recipe import Recipe
from app.schemas.sales import RankingItem, WeatherSalesItem, WeekdayHeatmapItem, TodayRecommend, WeatherCorrelationPoint
import uuid

def get_period_range(period: str, ref_date: date):
    if period == "day":
        return ref_date, ref_date
    elif period == "week":
        start = ref_date - timedelta(days=ref_date.weekday())
        return start, start + timedelta(days=6)
    elif period == "month":
        start = ref_date.replace(day=1)
        if ref_date.month == 12:
            end = date(ref_date.year + 1, 1, 1) - timedelta(days=1)
        else:
            end = date(ref_date.year, ref_date.month + 1, 1) - timedelta(days=1)
        return start, end
    return ref_date, ref_date

def get_sales_ranking(db: Session, store_id: uuid.UUID, period: str, ref_date: date) -> List[RankingItem]:
    start, end = get_period_range(period, ref_date)
    rows = (
        db.query(
            DailySales.recipe_id,
            Recipe.name.label("recipe_name"),
            Recipe.category,
            func.sum(DailySales.quantity).label("total_quantity"),
            func.sum(DailySales.revenue).label("total_revenue"),
        )
        .join(Recipe, DailySales.recipe_id == Recipe.id)
        .filter(
            DailySales.store_id == store_id,
            DailySales.sold_date.between(start, end),
        )
        .group_by(DailySales.recipe_id, Recipe.name, Recipe.category)
        .order_by(func.sum(DailySales.quantity).desc())
        .all()
    )
    return [
        RankingItem(
            recipe_id=r.recipe_id,
            recipe_name=r.recipe_name,
            category=r.category,
            total_quantity=r.total_quantity or 0,
            total_revenue=float(r.total_revenue or 0),
        )
        for r in rows
    ]

def get_weekday_heatmap(db: Session, store_id: uuid.UUID) -> List[WeekdayHeatmapItem]:
    rows = (
        db.query(
            DailySales.recipe_id,
            Recipe.name.label("recipe_name"),
            DailySales.day_of_week,
            func.sum(DailySales.quantity).label("total_quantity"),
        )
        .join(Recipe, DailySales.recipe_id == Recipe.id)
        .filter(DailySales.store_id == store_id)
        .group_by(DailySales.recipe_id, Recipe.name, DailySales.day_of_week)
        .all()
    )
    return [
        WeekdayHeatmapItem(
            recipe_id=r.recipe_id,
            recipe_name=r.recipe_name,
            day_of_week=r.day_of_week,
            total_quantity=r.total_quantity or 0,
        )
        for r in rows
    ]

def get_weather_sales(db: Session, store_id: uuid.UUID, condition: Optional[str] = None) -> List[WeatherSalesItem]:
    q = (
        db.query(
            WeatherLog.condition,
            WeatherLog.condition_label,
            Recipe.name.label("recipe_name"),
            DailySales.recipe_id,
            func.avg(DailySales.quantity).label("avg_quantity"),
            func.count(DailySales.sold_date.distinct()).label("total_days"),
        )
        .join(DailySales, and_(
            DailySales.store_id == WeatherLog.store_id,
            DailySales.sold_date == WeatherLog.weather_date,
        ))
        .join(Recipe, DailySales.recipe_id == Recipe.id)
        .filter(WeatherLog.store_id == store_id)
    )
    if condition:
        q = q.filter(WeatherLog.condition == condition)
    rows = (
        q.group_by(WeatherLog.condition, WeatherLog.condition_label, Recipe.name, DailySales.recipe_id)
        .order_by(func.avg(DailySales.quantity).desc())
        .all()
    )
    return [
        WeatherSalesItem(
            condition=r.condition,
            condition_label=r.condition_label or r.condition,
            recipe_name=r.recipe_name,
            recipe_id=r.recipe_id,
            avg_quantity=round(float(r.avg_quantity or 0), 2),
            total_days=r.total_days or 0,
        )
        for r in rows
    ]

def get_today_recommendations(db: Session, store_id: uuid.UUID, today_condition: str, today_temp: float) -> List[TodayRecommend]:
    # 同条件の過去日の売上を集計
    similar_dates = db.query(WeatherLog.weather_date).filter(
        WeatherLog.store_id == store_id,
        WeatherLog.condition == today_condition,
    ).all()
    date_list = [r.weather_date for r in similar_dates]

    if not date_list:
        return []

    rows = (
        db.query(
            DailySales.recipe_id,
            Recipe.name.label("recipe_name"),
            Recipe.category,
            func.avg(DailySales.quantity).label("avg_quantity"),
            func.count(DailySales.id).label("data_count"),
        )
        .join(Recipe, DailySales.recipe_id == Recipe.id)
        .filter(
            DailySales.store_id == store_id,
            DailySales.sold_date.in_(date_list),
        )
        .group_by(DailySales.recipe_id, Recipe.name, Recipe.category)
        .order_by(func.avg(DailySales.quantity).desc())
        .limit(5)
        .all()
    )

    result = []
    for r in rows:
        count = r.data_count or 0
        confidence = "high" if count >= 10 else ("medium" if count >= 3 else "low")
        result.append(TodayRecommend(
            recipe_id=r.recipe_id,
            recipe_name=r.recipe_name,
            category=r.category,
            avg_quantity=round(float(r.avg_quantity or 0), 1),
            confidence=confidence,
            reason=f"過去{len(date_list)}日の{today_condition}の日に平均{round(float(r.avg_quantity or 0), 1)}食",
        ))
    return result

def get_weather_correlation(db: Session, store_id: uuid.UUID, recipe_id: uuid.UUID) -> List[WeatherCorrelationPoint]:
    rows = (
        db.query(
            DailySales.sold_date,
            WeatherLog.temp_max,
            DailySales.quantity,
            WeatherLog.condition,
        )
        .join(WeatherLog, and_(
            WeatherLog.store_id == DailySales.store_id,
            WeatherLog.weather_date == DailySales.sold_date,
        ))
        .filter(
            DailySales.store_id == store_id,
            DailySales.recipe_id == recipe_id,
        )
        .order_by(DailySales.sold_date)
        .all()
    )
    return [
        WeatherCorrelationPoint(
            date=r.sold_date,
            temp_max=float(r.temp_max or 0),
            quantity=r.quantity,
            condition=r.condition or "",
        )
        for r in rows
    ]
