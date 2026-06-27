import httpx
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models.weather_log import WeatherLog
from app.models.store import Store
import uuid

CONDITION_LABELS = {
    "Clear": "晴れ",
    "Clouds": "曇り",
    "Rain": "雨",
    "Drizzle": "小雨",
    "Thunderstorm": "嵐",
    "Snow": "雪",
    "Mist": "霧",
    "Fog": "霧",
    "Haze": "もや",
}

def get_condition_label(condition: str, temp_max: float) -> tuple[str, str]:
    label = CONDITION_LABELS.get(condition, condition)
    if temp_max >= 30:
        label += "・猛暑"
    elif temp_max <= 10:
        label += "・寒い"
    return condition, label

async def fetch_today_weather(store: Store) -> Optional[dict]:
    if not settings.OPENWEATHERMAP_API_KEY:
        return None
    try:
        if store.latitude and store.longitude:
            query = f"lat={store.latitude}&lon={store.longitude}"
        elif store.city_name:
            query = f"q={store.city_name}"
        else:
            return None

        async with httpx.AsyncClient() as client:
            url = f"https://api.openweathermap.org/data/2.5/forecast?{query}&appid={settings.OPENWEATHERMAP_API_KEY}&units=metric&cnt=8"
            resp = await client.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()

        temps = [item["main"]["temp"] for item in data["list"][:8]]
        condition = data["list"][0]["weather"][0]["main"]
        precipitation = sum(item.get("rain", {}).get("3h", 0) for item in data["list"][:8])

        return {
            "condition": condition,
            "temp_max": max(temps),
            "temp_min": min(temps),
            "precipitation": round(precipitation, 2),
        }
    except Exception:
        return None

def save_weather_log(db: Session, store_id: uuid.UUID, weather_date: date, weather_data: dict) -> WeatherLog:
    condition = weather_data["condition"]
    temp_max = weather_data["temp_max"]
    _, label = get_condition_label(condition, temp_max)

    existing = db.query(WeatherLog).filter(
        WeatherLog.store_id == store_id,
        WeatherLog.weather_date == weather_date,
    ).first()

    if existing:
        existing.condition = condition
        existing.condition_label = label
        existing.temp_max = temp_max
        existing.temp_min = weather_data["temp_min"]
        existing.precipitation = weather_data["precipitation"]
        db.commit()
        return existing

    log = WeatherLog(
        store_id=store_id,
        weather_date=weather_date,
        condition=condition,
        condition_label=label,
        temp_max=temp_max,
        temp_min=weather_data["temp_min"],
        precipitation=weather_data["precipitation"],
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
