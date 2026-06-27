from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

class SupplierCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    note: Optional[str] = None

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    note: Optional[str] = None

class SupplierResponse(BaseModel):
    id: uuid.UUID
    name: str
    contact: Optional[str]
    note: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
