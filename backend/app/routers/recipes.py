from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.store import Store
from app.models.ingredient import Ingredient
from app.models.recipe import Recipe, RecipeIngredient
from app.schemas.recipe import RecipeCreate, RecipeUpdate, RecipeResponse, RecipeIngredientCreate, CostCalculation
from app.services.cost_calculator import calculate_recipe_cost, build_recipe_ingredient_responses
from app.routers.deps import get_current_store
import uuid

router = APIRouter(prefix="/api/recipes", tags=["recipes"])

def _load_recipe(db: Session, recipe_id: uuid.UUID, store_id: uuid.UUID) -> Recipe:
    r = (
        db.query(Recipe)
        .options(joinedload(Recipe.recipe_ingredients).joinedload(RecipeIngredient.ingredient))
        .filter(Recipe.id == recipe_id, Recipe.store_id == store_id)
        .first()
    )
    if not r:
        raise HTTPException(404, "Recipe not found")
    return r

def _to_response(recipe: Recipe, store: Store) -> RecipeResponse:
    return RecipeResponse(
        id=recipe.id, name=recipe.name, category=recipe.category,
        target_cost_rate=float(recipe.target_cost_rate) if recipe.target_cost_rate else None,
        selling_price=float(recipe.selling_price) if recipe.selling_price else None,
        servings=recipe.servings, image_url=recipe.image_url,
        note=recipe.note, is_active=recipe.is_active,
        created_at=recipe.created_at, updated_at=recipe.updated_at,
        recipe_ingredients=build_recipe_ingredient_responses(recipe),
        calculation=calculate_recipe_cost(recipe, store),
    )

@router.get("", response_model=List[RecipeResponse])
def list_recipes(
    category: Optional[str] = None,
    active_only: bool = True,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Recipe)
        .options(joinedload(Recipe.recipe_ingredients).joinedload(RecipeIngredient.ingredient))
        .filter(Recipe.store_id == store.id)
    )
    if active_only:
        q = q.filter(Recipe.is_active == True)
    if category:
        q = q.filter(Recipe.category == category)
    return [_to_response(r, store) for r in q.order_by(Recipe.name).all()]

@router.post("", response_model=RecipeResponse)
def create_recipe(payload: RecipeCreate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    recipe = Recipe(
        store_id=store.id,
        name=payload.name, category=payload.category,
        target_cost_rate=payload.target_cost_rate,
        selling_price=payload.selling_price,
        servings=payload.servings, image_url=payload.image_url,
        note=payload.note,
    )
    db.add(recipe)
    db.flush()
    for ri in payload.ingredients:
        ing = db.query(Ingredient).filter(Ingredient.id == ri.ingredient_id, Ingredient.store_id == store.id).first()
        if not ing:
            raise HTTPException(400, f"食材 {ri.ingredient_id} が見つかりません")
        db.add(RecipeIngredient(recipe_id=recipe.id, ingredient_id=ri.ingredient_id, quantity=ri.quantity, yield_rate=ri.yield_rate))
    db.commit()
    recipe = _load_recipe(db, recipe.id, store.id)
    return _to_response(recipe, store)

@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(recipe_id: uuid.UUID, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    return _to_response(_load_recipe(db, recipe_id, store.id), store)

@router.put("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(recipe_id: uuid.UUID, payload: RecipeUpdate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    recipe = _load_recipe(db, recipe_id, store.id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(recipe, k, v)
    db.commit()
    recipe = _load_recipe(db, recipe_id, store.id)
    return _to_response(recipe, store)

@router.delete("/{recipe_id}")
def delete_recipe(recipe_id: uuid.UUID, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id, Recipe.store_id == store.id).first()
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    db.delete(recipe)
    db.commit()
    return {"ok": True}

@router.post("/{recipe_id}/ingredients", response_model=RecipeResponse)
def add_ingredient(recipe_id: uuid.UUID, payload: RecipeIngredientCreate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    recipe = _load_recipe(db, recipe_id, store.id)
    ing = db.query(Ingredient).filter(Ingredient.id == payload.ingredient_id, Ingredient.store_id == store.id).first()
    if not ing:
        raise HTTPException(400, "食材が見つかりません")
    db.add(RecipeIngredient(recipe_id=recipe.id, ingredient_id=payload.ingredient_id, quantity=payload.quantity, yield_rate=payload.yield_rate))
    db.commit()
    return _to_response(_load_recipe(db, recipe_id, store.id), store)

@router.delete("/{recipe_id}/ingredients/{ri_id}", response_model=RecipeResponse)
def remove_ingredient(recipe_id: uuid.UUID, ri_id: uuid.UUID, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    _load_recipe(db, recipe_id, store.id)
    ri = db.query(RecipeIngredient).filter(RecipeIngredient.id == ri_id, RecipeIngredient.recipe_id == recipe_id).first()
    if not ri:
        raise HTTPException(404, "Not found")
    db.delete(ri)
    db.commit()
    return _to_response(_load_recipe(db, recipe_id, store.id), store)
