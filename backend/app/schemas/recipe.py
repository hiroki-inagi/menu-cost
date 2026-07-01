from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

class RecipeIngredientCreate(BaseModel):
    ingredient_id: uuid.UUID
    quantity: float
    yield_rate: float = 1.0

class RecipeIngredientUpdate(BaseModel):
    ingredient_id: Optional[uuid.UUID] = None
    quantity: Optional[float] = None
    yield_rate: Optional[float] = None

class RecipeIngredientResponse(BaseModel):
    id: uuid.UUID
    ingredient_id: uuid.UUID
    ingredient_name: str
    unit: str
    unit_price: float
    quantity: float
    yield_rate: float
    cost: float  # unit_price * quantity / yield_rate

    model_config = {"from_attributes": True}

class RecipeCreate(BaseModel):
    name: str
    category: Optional[str] = None
    target_cost_rate: Optional[float] = None
    selling_price: Optional[float] = None
    servings: int = 1
    image_url: Optional[str] = None
    note: Optional[str] = None
    ingredients: List[RecipeIngredientCreate] = []

class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    target_cost_rate: Optional[float] = None
    selling_price: Optional[float] = None
    servings: int = 1
    image_url: Optional[str] = None
    note: Optional[str] = None
    is_active: Optional[bool] = None

class CostCalculation(BaseModel):
    total_cost: float
    cost_per_serving: float
    effective_cost_rate: Optional[float]       # 現行売価での原価率
    recommended_price_ex_tax: Optional[float]  # 税抜推奨売価
    recommended_price_in_tax: Optional[float]  # 税込推奨売価
    target_cost_rate: float
    status: str  # "good" | "warning" | "danger"

class RecipeResponse(BaseModel):
    id: uuid.UUID
    name: str
    category: Optional[str]
    target_cost_rate: Optional[float]
    selling_price: Optional[float]
    servings: int
    image_url: Optional[str]
    note: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    recipe_ingredients: List[RecipeIngredientResponse] = []
    calculation: Optional[CostCalculation] = None

    model_config = {"from_attributes": True}
