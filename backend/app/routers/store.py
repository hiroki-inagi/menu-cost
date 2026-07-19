import uuid
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.store import Store
from app.schemas.store import StoreSettingsUpdate, StoreResponse
from app.routers.deps import get_current_user, get_current_store
from app.services.invite_code import generate_unique_invite_code

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


@router.get("/invite-code")
def get_invite_code(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    """自店舗の招待コードを取得。未発行の店舗にはこの時点で発行する。"""
    if not store.invite_code:
        store.invite_code = generate_unique_invite_code(db)
        db.commit()
        db.refresh(store)
    return {"invite_code": store.invite_code, "store_name": store.name}


@router.post("/invite-code/regenerate")
def regenerate_invite_code(
    current_user: User = Depends(get_current_user),
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    """招待コードを再発行する（オーナーのみ）。古いコードは無効になる。"""
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="招待コードの再発行はオーナーのみ可能です")
    store.invite_code = generate_unique_invite_code(db)
    db.commit()
    db.refresh(store)
    return {"invite_code": store.invite_code}


@router.get("/members")
def list_members(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    """同じ店舗（＝同じデータ）を共有しているメンバー一覧。"""
    users = db.query(User).filter(User.store_id == store.id).order_by(User.created_at).all()
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.delete("/members/{user_id}")
def remove_member(
    user_id: uuid.UUID,
    mode: Literal["remove", "delete"] = "remove",
    current_user: User = Depends(get_current_user),
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    """メンバーを店舗から外す、またはアカウントごと削除する（オーナーのみ）。

    mode="remove": store_id を外すだけ。アカウントは残り、招待コードで再参加できる。
    mode="delete": users テーブルから完全に削除する。元に戻せない。
    """
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="メンバーの削除はオーナーのみ可能です")

    target = db.query(User).filter(User.id == user_id, User.store_id == store.id).first()
    if not target:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="自分自身は削除できません")

    if target.role == UserRole.owner:
        raise HTTPException(status_code=400, detail="オーナーは削除できません")

    if mode == "delete":
        db.delete(target)
    else:
        target.store_id = None

    db.commit()
    return {"ok": True, "mode": mode}


@router.get("/weather-api-key-status")
def get_weather_api_key_status(store: Store = Depends(get_current_store)):
    has_key = bool(store.weather_api_key)
    masked = ""
    if has_key:
        k = store.weather_api_key
        masked = k[:4] + "****" + k[-4:] if len(k) >= 8 else "****"
    return {"has_key": has_key, "masked": masked}
