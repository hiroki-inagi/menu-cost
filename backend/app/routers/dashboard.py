from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.store import Store
from app.models.recipe import Recipe, RecipeIngredient
from app.models.ingredient import Ingredient
from app.services.cost_calculator import calculate_recipe_cost
from app.routers.deps import get_current_store
from sqlalchemy.orm import joinedload
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

class KpiResponse(BaseModel):
    total_recipes: int
    avg_cost_rate: Optional[float]
    danger_count: int
    total_ingredients: int
    fl_ratio: Optional[float]

class CategoryBreakdown(BaseModel):
    category: str
    recipe_count: int
    avg_cost_rate: Optional[float]

class CostRankItem(BaseModel):
    recipe_id: uuid.UUID
    recipe_name: str
    category: Optional[str]
    cost_per_serving: float
    selling_price: Optional[float]
    cost_rate: Optional[float]
    status: str

@router.get("/summary", response_model=KpiResponse)
def summary(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    recipes = (
        db.query(Recipe)
        .options(joinedload(Recipe.recipe_ingredients).joinedload(RecipeIngredient.ingredient))
        .filter(Recipe.store_id == store.id, Recipe.is_active == True)
        .all()
    )
    calcs = [calculate_recipe_cost(r, store) for r in recipes]
    rates = [c.effective_cost_rate for c in calcs if c.effective_cost_rate is not None]
    avg_rate = sum(rates) / len(rates) if rates else None
    danger_count = sum(1 for c in calcs if c.status == "danger")
    ing_count = db.query(Ingredient).filter(Ingredient.store_id == store.id).count()
    fl = (avg_rate + float(store.labor_cost_rate)) if avg_rate and store.labor_cost_rate else None
    return KpiResponse(
        total_recipes=len(recipes),
        avg_cost_rate=round(avg_rate, 4) if avg_rate else None,
        danger_count=danger_count,
        total_ingredients=ing_count,
        fl_ratio=round(fl, 4) if fl else None,
    )

@router.get("/cost-ranking", response_model=List[CostRankItem])
def cost_ranking(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    recipes = (
        db.query(Recipe)
        .options(joinedload(Recipe.recipe_ingredients).joinedload(RecipeIngredient.ingredient))
        .filter(Recipe.store_id == store.id, Recipe.is_active == True)
        .all()
    )
    result = []
    for r in recipes:
        c = calculate_recipe_cost(r, store)
        result.append(CostRankItem(
            recipe_id=r.id, recipe_name=r.name, category=r.category,
            cost_per_serving=c.cost_per_serving,
            selling_price=float(r.selling_price) if r.selling_price else None,
            cost_rate=c.effective_cost_rate,
            status=c.status,
        ))
    result.sort(key=lambda x: x.cost_rate or 0, reverse=True)
    return result

@router.get("/category-breakdown", response_model=List[CategoryBreakdown])
def category_breakdown(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    recipes = (
        db.query(Recipe)
        .options(joinedload(Recipe.recipe_ingredients).joinedload(RecipeIngredient.ingredient))
        .filter(Recipe.store_id == store.id, Recipe.is_active == True)
        .all()
    )
    cats: dict = {}
    for r in recipes:
        cat = r.category or "未分類"
        c = calculate_recipe_cost(r, store)
        if cat not in cats:
            cats[cat] = {"count": 0, "rates": []}
        cats[cat]["count"] += 1
        if c.effective_cost_rate:
            cats[cat]["rates"].append(c.effective_cost_rate)
    return [
        CategoryBreakdown(
            category=cat,
            recipe_count=v["count"],
            avg_cost_rate=round(sum(v["rates"]) / len(v["rates"]), 4) if v["rates"] else None,
        )
        for cat, v in cats.items()
    ]
