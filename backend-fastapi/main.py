import os
from dotenv import load_dotenv
load_dotenv()

import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone
from fastapi import (
    FastAPI, Depends, UploadFile, File,
    HTTPException, BackgroundTasks, Query,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from db import engine, get_db
from models import Base, ComplianceJob, RuleResult, RAGResult, AuditLog
from auth import get_optional_user, AuthUser
from orchestrator import run_compliance_check, build_fix_guide
from data_gov import router as data_gov_router
from helpdesk import router as helpdesk_router
from gemini_compliance import router as gemini_compliance_router
from supabase_compliance import router as supabase_compliance_router
from routers.tenders import router as tenders_router
from routers.bids import router as bids_router
from routers.profiles import router as profiles_router
from routers.audit import router as audit_router
from routers.notifications import router as notifications_router
from routers.reviews import router as reviews_router
from routers.documents import router as documents_router
from routers.vendors import router as vendors_router
from routers.verification import router as verification_router
from routers.administration import router as administration_router
from routers.reports import router as reports_router
from routers.audit import router as audit_router_mod
UPLOAD_DIR   = Path(__file__).parent / "uploads"
MAX_BYTES    = 20 * 1024 * 1024     
ALLOWED_EXTS = {".pdf"}
ALLOWED_MIME = {"application/pdf", "application/x-pdf"}
UPLOAD_DIR.mkdir(exist_ok=True)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)
app = FastAPI(
    title="GeMShield Compliance API",
    description="AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement",
    version="2.0.0",
)

# CORS — allow the frontend origin; fall back to * for development
_frontend_url = os.getenv("FRONTEND_URL", "*")
_origins = [_frontend_url] if _frontend_url != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(data_gov_router)
app.include_router(helpdesk_router)
app.include_router(gemini_compliance_router)
app.include_router(supabase_compliance_router)
app.include_router(tenders_router)
app.include_router(administration_router)
app.include_router(reports_router)
app.include_router(bids_router)
app.include_router(profiles_router)
app.include_router(audit_router)
app.include_router(notifications_router)
app.include_router(reviews_router)
app.include_router(documents_router)
app.include_router(vendors_router)
app.include_router(verification_router)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    log.info("Database tables verified/created.")
def _safe_filename(original: str) -> str:
    name = Path(original).name
    name = "".join(c if c.isalnum() or c in "._- " else "_" for c in name)
    name = name.strip().replace(" ", "_")
    return f"{uuid.uuid4().hex}_{name}"
def _validate_upload(file: UploadFile, contents: bytes):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, f"Only PDF files are accepted (got '{ext}').")

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"Invalid content type: '{content_type}'. Expected application/pdf.")

    if len(contents) == 0:
        raise HTTPException(400, "Uploaded file is empty.")

    if len(contents) > MAX_BYTES:
        raise HTTPException(413, f"File too large ({len(contents)//1024} KB). Maximum is {MAX_BYTES//1024//1024} MB.")
@app.post("/upload", summary="Upload a bid PDF for compliance checking")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: AuthUser | None = Depends(get_optional_user),
):
    try:
        contents = await file.read()
    except Exception:
        raise HTTPException(400, "Could not read the uploaded file.")
    _validate_upload(file, contents)
    safe_name  = _safe_filename(file.filename)
    dest_path  = UPLOAD_DIR / safe_name
    try:
        dest_path.write_bytes(contents)
    except OSError as e:
        raise HTTPException(500, f"Could not save file: {e}")
    log.info("Uploaded '%s' → '%s' (%d bytes)", file.filename, safe_name, len(contents))
    job = ComplianceJob(
        file_name    = file.filename,
        stored_path  = str(dest_path),
        status       = "queued",
        created_at   = datetime.now(timezone.utc),
    )
    db.add(job)
    db.flush()
    if user:
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=user.user_id,
            actor_email=user.email,
            actor_role=user.role,
            action="upload_compliance_doc",
            entity_type="ComplianceJob",
            entity_id=str(job.id),
            summary=f"Uploaded '{file.filename}' for compliance check",
        )
        db.add(audit)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(run_compliance_check, job.id, str(dest_path))
    log.info("Queued compliance job %d", job.id)
    return {
        "job_id":   job.id,
        "status":   job.status,
        "file_name": job.file_name,
        "message":  "File accepted. Compliance check running in background.",
    }
@app.get("/jobs/{job_id}/status", summary="Poll job processing status")
def get_job_status(job_id: int, db: Session = Depends(get_db)):
    """
    Returns the current status of a job.  Poll this after upload until
    status is 'completed' or 'failed'.
    """
    job = db.query(ComplianceJob).filter(ComplianceJob.id == job_id).first()
    if not job:
        raise HTTPException(404, f"Job {job_id} not found.")

    response = {
        "job_id":   job.id,
        "status":   job.status,
        "file_name": job.file_name,
        "score":    job.score,
        "verdict":  job.verdict,
        "created_at":   job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }
    if job.status == "processing":
        response["progress_message"] = "Running compliance checks and RAG analysis…"
    elif job.status == "queued":
        response["progress_message"] = "Job is queued and will start shortly."
    elif job.status == "failed":
        response["error"] = job.processing_error
    return response
@app.get("/jobs/{job_id}/results", summary="Get full compliance results")
def get_job_results(job_id: int, db: Session = Depends(get_db)):
    job = db.query(ComplianceJob).filter(ComplianceJob.id == job_id).first()
    if not job:
        raise HTTPException(404, f"Job {job_id} not found.")
    if job.status not in ("completed", "failed"):
        raise HTTPException(409, f"Job {job_id} is still {job.status}. Poll /jobs/{job_id}/status first.")
    rule_rows = db.query(RuleResult).filter(RuleResult.job_id == job_id).all()
    rag_rows  = db.query(RAGResult).filter(RAGResult.job_id == job_id).all()
    rule_results = [
        {
            "rule_code":     r.rule_code,
            "rule_name":     r.rule_name,
            "passed":        r.passed,
            "severity":      r.severity,
            "found_value":   r.found_value,
            "expected_value":r.expected_value,
            "evidence_text": r.evidence_text,
            "evidence_page": r.evidence_page,
            "suggestion":    r.suggestion,
        }
        for r in rule_rows
    ]
    rag_results = [
        {
            "rule_content": r.rule_content,
            "verdict":      r.verdict,
            "confidence":   r.confidence,
            "reason":       r.reason,
            "distance":     r.distance,
        }
        for r in rag_rows
    ]
    failed_rules = [r for r in rule_results if not r["passed"]]
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    failed_rules.sort(key=lambda r: (severity_order.get(r["severity"], 9), r["rule_code"]))
    fix_guide = [
        {
            "rule_code":  r["rule_code"],
            "rule_name":  r["rule_name"],
            "severity":   r["severity"],
            "suggestion": r["suggestion"],
            "evidence":   r["evidence_text"],
            "page":       r["evidence_page"],
        }
        for r in failed_rules
        if r.get("suggestion")
    ]
    return {
        "job": {
            "id":           job.id,
            "file_name":     job.file_name,
            "status":       job.status,
            "score":        job.score,
            "verdict":      job.verdict,
            "page_count":   job.page_count,
            "char_count":   job.char_count,
            "created_at":   job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "error":        job.processing_error,
        },
        "summary": {
            "score":           job.score,
            "verdict":         job.verdict,
            "rules_checked":   len(rule_results),
            "rules_passed":    sum(1 for r in rule_results if r["passed"]),
            "rules_failed":    sum(1 for r in rule_results if not r["passed"]),
            "rag_checks":      len(rag_results),
        },
        "rule_results": rule_results,
        "rag_results":  rag_results,
        "fix_guide":    fix_guide,
    }
@app.get("/jobs", summary="List all compliance jobs")
def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Return a paginated list of all jobs, most recent first."""
    total = db.query(ComplianceJob).count()
    jobs  = (
        db.query(ComplianceJob)
        .order_by(ComplianceJob.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "skip":  skip,
        "limit": limit,
        "jobs":  [
            {
                "id":         j.id,
                "file_name":   j.file_name,
                "status":     j.status,
                "score":      j.score,
                "verdict":    j.verdict,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in jobs
        ],
    }
@app.get("/", summary="Health check")
def read_root():
    return {"status": "ok", "service": "GeMShield Compliance API", "version": "2.0.0"}
