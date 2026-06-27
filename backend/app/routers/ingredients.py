from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.store import Store
from app.models.ingredient import Ingredient
from app.models.price_history import PriceHistory
from app.models.recipe import RecipeIngredient
from app.schemas.ingredient import IngredientCreate, IngredientUpdate, IngredientResponse, PriceHistoryResponse
from app.routers.deps import get_current_store
import uuid

router = APIRouter(prefix="/api/ingredients", tags=["ingredients"])

def _to_response(ing: Ingredient, db: Session) -> IngredientResponse:
    count = db.query(RecipeIngredient).filter(RecipeIngredient.ingredient_id == ing.id).count()
    return IngredientResponse(
        id=ing.id, name=ing.name, unit=ing.unit,
        unit_price=float(ing.unit_price), category=ing.category,
        supplier_id=ing.supplier_id, note=ing.note,
        created_at=ing.created_at, updated_at=ing.updated_at,
        recipe_count=count,
    )

@router.get("", response_model=List[IngredientResponse])
def list_ingredients(
    category: Optional[str] = None,
    q: Optional[str] = None,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    query = db.query(Ingredient).filter(Ingredient.store_id == store.id)
    if category:
        query = query.filter(Ingredient.category == category)
    if q:
        query = query.filter(Ingredient.name.ilike(f"%{q}%"))
    ings = query.order_by(Ingredient.name).all()
    return [_to_response(i, db) for i in ings]

@router.post("", response_model=IngredientResponse)
def create_ingredient(payload: IngredientCreate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    ing = Ingredient(store_id=store.id, **payload.model_dump())
    db.add(ing)
    db.flush()
    db.add(PriceHistory(ingredient_id=ing.id, unit_price=ing.unit_price))
    db.commit()
    db.refresh(ing)
    return _to_response(ing, db)

@router.get("/{ingredient_id}", response_model=IngredientResponse)
def get_ingredient(ingredient_id: uuid.UUID, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id, Ingredient.store_id == store.id).first()
    if not ing:
        raise HTTPException(404, "Ingredient not found")
    return _to_response(ing, db)

@router.put("/{ingredient_id}", response_model=IngredientResponse)
def update_ingredient(ingredient_id: uuid.UUID, payload: IngredientUpdate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id, Ingredient.store_id == store.id).first()
    if not ing:
        raise HTTPException(404, "Ingredient not found")
    old_price = float(ing.unit_price)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(ing, k, v)
    if payload.unit_price is not None and payload.unit_price != old_price:
        db.add(PriceHistory(ingredient_id=ing.id, unit_price=payload.unit_price))
    db.commit()
    db.refresh(ing)
    return _to_response(ing, db)

@router.delete("/{ingredient_id}")
def delete_ingredient(ingredient_id: uuid.UUID, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id, Ingredient.store_id == store.id).first()
    if not ing:
        raise HTTPException(404, "Ingredient not found")
    count = db.query(RecipeIngredient).filter(RecipeIngredient.ingredient_id == ing.id).count()
    if count > 0:
        raise HTTPException(400, f"この食材は{count}件のレシピで使用中です")
    db.delete(ing)
    db.commit()
    return {"ok": True}

@router.get("/{ingredient_id}/price-history", response_model=List[PriceHistoryResponse])
def price_history(ingredient_id: uuid.UUID, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id, Ingredient.store_id == store.id).first()
    if not ing:
        raise HTTPException(404, "Ingredient not found")
    return db.query(PriceHistory).filter(PriceHistory.ingredient_id == ingredient_id).order_by(PriceHistory.recorded_at).all()
