from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

class IngredientCreate(BaseModel):
    name: str
    unit: str
    unit_price: float
    category: Optional[str] = None
    supplier_id: Optional[uuid.UUID] = None
    note: Optional[str] = None

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    category: Optional[str] = None
    supplier_id: Optional[uuid.UUID] = None
    note: Optional[str] = None

class PriceHistoryResponse(BaseModel):
    id: uuid.UUID
    unit_price: float
    recorded_at: datetime

    model_config = {"from_attributes": True}

class IngredientResponse(BaseModel):
    id: uuid.UUID
    name: str
    unit: str
    unit_price: float
    category: Optional[str]
    supplier_id: Optional[uuid.UUID]
    note: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    recipe_count: int = 0

    model_config = {"from_attributes": True}
