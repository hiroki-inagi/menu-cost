import uuid
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class WeatherLog(Base):
    __tablename__ = "weather_logs"
    __table_args__ = (UniqueConstraint("store_id", "weather_date", name="uq_store_date"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    weather_date = Column(Date, nullable=False)
    condition = Column(String, nullable=False)
    condition_label = Column(String, nullable=True)
    temp_max = Column(Numeric(5, 2), nullable=True)
    temp_min = Column(Numeric(5, 2), nullable=True)
    precipitation = Column(Numeric(7, 2), nullable=True, default=0)
    source = Column(String, nullable=True, default="OpenWeatherMap")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="weather_logs")
