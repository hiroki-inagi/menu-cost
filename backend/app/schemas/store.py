from pydantic import BaseModel
from typing import Optional
import uuid

class StoreSettingsUpdate(BaseModel):
    name: Optional[str] = None
    default_cost_rate: Optional[float] = None
    tax_rate: Optional[float] = None
    rounding_unit: Optional[int] = None
    labor_cost_rate: Optional[float] = None
    city_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class StoreResponse(BaseModel):
    id: uuid.UUID
    name: str
    default_cost_rate: float
    tax_rate: float
    rounding_unit: int
    labor_cost_rate: Optional[float]
    city_name: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]

    model_config = {"from_attributes": True}
