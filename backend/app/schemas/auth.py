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
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: str
    store_id: Optional[uuid.UUID]

    model_config = {"from_attributes": True}
