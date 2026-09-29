from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from db import get_db
from auth import get_current_user, AuthUser
from models import Vendor
import uuid

router = APIRouter(prefix="/api/vendors", tags=["Vendors"])

class VendorUpdate(BaseModel):
    legal_name: str
    trade_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    udyam_number: Optional[str] = None
    category: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

@router.get("/count")
def count_vendors(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Depending on auth, might want to restrict this to officers
    count = db.query(Vendor).count()
    return {"count": count}

@router.get("/me")
def get_my_vendor(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vendor = db.query(Vendor).filter(Vendor.owner_id == user.user_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
        
    return vendor

@router.put("/me")
def update_my_vendor(
    body: VendorUpdate,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vendor = db.query(Vendor).filter(Vendor.owner_id == user.user_id).first()
    if not vendor:
        # Create it if it doesn't exist
        vendor = Vendor(
            id=str(uuid.uuid4()),
            owner_id=user.user_id,
            legal_name=body.legal_name,
        )
        db.add(vendor)
        
    # Update fields
    for field, value in body.dict(exclude_unset=True).items():
        setattr(vendor, field, value)
        
    db.commit()
    db.refresh(vendor)
    return vendor
