from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    store_name: Optional[str] = None
    invite_code: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, description="8文字以上")

class Token(BaseModel):
    access_token: str
    # 旧クライアント互換のため任意項目にしている（未対応クライアントは無視するだけで動く）
    refresh_token: Optional[str] = None
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: str
    store_id: Optional[uuid.UUID]

    model_config = {"from_attributes": True}
