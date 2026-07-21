from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.store import Store
from app.auth.jwt import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.schemas.auth import (
    UserCreate,
    Token,
    UserResponse,
    ChangePasswordRequest,
    RefreshRequest,
)
from app.routers.deps import get_current_user
from app.services.invite_code import generate_unique_invite_code, normalize_invite_code
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    store = None
    role = UserRole.owner

    if payload.invite_code:
        # 招待コードが入力された場合は既存店舗に参加する（データを共有）
        code = normalize_invite_code(payload.invite_code)
        store = db.query(Store).filter(Store.invite_code == code).first()
        if not store:
            raise HTTPException(status_code=404, detail="招待コードが見つかりません。コードをご確認ください")
        role = UserRole.staff
    elif payload.store_name:
        # 新規店舗を作成する
        store = Store(name=payload.store_name, invite_code=generate_unique_invite_code(db))
        db.add(store)
        db.flush()

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        name=payload.name,
        role=role,
        store_id=store.id if store else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return Token(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/refresh", response_model=Token)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    """
    リフレッシュトークンからアクセストークンを再発行する。
    アクセストークン期限切れでもログイン画面へ飛ばされないようにするための入口。
    """
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="リフレッシュトークンが無効です",
    )
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise invalid

    try:
        user_id = uuid.UUID(data["sub"])
    except (KeyError, ValueError, TypeError):
        raise invalid

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise invalid

    return Token(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ログイン中のユーザーが自分でパスワードを変更する。"""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="現在のパスワードが正しくありません")
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "パスワードを変更しました"}


@router.get("/invite-code/{code}")
def lookup_invite_code(code: str, db: Session = Depends(get_db)):
    """登録画面で招待コードを入力した際、参加先の店舗名を確認するための公開エンドポイント。"""
    store = db.query(Store).filter(Store.invite_code == normalize_invite_code(code)).first()
    if not store:
        raise HTTPException(status_code=404, detail="招待コードが見つかりません")
    return {"store_name": store.name}

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
