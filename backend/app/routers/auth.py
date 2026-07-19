import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.store import Store
from app.models.password_reset import PasswordResetToken
from app.auth.jwt import verify_password, get_password_hash, create_access_token
from app.schemas.auth import (
    UserCreate, Token, UserResponse,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
)
from app.models.user import UserRole
from app.routers.deps import get_current_user
from app.services.invite_code import generate_unique_invite_code, normalize_invite_code
from app.services.mailer import send_password_reset_email

logger = logging.getLogger(__name__)

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
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """再設定リンクをメール送信する。

    メールアドレスが登録済みかどうかを外部に漏らさないため、
    ユーザーが存在しない場合も送信失敗の場合も同じレスポンスを返す。
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if user and user.is_active:
        # 既存の未使用トークンを無効化してから新しく発行する
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": datetime.now(timezone.utc)})

        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
            expires_at=expires_at,
        ))
        db.commit()

        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
        try:
            send_password_reset_email(
                to=user.email,
                user_name=user.name,
                reset_url=reset_url,
                expire_minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES,
            )
        except Exception:
            logger.exception("パスワード再設定メールの送信に失敗しました: %s", user.email)

    return {"message": "登録されているメールアドレスであれば、再設定用のリンクを送信しました"}


def _consume_reset_token(db: Session, token: str) -> User:
    """トークンを検証し、対応するユーザーを返す。無効なら400を投げる。"""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash
    ).first()

    if not record or record.used_at is not None:
        raise HTTPException(status_code=400, detail="このリンクは無効か、既に使用されています")

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="リンクの有効期限が切れています。もう一度お手続きください")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="ユーザーが見つかりません")

    record.used_at = datetime.now(timezone.utc)
    return user


@router.get("/reset-password/verify")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """再設定ページを開いた時点でトークンの有効性を確認する（消費はしない）。"""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash
    ).first()

    if not record or record.used_at is not None:
        raise HTTPException(status_code=400, detail="このリンクは無効か、既に使用されています")

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="リンクの有効期限が切れています。もう一度お手続きください")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="ユーザーが見つかりません")

    return {"valid": True, "email": user.email}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = _consume_reset_token(db, payload.token)
    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "パスワードを再設定しました。新しいパスワードでログインしてください"}


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
