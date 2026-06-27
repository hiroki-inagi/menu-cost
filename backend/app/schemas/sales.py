from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import date, datetime

class SalesEntry(BaseModel):
    recipe_id: uuid.UUID
    quantity: int

class DailySalesCreate(BaseModel):
    sold_date: date
    entries: List[SalesEntry]

class DailySalesResponse(BaseModel):
    id: uuid.UUID
    recipe_id: uuid.UUID
    recipe_name: str
    sold_date: date
    quantity: int
    revenue: float
    day_of_week: int

    model_config = {"from_attributes": True}

class RankingItem(BaseModel):
    recipe_id: uuid.UUID
    recipe_name: str
    category: Optional[str]
    total_quantity: int
    total_revenue: float

class WeatherSalesItem(BaseModel):
    condition: str
    condition_label: str
    recipe_name: str
    recipe_id: uuid.UUID
    avg_quantity: float
    total_days: int

class WeekdayHeatmapItem(BaseModel):
    recipe_id: uuid.UUID
    recipe_name: str
    day_of_week: int
    total_quantity: int

class TodayRecommend(BaseModel):
    recipe_id: uuid.UUID
    recipe_name: str
    category: Optional[str]
    avg_quantity: float
    confidence: str  # "high" | "medium" | "low"
    reason: str

class WeatherCorrelationPoint(BaseModel):
    date: date
    temp_max: float
    quantity: int
    condition: str
