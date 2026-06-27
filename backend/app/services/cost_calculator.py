import math
from typing import Optional
from sqlalchemy.orm import Session
from app.models.recipe import Recipe, RecipeIngredient
from app.models.store import Store
from app.schemas.recipe import CostCalculation, RecipeIngredientResponse

def _round_price(price: float, unit: int) -> float:
    return math.ceil(price / unit) * unit

def calculate_recipe_cost(recipe: Recipe, store: Store) -> CostCalculation:
    total_cost = 0.0
    for ri in recipe.recipe_ingredients:
        ing = ri.ingredient
        cost = float(ing.unit_price) * float(ri.quantity) / float(ri.yield_rate)
        total_cost += cost

    cost_per_serving = total_cost / recipe.servings if recipe.servings > 0 else total_cost
    target_rate = float(recipe.target_cost_rate) if recipe.target_cost_rate else float(store.default_cost_rate)
    tax_rate = float(store.tax_rate)
    rounding = int(store.rounding_unit)

    recommended_ex = _round_price(cost_per_serving / target_rate, rounding) if target_rate > 0 else None
    recommended_in = round(recommended_ex * (1 + tax_rate)) if recommended_ex else None

    effective_rate = None
    status = "warning"
    if recipe.selling_price:
        effective_rate = cost_per_serving / float(recipe.selling_price)
        if effective_rate <= 0.25:
            status = "good"
        elif effective_rate <= 0.35:
            status = "warning"
        else:
            status = "danger"

    return CostCalculation(
        total_cost=round(total_cost, 2),
        cost_per_serving=round(cost_per_serving, 2),
        effective_cost_rate=round(effective_rate, 4) if effective_rate else None,
        recommended_price_ex_tax=recommended_ex,
        recommended_price_in_tax=recommended_in,
        target_cost_rate=target_rate,
        status=status,
    )

def build_recipe_ingredient_responses(recipe: Recipe) -> list:
    result = []
    for ri in recipe.recipe_ingredients:
        ing = ri.ingredient
        cost = float(ing.unit_price) * float(ri.quantity) / float(ri.yield_rate)
        result.append(RecipeIngredientResponse(
            id=ri.id,
            ingredient_id=ing.id,
            ingredient_name=ing.name,
            unit=ing.unit,
            unit_price=float(ing.unit_price),
            quantity=float(ri.quantity),
            yield_rate=float(ri.yield_rate),
            cost=round(cost, 2),
        ))
    return result
