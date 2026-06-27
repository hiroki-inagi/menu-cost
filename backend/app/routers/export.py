import csv, io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.store import Store
from app.models.ingredient import Ingredient
from app.models.recipe import Recipe, RecipeIngredient
from app.services.cost_calculator import calculate_recipe_cost
from app.routers.deps import get_current_store

router = APIRouter(prefix="/api/export", tags=["export"])

@router.get("/ingredients.csv")
def export_ingredients(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    ings = db.query(Ingredient).filter(Ingredient.store_id == store.id).order_by(Ingredient.name).all()
    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(["食材名", "カテゴリ", "単位", "単価(円)", "備考"])
    for i in ings:
        w.writerow([i.name, i.category or "", i.unit, float(i.unit_price), i.note or ""])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ingredients.csv"})

@router.get("/recipes.csv")
def export_recipes(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    recipes = (
        db.query(Recipe)
        .options(joinedload(Recipe.recipe_ingredients).joinedload(RecipeIngredient.ingredient))
        .filter(Recipe.store_id == store.id)
        .all()
    )
    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(["料理名", "カテゴリ", "1人前食材費(円)", "現行売価(円)", "原価率(%)", "推奨売価/税抜(円)", "ステータス"])
    for r in recipes:
        c = calculate_recipe_cost(r, store)
        w.writerow([
            r.name, r.category or "",
            c.cost_per_serving,
            float(r.selling_price) if r.selling_price else "",
            round(c.effective_cost_rate * 100, 1) if c.effective_cost_rate else "",
            c.recommended_price_ex_tax or "",
            c.status,
        ])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=recipes.csv"})
