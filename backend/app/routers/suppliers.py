from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.store import Store
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.routers.deps import get_current_user, get_current_store
import uuid

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])

@router.get("", response_model=List[SupplierResponse])
def list_suppliers(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    return db.query(Supplier).filter(Supplier.store_id == store.id).all()

@router.post("", response_model=SupplierResponse)
def create_supplier(payload: SupplierCreate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    sup = Supplier(store_id=store.id, **payload.model_dump())
    db.add(sup)
    db.commit()
    db.refresh(sup)
    return sup

@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: uuid.UUID, payload: SupplierUpdate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    sup = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.store_id == store.id).first()
    if not sup:
        raise HTTPException(404, "Supplier not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(sup, k, v)
    db.commit()
    db.refresh(sup)
    return sup

@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: uuid.UUID, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    sup = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.store_id == store.id).first()
    if not sup:
        raise HTTPException(404, "Supplier not found")
    db.delete(sup)
    db.commit()
    return {"ok": True}
