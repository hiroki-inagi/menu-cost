from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.store import Store
from app.schemas.store import StoreSettingsUpdate, StoreResponse
from app.routers.deps import get_current_user, get_current_store

router = APIRouter(prefix="/api/store", tags=["store"])

@router.get("/settings", response_model=StoreResponse)
def get_settings(store: Store = Depends(get_current_store)):
    return store

@router.put("/settings", response_model=StoreResponse)
def update_settings(payload: StoreSettingsUpdate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(store, k, v)
    db.commit()
    db.refresh(store)
    return store


import os
from pydantic import BaseModel

class WeatherApiKeyUpdate(BaseModel):
    api_key: str

@router.post("/weather-api-key")
def update_weather_api_key(
    payload: WeatherApiKeyUpdate,
    current_user: User = Depends(get_current_user),
):
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    env_path = os.path.abspath(env_path)

    # .env を読み込んで該当行を更新
    if os.path.exists(env_path):
        lines = open(env_path, 'r', encoding='utf-8').readlines()
    else:
        lines = []

    key_line = f"OPENWEATHERMAP_API_KEY={payload.api_key}\n"
    updated = False
    for i, line in enumerate(lines):
        if line.startswith("OPENWEATHERMAP_API_KEY="):
            lines[i] = key_line
            updated = True
            break
    if not updated:
        lines.append(key_line)

    open(env_path, 'w', encoding='utf-8').writelines(lines)

    # ランタイムにも即時反映
    os.environ["OPENWEATHERMAP_API_KEY"] = payload.api_key
    from app.config import settings
    settings.OPENWEATHERMAP_API_KEY = payload.api_key

    return {"ok": True}


@router.get("/weather-api-key-status")
def get_weather_api_key_status(current_user: User = Depends(get_current_user)):
    from app.config import settings
    has_key = bool(settings.OPENWEATHERMAP_API_KEY and settings.OPENWEATHERMAP_API_KEY != "your-openweathermap-api-key-here")
    masked = ""
    if has_key:
        k = settings.OPENWEATHERMAP_API_KEY
        masked = k[:4] + "****" + k[-4:] if len(k) >= 8 else "****"
    return {"has_key": has_key, "masked": masked}
