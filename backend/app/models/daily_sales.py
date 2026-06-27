import uuid
from sqlalchemy import Column, Integer, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DailySales(Base):
    __tablename__ = "daily_sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    sold_date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    revenue = Column(Numeric(12, 2), nullable=False, default=0)
    day_of_week = Column(Integer, nullable=False)  # 0=Mon, 6=Sun
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    recipe = relationship("Recipe", back_populates="daily_sales")
