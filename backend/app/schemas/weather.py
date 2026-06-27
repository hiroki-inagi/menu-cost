from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import date, datetime

class WeatherLogResponse(BaseModel):
    id: uuid.UUID
    weather_date: date
    condition: str
    condition_label: Optional[str]
    temp_max: Optional[float]
    temp_min: Optional[float]
    precipitation: Optional[float]

    model_config = {"from_attributes": True}

class TodayWeather(BaseModel):
    date: date
    condition: str
    condition_label: str
    temp_max: float
    temp_min: float
    precipitation: float
    city: Optional[str]
