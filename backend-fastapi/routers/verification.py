"""
verification.py — Compliance Verification Router for GeMShield.
Handles starting and fetching compliance verification runs for Bids.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from pathlib import Path

from db import get_db
from auth import get_current_user, AuthUser
from models import ComplianceJob, Bid, BidDocument, Tender, RuleResult, RAGResult, HumanReviewCase
from orchestrator import run_compliance_check

router = APIRouter(prefix="/api/verification-runs", tags=["Verification"])

class VerificationStartRequest(BaseModel):
    bid_document_id: int

def _serialize_run(j: ComplianceJob, tender: Tender = None, rule_results=None) -> dict:
    res = {
        "id": j.id,
        "file_name": j.file_name,
        "status": j.status,
        "score": j.score,
        "verdict": j.verdict,
        "officer_status": j.officer_status,
        "officer_note": j.officer_note,
        "officer_id": j.officer_id,
        "officer_decided_at": j.officer_decided_at.isoformat() if j.officer_decided_at else None,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        "vendor_user_id": j.vendor_user_id,
        "bid_id": j.bid_id,
        "tender_id": j.tender_id,
        "bid_document_id": j.bid_document_id,
        "page_count": j.page_count,
        "char_count": j.char_count,
        "error": j.processing_error,
        "ai_summary": j.ai_summary,
        "ai_confidence": j.ai_confidence,
        "ai_recommendations": j.ai_recommendations or [],
    }
    if tender:
        res["tender"] = {
            "id": tender.id,
            "title": tender.title,
            "reference_no": tender.reference_no,
            "category": tender.category,
        }
    if rule_results is not None:
        # Match frontend's expected shape: { passed, severity } for quick counts
        res["compliance_results"] = [
            {"passed": r.passed, "severity": r.severity}
            for r in rule_results
        ]
    return res

@router.post("")
def start_verification(
    req: VerificationStartRequest,
    background_tasks: BackgroundTasks,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a compliance verification run for a specific bid document."""
    doc = db.query(BidDocument).filter(BidDocument.id == req.bid_document_id).first()
    if not doc:
        raise HTTPException(404, "Bid document not found")
        
    bid = db.query(Bid).filter(Bid.id == doc.bid_id).first()
    if not bid:
        raise HTTPException(404, "Bid not found")

    # Authorization: vendor must own the bid, OR caller must be an officer
    roles = [r.role for r in user.roles] if hasattr(user, "roles") else []
    is_officer = "admin" in roles or "procurement_officer" in roles
    
    if bid.vendor_user_id != user.user_id:
        from models import UserRole
        user_roles = [r[0] for r in db.query(UserRole.role).filter(UserRole.user_id == user.user_id).all()]
        if "admin" not in user_roles and "procurement_officer" not in user_roles:
            raise HTTPException(403, "Not authorized to verify this bid")

    if not doc.file_path:
        raise HTTPException(400, "Document has no associated file")

    uploads_dir = Path(__file__).parent.parent / "uploads"
    actual_path = uploads_dir / doc.file_path

    if not actual_path.exists():
        raise HTTPException(404, "Physical file not found on server")

    job = ComplianceJob(
        vendor_user_id=bid.vendor_user_id,
        bid_id=bid.id,
        tender_id=bid.tender_id,
        bid_document_id=doc.id,
        file_name=doc.name,
        stored_path=str(actual_path),
        status="queued",
        officer_status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(run_compliance_check, job.id, str(actual_path))

    return {"id": job.id, "status": "queued", "message": "Verification started"}

from fastapi import UploadFile, File, Form
import uuid

@router.post("/upload")
async def upload_and_start_verification(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    bid_id: Optional[str] = Form(None),
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a PDF and start a compliance run. Optional bid linkage."""
    tender_id = None
    if bid_id:
        bid = db.query(Bid).filter(Bid.id == bid_id).first()
        if not bid or bid.vendor_user_id != user.user_id:
            raise HTTPException(403, "Not authorized to link to this bid")
        tender_id = bid.tender_id

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(413, "File too large")
        
    uploads_dir = Path(__file__).parent.parent / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in file.filename)
    stored_name = f"manual_{uuid.uuid4().hex[:8]}_{safe_name}"
    dest_path = uploads_dir / stored_name
    
    dest_path.write_bytes(contents)
    
    job = ComplianceJob(
        vendor_user_id=user.user_id,
        bid_id=bid_id,
        tender_id=tender_id,
        file_name=file.filename,
        stored_path=str(dest_path),
        status="queued",
        officer_status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(run_compliance_check, job.id, str(dest_path))

    return {"id": job.id, "status": "queued"}

@router.get("")
def list_verification_runs(
    vendor_user_id: Optional[str] = None,
    bid_id: Optional[str] = None,
    limit: int = 500,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List verification runs. Vendors only see theirs; Officers see all."""
    from models import UserRole
    user_roles = [r[0] for r in db.query(UserRole.role).filter(UserRole.user_id == user.user_id).all()]
    is_officer = "admin" in user_roles or "procurement_officer" in user_roles
    
    query = db.query(ComplianceJob)

    if not is_officer:
        # Vendor can only see their own
        if vendor_user_id and vendor_user_id != user.user_id:
            raise HTTPException(403, "Cannot view another vendor's runs")
        query = query.filter(ComplianceJob.vendor_user_id == user.user_id)
    else:
        # Officer can filter by vendor
        if vendor_user_id:
            query = query.filter(ComplianceJob.vendor_user_id == vendor_user_id)

    if bid_id:
        query = query.filter(ComplianceJob.bid_id == bid_id)

    jobs = query.order_by(ComplianceJob.created_at.desc()).limit(limit).all()

    out = []
    for j in jobs:
        tender = db.query(Tender).filter(Tender.id == j.tender_id).first() if j.tender_id else None
        rule_results = db.query(RuleResult).filter(RuleResult.job_id == j.id).all()
        out.append(_serialize_run(j, tender, rule_results))

    return out

@router.get("/{run_id}")
def get_verification_run(
    run_id: int,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single verification run with full results."""
    j = db.query(ComplianceJob).filter(ComplianceJob.id == run_id).first()
    if not j:
        raise HTTPException(404, "Run not found")

    from models import UserRole
    user_roles = [r[0] for r in db.query(UserRole.role).filter(UserRole.user_id == user.user_id).all()]
    is_officer = "admin" in user_roles or "procurement_officer" in user_roles

    if not is_officer and j.vendor_user_id != user.user_id:
        raise HTTPException(403, "Not authorized to view this run")

    tender = db.query(Tender).filter(Tender.id == j.tender_id).first() if j.tender_id else None
    
    # Also include the bid details that the frontend needs for full context
    bid = db.query(Bid).filter(Bid.id == j.bid_id).first() if j.bid_id else None
    
    rule_results = db.query(RuleResult).filter(RuleResult.job_id == j.id).all()
    rag_results = db.query(RAGResult).filter(RAGResult.job_id == j.id).all()

    base = _serialize_run(j, tender, rule_results)
    
    # Attach full rule results
    base["rule_results"] = [
        {
            "id": r.id,
            "rule_code": r.rule_code,
            "rule_name": r.rule_name,
            "passed": r.passed,
            "severity": r.severity,
            "status": "compliant" if r.passed else ("missing" if not r.found_value else ("non_compliant" if r.severity == "critical" else "needs_attention")),
            "found_value": r.found_value,
            "expected": r.expected_value,
            "evidence_text": r.evidence_text,
            "evidence_page": r.evidence_page,
            "suggestion": r.suggestion,
        } for r in rule_results
    ]
    
    base["rag_results"] = [
        {
            "id": r.id,
            "rule_content": r.rule_content,
            "verdict": r.verdict,
            "confidence": r.confidence,
            "reason": r.reason,
            "distance": r.distance,
        } for r in rag_results
    ]

    if bid:
        base["bid"] = {
            "id": bid.id,
            "status": bid.status,
            "submitted_at": bid.submitted_at.isoformat() if bid.submitted_at else None
        }

    return base

@router.post("/bulk-refer")
def bulk_refer_to_officer(
    run_ids: list[int],
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refer multiple compliance runs to Human Review."""
    from models import UserRole
    user_roles = [r[0] for r in db.query(UserRole.role).filter(UserRole.user_id == user.user_id).all()]
    if "admin" not in user_roles and "procurement_officer" not in user_roles:
        raise HTTPException(403, "Only officers can refer runs")

    now = datetime.now(timezone.utc)
    jobs = db.query(ComplianceJob).filter(ComplianceJob.id.in_(run_ids)).all()
    for j in jobs:
        j.officer_status = "needs_review"
        j.officer_note = "Bulk referral from compliance queue"
        j.officer_id = user.user_id
        j.officer_decided_at = now
        
        # Create Human Review Case
        case = HumanReviewCase(
            id=str(uuid.uuid4()),
            run_id=j.id,
            bid_id=j.bid_id,
            tender_id=j.tender_id,
            vendor_user_id=j.vendor_user_id,
            status="pending",
            priority="medium",
            trigger_reason="Manually referred from compliance queue",
        )
        db.add(case)
        
    db.commit()
    return {"message": "Selected checks referred to Human Review"}

@router.post("/{run_id}/insights")
def generate_insights(
    run_id: int,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dynamically generate AI Insights if missing."""
    import document_processor
    from gemini_compliance import analyze_compliance, ComplianceAnalysisRequest
    import asyncio
    
    j = db.query(ComplianceJob).filter(ComplianceJob.id == run_id).first()
    if not j:
        raise HTTPException(404, "Run not found")
        
    if j.ai_summary:
        return {"message": "Insights already exist"}
        
    try:
        extraction = document_processor.extract(j.stored_path)
        full_text = extraction.get("full_text", "")
        if len(full_text) > 99000:
            full_text = full_text[:99000]
        
        req = ComplianceAnalysisRequest(
            document_text=full_text,
            ambiguous_rules=[],
            tech_requirements=[]
        )
        
        # We need an event loop to run the async analyze_compliance
        loop = asyncio.new_event_loop()
        res = loop.run_until_complete(analyze_compliance(req, user=user))
        
        j.ai_summary = res.get("summary", "No summary available")
        j.ai_confidence = res.get("confidence", 0.0)
        j.ai_recommendations = res.get("recommendations", [])
        db.commit()
        return {"message": "Insights generated successfully"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Failed to generate insights: {e}")

@router.post("/{run_id}/refer")
def refer_to_officer(
    run_id: int,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refer a single compliance run to Human Review."""
    from models import UserRole
    user_roles = [r[0] for r in db.query(UserRole.role).filter(UserRole.user_id == user.user_id).all()]
    if "admin" not in user_roles and "procurement_officer" not in user_roles:
        raise HTTPException(403, "Only officers can refer runs")

    j = db.query(ComplianceJob).filter(ComplianceJob.id == run_id).first()
    if not j:
        raise HTTPException(404, "Run not found")
        
    j.officer_status = "needs_review"
    j.officer_note = "Referred from compliance evidence review"
    j.officer_id = user.user_id
    j.officer_decided_at = datetime.now(timezone.utc)
    
    case = HumanReviewCase(
        id=str(uuid.uuid4()),
        run_id=j.id,
        bid_id=j.bid_id,
        tender_id=j.tender_id,
        vendor_user_id=j.vendor_user_id,
        status="pending",
        priority="medium",
        trigger_reason="Manually referred from compliance evidence review",
    )
    db.add(case)
    
    db.commit()
    return {"message": "Run referred to Human Review"}
