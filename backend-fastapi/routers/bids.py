from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from db import get_db
from models import Bid, BidDocument

router = APIRouter(prefix="/api/bids", tags=["Bids"])

@router.get("/")
def list_bids(
    vendor_id: Optional[str] = None,
    tender_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    from models import Tender
    query = db.query(Bid, Tender).outerjoin(Tender, Bid.tender_id == Tender.id)
    
    if vendor_id:
        query = query.filter(Bid.vendor_id == vendor_id)
    if tender_id:
        query = query.filter(Bid.tender_id == tender_id)
    if status:
        query = query.filter(Bid.status == status)
        
    results = query.order_by(Bid.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": b.id,
            "tender_id": b.tender_id,
            "vendor_user_id": b.vendor_id, # Frontend expects vendor_user_id
            "status": b.status,
            "submitted_at": b.submitted_at.isoformat() if b.submitted_at else None,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "updated_at": b.created_at.isoformat() if b.created_at else None, # Mock updated_at
            "tender": {
                "id": t.id if t else None,
                "title": t.title if t else None,
                "reference_no": t.reference_no if t else None,
                "department": t.department if t else None,
                "closing_at": t.closing_at.isoformat() if t and t.closing_at else None,
            } if t else None
        }
        for b, t in results
    ]

@router.get("/{bid_id}")
def get_bid(bid_id: str, db: Session = Depends(get_db)):
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
        
    return {
        "id": bid.id,
        "tender_id": bid.tender_id,
        "vendor_id": bid.vendor_id,
        "status": bid.status,
        "submitted_at": bid.submitted_at.isoformat() if bid.submitted_at else None,
        "created_at": bid.created_at.isoformat() if bid.created_at else None,
    }
