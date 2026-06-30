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


from pydantic import BaseModel

class WeatherApiKeyUpdate(BaseModel):
    api_key: str

@router.post("/weather-api-key")
def update_weather_api_key(
    payload: WeatherApiKeyUpdate,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    store.weather_api_key = payload.api_key.strip()
    db.commit()
    return {"ok": True}


@router.get("/weather-api-key-status")
def get_weather_api_key_status(store: Store = Depends(get_current_store)):
    has_key = bool(store.weather_api_key)
    masked = ""
    if has_key:
        k = store.weather_api_key
        masked = k[:4] + "****" + k[-4:] if len(k) >= 8 else "****"
    return {"has_key": has_key, "masked": masked}
