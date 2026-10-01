from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from db import get_db
from models import Tender, TenderDocument, SavedTender
from auth import get_current_user, require_roles, AuthUser
from pydantic import BaseModel
import uuid
import os
import shutil

router = APIRouter(prefix="/api/tenders", tags=["Tenders"])

from datetime import datetime, timedelta, timezone

@router.get("/")
def list_tenders(
    status: Optional[str] = None,
    category: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    location: Optional[str] = None,
    tender_type: Optional[str] = None,
    closeBy: Optional[str] = None,
    min_val: Optional[float] = None,
    max_val: Optional[float] = None,
    tab: Optional[str] = None,
    sort: Optional[str] = None,
    vendorCategory: Optional[str] = None,
    savedIds: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    query = db.query(Tender)
    
    if status:
        query = query.filter(Tender.status == status)
    if category:
        query = query.filter(Tender.category == category)
    if department:
        query = query.filter(Tender.department == department) # wait, previously used department_id
    if location:
        query = query.filter(Tender.location == location)
    if tender_type:
        query = query.filter(Tender.details["tender_type"].astext == tender_type)
        
    if closeBy:
        query = query.filter(Tender.closing_at <= datetime.fromisoformat(closeBy + "T23:59:59"))
    if min_val is not None:
        query = query.filter(Tender.estimated_value >= min_val)
    if max_val is not None:
        query = query.filter(Tender.estimated_value <= max_val)
        
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Tender.title.ilike(search_pattern),
                Tender.reference_no.ilike(search_pattern),
                Tender.department.ilike(search_pattern),
                Tender.description.ilike(search_pattern)
            )
        )
        
    if tab == "closing":
        now = datetime.now(timezone.utc)
        query = query.filter(Tender.closing_at >= now, Tender.closing_at <= now + timedelta(days=7))
    elif tab == "saved":
        s_ids = savedIds.split(",") if savedIds else ["00000000-0000-0000-0000-000000000000"]
        query = query.filter(Tender.id.in_(s_ids))
    elif tab == "recommended":
        if vendorCategory:
            query = query.filter(Tender.category.ilike(f"%{vendorCategory}%"))
        else:
            return [] # Returns empty list directly if no category provided

    if sort == "newest":
        query = query.order_by(Tender.published_at.desc())
    elif sort == "value":
        query = query.order_by(Tender.estimated_value.desc().nullslast())
    else:
        query = query.order_by(Tender.closing_at.asc().nullslast())

    tenders = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": t.id,
            "department_id": t.department_id,
            "department": t.department,
            "title": t.title,
            "reference_no": t.reference_no,
            "description": t.description,
            "category": t.category,
            "location": t.location,
            "estimated_value": t.estimated_value,
            "emd_amount": t.emd_amount,
            "eligibility": t.eligibility,
            "details": t.details,
            "status": t.status,
            "closing_at": t.closing_at.isoformat() if t.closing_at else None,
            "published_at": t.published_at.isoformat() if t.published_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "tender_documents": [{"count": 0}]
        }
        for t in tenders
    ]

@router.get("/saved")
def get_saved_tenders(user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    saved = db.query(SavedTender).filter(SavedTender.user_id == user.user_id).all()
    return [{"tender_id": s.tender_id} for s in saved]

@router.post("/saved/{tender_id}")
def save_tender(tender_id: str, user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(SavedTender).filter(SavedTender.user_id == user.user_id, SavedTender.tender_id == tender_id).first()
    if existing:
        return {"message": "Already saved"}
    st = SavedTender(user_id=user.user_id, tender_id=tender_id)
    db.add(st)
    db.commit()
    return {"message": "Tender saved"}

@router.delete("/saved/{tender_id}")
def unsave_tender(tender_id: str, user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(SavedTender).filter(SavedTender.user_id == user.user_id, SavedTender.tender_id == tender_id).first()
    if existing:
        db.delete(existing)
        db.commit()
    return {"message": "Removed from saved"}

@router.get("/facets")
def get_tender_facets(db: Session = Depends(get_db)):
    tenders = db.query(Tender).filter(Tender.status == "published").all()
    categories = sorted(list(set(t.category for t in tenders if t.category)))
    departments = sorted(list(set(t.department for t in tenders if t.department)))
    locations = sorted(list(set(t.location for t in tenders if t.location)))
    types = sorted(list(set(t.details.get("tender_type") for t in tenders if t.details and t.details.get("tender_type"))))
    
    return {
        "categories": categories,
        "departments": departments,
        "locations": locations,
        "types": types
    }

@router.get("/{tender_id}")
def get_tender(tender_id: str, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    return {
        "id": tender.id,
        "department_id": tender.department_id,
        "department": tender.department,
        "title": tender.title,
        "reference_no": tender.reference_no,
        "description": tender.description,
        "category": tender.category,
        "location": tender.location,
        "estimated_value": tender.estimated_value,
        "emd_amount": tender.emd_amount,
        "eligibility": tender.eligibility,
        "details": tender.details,
        "status": tender.status,
        "closing_at": tender.closing_at.isoformat() if tender.closing_at else None,
        "published_at": tender.published_at.isoformat() if tender.published_at else None,
        "created_at": tender.created_at.isoformat() if tender.created_at else None,
        "tender_documents": [{"count": 0}]
    }

@router.get("/{tender_id}/documents")
def get_tender_documents(tender_id: str, db: Session = Depends(get_db)):
    docs = db.query(TenderDocument).filter(TenderDocument.tender_id == tender_id).order_by(TenderDocument.created_at.asc()).all()
    return [
        {
            "id": d.id,
            "tender_id": d.tender_id,
            "name": d.name,
            "file_path": d.file_path,
            "mime_type": d.mime_type,
            "size_bytes": d.size_bytes,
            "sha256": d.sha256,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


class TenderUpdateStatus(BaseModel):
    status: str

@router.put("/{tender_id}/status")
def update_tender_status(
    tender_id: str,
    body: TenderUpdateStatus,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    tender.status = body.status
    if body.status == "published":
        tender.published_at = datetime.now(timezone.utc)
        
    db.commit()
    return {"message": "Status updated"}

class TenderCreateUpdate(BaseModel):
    title: str
    reference_no: Optional[str] = None
    department: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    closing_at: Optional[str] = None
    estimated_value: Optional[float] = None
    emd_amount: Optional[float] = None
    eligibility: Optional[str] = None
    location: Optional[str] = None
    details: Optional[dict] = None
    status: Optional[str] = "draft"
    
@router.post("/")
def create_tender(
    body: TenderCreateUpdate,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    tender_id = str(uuid.uuid4())
    tender = Tender(
        id=tender_id,
        title=body.title,
        reference_no=body.reference_no,
        department=body.department,
        category=body.category,
        description=body.description,
        estimated_value=body.estimated_value,
        emd_amount=body.emd_amount,
        eligibility=body.eligibility,
        location=body.location,
        details=body.details,
        status=body.status,
    )
    if body.closing_at:
        tender.closing_at = datetime.fromisoformat(body.closing_at.replace("Z", "+00:00"))
    if body.status == "published":
        tender.published_at = datetime.now(timezone.utc)
        
    db.add(tender)
    db.commit()
    return {"id": tender.id, "message": "Tender created"}

@router.put("/{tender_id}")
def update_tender(
    tender_id: str,
    body: TenderCreateUpdate,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    tender.title = body.title
    tender.reference_no = body.reference_no
    tender.department = body.department
    tender.category = body.category
    tender.description = body.description
    tender.estimated_value = body.estimated_value
    tender.emd_amount = body.emd_amount
    tender.eligibility = body.eligibility
    tender.location = body.location
    tender.details = body.details
    tender.status = body.status
    
    if body.closing_at:
        tender.closing_at = datetime.fromisoformat(body.closing_at.replace("Z", "+00:00"))
    if body.status == "published" and not tender.published_at:
        tender.published_at = datetime.now(timezone.utc)
        
    db.commit()
    return {"message": "Tender updated"}

@router.post("/{tender_id}/documents")
async def upload_tender_document(
    tender_id: str,
    file: UploadFile = File(...),
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads", "tenders", tender_id)
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Simple safe filename
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in file.filename)
    file_path = os.path.join(uploads_dir, safe_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Relative path for storage
    stored_path = f"tenders/{tender_id}/{safe_name}"
    
    doc = TenderDocument(
        tender_id=tender_id,
        name=file.filename,
        file_path=stored_path,
        mime_type=file.content_type,
        size_bytes=file.size,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    return {
        "id": doc.id,
        "filename": doc.name,
        "message": "Document uploaded"
    }

@router.delete("/{tender_id}/documents/{doc_id}")
def delete_tender_document(
    tender_id: str,
    doc_id: int,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    doc = db.query(TenderDocument).filter(TenderDocument.id == doc_id, TenderDocument.tender_id == tender_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Try to delete the physical file
    if doc.file_path:
        file_path = os.path.join(os.path.dirname(__file__), "..", "uploads", doc.file_path)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
                
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}

