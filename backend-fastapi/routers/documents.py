"""
documents.py — PDF document serving router.

Serves uploaded PDFs for the frontend document viewer.
Also provides document metadata and download endpoints.
"""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from db import get_db
from auth import get_current_user, AuthUser
from models import ComplianceJob, BidDocument

log = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("/compliance-job/{job_id}/pdf", summary="Download/view compliance job PDF")
def get_compliance_pdf(
    job_id: int,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serve the original uploaded PDF for a compliance job."""
    job = db.query(ComplianceJob).filter(ComplianceJob.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.stored_path:
        raise HTTPException(404, "PDF file not available")

    pdf_path = Path(job.stored_path)
    if not pdf_path.exists():
        raise HTTPException(404, "PDF file no longer exists on disk")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=job.file_name,
        headers={"Content-Disposition": f'inline; filename="{job.file_name}"'},
    )


@router.get("/bid/{bid_id}/files", summary="List bid documents")
def list_bid_documents(
    bid_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    docs = db.query(BidDocument).filter(BidDocument.bid_id == bid_id).all()
    return {
        "documents": [
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
        ],
    }

@router.get("/all", summary="List all submitted bid documents")
def list_all_bid_documents(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all documents attached to submitted bids."""
    from models import Bid, Tender
    docs = db.query(BidDocument).join(Bid).join(Tender).filter(Bid.status != "draft").order_by(BidDocument.created_at.desc()).all()
    
    result = []
    for d in docs:
        bid = db.query(Bid).filter(Bid.id == d.bid_id).first()
        tender = db.query(Tender).filter(Tender.id == bid.tender_id).first()
        result.append({
            "id": d.id,
            "name": d.name,
            "file_path": d.file_path,
            "sha256": d.sha256,
            "size_bytes": d.size_bytes,
            "mime_type": d.mime_type,
            "bid": {
                "id": bid.id,
                "status": bid.status,
                "vendor_user_id": bid.vendor_user_id,
                "tender_id": bid.tender_id,
                "tender": {
                    "reference_no": tender.reference_no,
                    "title": tender.title,
                }
            }
        })
    return result


@router.get("/bid-file/{doc_id}/stream", summary="Stream/download a bid document")
def stream_bid_document(
    doc_id: int,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serve a bid document file for viewing/download."""
    doc = db.query(BidDocument).filter(BidDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if not doc.file_path:
        raise HTTPException(404, "File not available")

    file_path = UPLOAD_DIR / doc.file_path
    if not file_path.exists():
        raise HTTPException(404, "File no longer exists on disk")

    return FileResponse(
        path=str(file_path),
        media_type=doc.mime_type or "application/octet-stream",
        filename=doc.name,
        headers={"Content-Disposition": f'inline; filename="{doc.name}"'},
    )
