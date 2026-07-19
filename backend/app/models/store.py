import uuid
from sqlalchemy import Column, String, Numeric, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Store(Base):
    __tablename__ = "stores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    invite_code = Column(String(12), unique=True, index=True, nullable=True)
    default_cost_rate = Column(Numeric(5, 4), nullable=False, default=0.30)
    tax_rate = Column(Numeric(5, 4), nullable=False, default=0.10)
    rounding_unit = Column(Integer, nullable=False, default=50)
    labor_cost_rate = Column(Numeric(5, 4), nullable=True)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    city_name = Column(String, nullable=True)
    weather_api_key = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    users = relationship("User", back_populates="store")
    ingredients = relationship("Ingredient", back_populates="store", cascade="all, delete-orphan")
    recipes = relationship("Recipe", back_populates="store", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="store", cascade="all, delete-orphan")
    weather_logs = relationship("WeatherLog", back_populates="store", cascade="all, delete-orphan")
