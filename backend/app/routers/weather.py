from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.store import Store
from app.models.weather_log import WeatherLog
from app.schemas.weather import WeatherLogResponse, TodayWeather
from app.services.weather_service import fetch_today_weather, save_weather_log
from app.routers.deps import get_current_store
import asyncio

router = APIRouter(prefix="/api/weather", tags=["weather"])

@router.get("/today", response_model=TodayWeather)
async def get_today_weather(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    today = date.today()
    cached = db.query(WeatherLog).filter(
        WeatherLog.store_id == store.id,
        WeatherLog.weather_date == today,
    ).first()
    if cached:
        return TodayWeather(
            date=cached.weather_date,
            condition=cached.condition,
            condition_label=cached.condition_label or cached.condition,
            temp_max=float(cached.temp_max or 0),
            temp_min=float(cached.temp_min or 0),
            precipitation=float(cached.precipitation or 0),
            city=store.city_name,
        )
    data = await fetch_today_weather(store)
    if not data:
        raise HTTPException(503, "天気データを取得できません。店舗設定で都市名またはAPIキーを確認してください。")
    log = save_weather_log(db, store.id, today, data)
    return TodayWeather(
        date=log.weather_date,
        condition=log.condition,
        condition_label=log.condition_label or log.condition,
        temp_max=float(log.temp_max or 0),
        temp_min=float(log.temp_min or 0),
        precipitation=float(log.precipitation or 0),
        city=store.city_name,
    )
