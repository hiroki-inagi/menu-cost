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
