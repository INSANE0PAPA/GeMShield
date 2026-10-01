"""
bids.py — Bid/Application CRUD router for GeMShield.

All endpoints are auth-protected and owner-scoped: a vendor can only
access their own bids.  Officers can list all bids via role check.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
import os
import shutil

from db import get_db
from auth import get_current_user, AuthUser
from models import Bid, BidDocument, Tender

router = APIRouter(prefix="/api/bids", tags=["Bids"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "bids")


# ── Pydantic schemas ────────────────────────────────────────────────────────────

class BidCreateUpdate(BaseModel):
    application: Optional[dict] = None
    quoted_amount: Optional[float] = None
    notes: Optional[str] = None
    stage: Optional[str] = "basic"


class BidSubmit(BaseModel):
    pass  # No body needed; marks bid as submitted


# ── Helpers ──────────────────────────────────────────────────────────────────────

def _bid_dict(b: Bid, tender: Optional[Tender] = None, docs: list = None):
    """Serialize a Bid to the shape the frontend expects."""
    result = {
        "id": b.id,
        "tender_id": b.tender_id,
        "vendor_user_id": b.vendor_user_id,
        "vendor_id": b.vendor_id,
        "status": b.status,
        "application": b.application,
        "quoted_amount": b.quoted_amount,
        "notes": b.notes,
        "stage": b.stage or "basic",
        "submitted_at": b.submitted_at.isoformat() if b.submitted_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }
    if tender is not None:
        result["tender"] = {
            "id": tender.id,
            "title": tender.title,
            "reference_no": tender.reference_no,
            "department": tender.department,
            "closing_at": tender.closing_at.isoformat() if tender.closing_at else None,
        }
    if docs is not None:
        result["bid_documents"] = [
            {
                "id": d.id,
                "doc_type": d.doc_type,
                "name": d.name,
                "file_path": d.file_path,
                "mime_type": d.mime_type,
                "size_bytes": d.size_bytes,
                "sha256": d.sha256,
            }
            for d in docs
        ]
    return result


# ── List my bids ─────────────────────────────────────────────────────────────────

@router.get("/")
def list_bids(
    vendor_id: Optional[str] = None,
    tender_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List bids.  If vendor_id is the caller's own UID, returns their bids.
    The caller must be authenticated; results are scoped to their own bids
    unless they pass no vendor_id (for officer use later).
    """
    query = db.query(Bid).outerjoin(Tender, Bid.tender_id == Tender.id)

    from models import UserRole
    is_privileged = db.query(UserRole).filter(UserRole.user_id == user.user_id, UserRole.role.in_(["procurement_officer", "admin", "reviewer"])).first() is not None

    # Owner-scope: if a vendor_id is supplied, verify it matches the caller
    if vendor_id:
        if vendor_id != user.user_id and not is_privileged:
            raise HTTPException(403, "Cannot list another vendor's bids")
        query = query.filter(Bid.vendor_user_id == vendor_id)
    elif not is_privileged:
        # Default: return only the caller's own bids
        query = query.filter(Bid.vendor_user_id == user.user_id)

    if tender_id:
        query = query.filter(Bid.tender_id == tender_id)
    if status:
        query = query.filter(Bid.status == status)

    results = query.order_by(Bid.created_at.desc()).offset(skip).limit(limit).all()

    # Now fetch tenders for each bid
    output = []
    for bid in results:
        tender = db.query(Tender).filter(Tender.id == bid.tender_id).first()
        output.append(_bid_dict(bid, tender=tender))

    return output


# ── Get or create application for a tender ───────────────────────────────────────

@router.get("/by-tender/{tender_id}")
def get_bid_by_tender(
    tender_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the caller's bid/application for a specific tender (or null)."""
    bid = (
        db.query(Bid)
        .filter(Bid.tender_id == tender_id, Bid.vendor_user_id == user.user_id)
        .first()
    )
    if not bid:
        return None
    docs = db.query(BidDocument).filter(BidDocument.bid_id == bid.id).all()
    return _bid_dict(bid, docs=docs)


@router.post("/for-tender/{tender_id}")
def create_or_update_bid(
    tender_id: str,
    body: BidCreateUpdate,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new bid for a tender, or update an existing draft."""
    # Verify tender exists
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(404, "Tender not found")

    # Check for existing bid
    bid = (
        db.query(Bid)
        .filter(Bid.tender_id == tender_id, Bid.vendor_user_id == user.user_id)
        .first()
    )

    if bid:
        # Submission lock: cannot edit a submitted bid
        if bid.status != "draft":
            raise HTTPException(
                403, "This bid has been submitted and is locked. Editing is not allowed."
            )
        # Update existing draft
        if body.application is not None:
            bid.application = body.application
        if body.quoted_amount is not None:
            bid.quoted_amount = body.quoted_amount
        if body.notes is not None:
            bid.notes = body.notes
        if body.stage is not None:
            bid.stage = body.stage
        bid.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(bid)
    else:
        # Create new bid
        bid = Bid(
            id=str(uuid.uuid4()),
            tender_id=tender_id,
            vendor_user_id=user.user_id,
            status="draft",
            application=body.application,
            quoted_amount=body.quoted_amount,
            notes=body.notes,
            stage=body.stage or "basic",
        )
        db.add(bid)
        db.commit()
        db.refresh(bid)

    docs = db.query(BidDocument).filter(BidDocument.bid_id == bid.id).all()
    return _bid_dict(bid, docs=docs)


# ── Submit bid ───────────────────────────────────────────────────────────────────

@router.post("/{bid_id}/submit")
def submit_bid(
    bid_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a draft bid as submitted and lock it."""
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if not bid:
        raise HTTPException(404, "Bid not found")
    if bid.vendor_user_id != user.user_id:
        raise HTTPException(403, "Not your bid")
    if bid.status != "draft":
        raise HTTPException(403, "Bid already submitted")

    bid.status = "submitted"
    bid.submitted_at = datetime.now(timezone.utc)
    bid.updated_at = datetime.now(timezone.utc)
    
    from models import AuditLog, Notification
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user.user_id,
        actor_email=user.email,
        actor_role=user.role,
        action="submit_bid",
        entity_type="Bid",
        entity_id=bid.id,
        summary=f"Submitted bid for tender {bid.tender_id}",
    )
    db.add(audit)
    
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=user.user_id,
        title="Bid Submitted",
        body=f"Your bid for tender '{bid.tender_id}' has been submitted successfully.",
        category="system",
        severity="success",
        link="/vendor/bids"
    )
    db.add(notif)
    db.commit()
    return {"id": bid.id, "status": "submitted", "message": "Bid submitted successfully"}


# ── Get single bid ───────────────────────────────────────────────────────────────

@router.get("/{bid_id}")
def get_bid(
    bid_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if not bid:
        raise HTTPException(404, "Bid not found")
    # Owner check
    if bid.vendor_user_id != user.user_id:
        raise HTTPException(403, "Not your bid")

    tender = db.query(Tender).filter(Tender.id == bid.tender_id).first()
    docs = db.query(BidDocument).filter(BidDocument.bid_id == bid.id).all()
    return _bid_dict(bid, tender=tender, docs=docs)


# ── Bid document upload ─────────────────────────────────────────────────────────

@router.post("/{bid_id}/documents")
async def upload_bid_document(
    bid_id: str,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document for a bid. Replaces existing doc of same doc_type."""
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if not bid:
        raise HTTPException(404, "Bid not found")
    if bid.vendor_user_id != user.user_id:
        raise HTTPException(403, "Not your bid")
    if bid.status != "draft":
        raise HTTPException(403, "Bid is submitted and locked")

    # Create upload directory
    dest_dir = os.path.join(UPLOAD_DIR, bid_id)
    os.makedirs(dest_dir, exist_ok=True)

    # Safe filename
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in file.filename)
    stored_name = f"{doc_type}-{uuid.uuid4().hex[:8]}-{safe_name}"
    file_path_on_disk = os.path.join(dest_dir, stored_name)

    contents = await file.read()

    with open(file_path_on_disk, "wb") as buffer:
        buffer.write(contents)

    # Compute SHA-256
    import hashlib
    sha = hashlib.sha256(contents).hexdigest()

    # Relative path for storage reference
    stored_path = f"bids/{bid_id}/{stored_name}"

    # Remove old doc of same type
    old = (
        db.query(BidDocument)
        .filter(BidDocument.bid_id == bid_id, BidDocument.doc_type == doc_type)
        .first()
    )
    if old:
        # Try remove old file
        old_full = os.path.join(os.path.dirname(__file__), "..", "uploads", old.file_path or "")
        if os.path.exists(old_full):
            try:
                os.remove(old_full)
            except Exception:
                pass
        db.delete(old)

    doc = BidDocument(
        bid_id=bid_id,
        doc_type=doc_type,
        name=file.filename,
        filename=file.filename,
        file_path=stored_path,
        stored_path=stored_path,
        mime_type=file.content_type,
        size_bytes=len(contents),
        sha256=sha,
    )
    db.add(doc)
    bid.updated_at = datetime.now(timezone.utc)
    db.flush()
    
    from models import AuditLog
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user.user_id,
        actor_email=user.email,
        actor_role=user.role,
        action="upload_document",
        entity_type="BidDocument",
        entity_id=str(doc.id),
        summary=f"Uploaded {doc_type} document '{file.filename}' for bid {bid.id}",
    )
    db.add(audit)
    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "doc_type": doc.doc_type,
        "name": doc.name,
        "file_path": doc.file_path,
        "size_bytes": doc.size_bytes,
        "sha256": doc.sha256,
        "message": "Document uploaded",
    }


# ── List bid documents ───────────────────────────────────────────────────────────

@router.get("/{bid_id}/documents")
def list_bid_documents(
    bid_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if not bid:
        raise HTTPException(404, "Bid not found")
    if bid.vendor_user_id != user.user_id:
        raise HTTPException(403, "Not your bid")

    docs = db.query(BidDocument).filter(BidDocument.bid_id == bid_id).all()
    return [
        {
            "id": d.id,
            "doc_type": d.doc_type,
            "name": d.name,
            "file_path": d.file_path,
            "mime_type": d.mime_type,
            "size_bytes": d.size_bytes,
            "sha256": d.sha256,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]
