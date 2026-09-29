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
        filename=job.filename,
        headers={"Content-Disposition": f'inline; filename="{job.filename}"'},
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
                "filename": d.filename,
                "sha256": d.sha256,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in docs
        ],
    }
