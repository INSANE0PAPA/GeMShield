"""
reviews.py — Human Review and Final Decision router for GeMShield.

Endpoints:
  GET  /api/reviews/cases              — List review cases
  POST /api/reviews/cases/:id/action   — Record officer review action
  GET  /api/decisions/                 — List final decisions  
  POST /api/decisions/                 — Record a final decision
  GET  /api/decisions/:id              — Get a specific decision
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from db import get_db
from auth import get_current_user, require_roles, AuthUser
from models import ReviewDecision, BidPassport, Bid, AuditLog, HumanReviewCase, Profile, ComplianceJob, Tender

log = logging.getLogger(__name__)

router = APIRouter(tags=["Reviews & Decisions"])


# ─── Decision Models ────────────────────────────────────────────────────────────

class DecisionRequest(BaseModel):
    bid_id: str
    decision: str = Field(..., pattern=r"^(compliant|non_compliant|approved|rejected|needs_review|escalated)$")
    justification: str = Field(..., min_length=10, max_length=4000)


class BidPassportRequest(BaseModel):
    bid_id: str


class ActionRequest(BaseModel):
    action: str = Field(..., pattern=r"^(in_progress|confirm|override|clarification|escalate)$")
    justification: str

# ─── Decision Endpoints ─────────────────────────────────────────────────────────

@router.get("/api/human-review-cases/", summary="List human review cases")
def list_review_cases(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer", "reviewer")),
    db: Session = Depends(get_db),
):
    cases = db.query(HumanReviewCase).order_by(HumanReviewCase.created_at.desc()).all()
    
    out = []
    for c in cases:
        run = db.query(ComplianceJob).filter(ComplianceJob.id == c.run_id).first()
        tender = db.query(Tender).filter(Tender.id == c.tender_id).first() if c.tender_id else None
        vendor = db.query(Profile).filter(Profile.id == c.vendor_user_id).first()
        
        # calculate confidence for UI (mocking based on rule results later, but for now we just return 1.0 or None)
        out.append({
            "id": c.id,
            "run_id": c.run_id,
            "bid_id": c.bid_id,
            "priority": c.priority,
            "status": c.status,
            "trigger_reason": c.trigger_reason,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "resolution": c.resolution,
            "justification": c.justification,
            "run": {
                "file_name": run.file_name if run else "Unknown",
                "score": run.score if run else None,
                "verdict": run.verdict if run else None,
                "ai_confidence": None,
            } if run else None,
            "tender": {
                "title": tender.title,
                "reference_no": tender.reference_no,
            } if tender else None,
            "vendor": {
                "full_name": vendor.full_name if vendor else None,
                "email": None, # Profile model does not have email, we could fetch from elsewhere or leave None
            } if vendor else None
        })
    return out

@router.post("/api/human-review-cases/{case_id}/action", summary="Record officer review action")
def record_review_action(
    case_id: str,
    req: ActionRequest,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer", "reviewer")),
    db: Session = Depends(get_db),
):
    case = db.query(HumanReviewCase).filter(HumanReviewCase.id == case_id).first()
    if not case:
        raise HTTPException(404, "Case not found")
        
    if req.action in ["override", "clarification", "escalate"] and len(req.justification.strip()) < 10:
        raise HTTPException(400, "Justification must be at least 10 characters.")
        
    case.status = "resolved" if req.action in ["confirm", "override"] else "in_progress"
    case.resolution = req.action
    case.justification = req.justification
    case.resolved_by = user.user_id
    case.resolved_at = datetime.now(timezone.utc)
    
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user.user_id,
        actor_email=user.email,
        action=f"Review Action: {req.action}",
        entity_type="HumanReviewCase",
        entity_id=case.id,
        summary=req.justification,
    )
    db.add(audit)
    
    if req.action == "clarification" and case.vendor_user_id:
        from models import Notification
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=case.vendor_user_id,
            title="Clarification Requested",
            body=f"An officer has requested clarification regarding your bid.",
            category="alert",
            severity="warning",
            link="/vendor/bids"
        )
        db.add(notif)

    db.commit()
    
    return {"message": "Action recorded"}

# ─── Decision Endpoints ─────────────────────────────────────────────────────────

@router.get("/api/decisions/", summary="List final decisions")
def list_decisions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: AuthUser = Depends(require_roles("admin", "procurement_officer", "reviewer")),
    db: Session = Depends(get_db),
):
    total = db.query(ReviewDecision).count()
    decisions = (
        db.query(ReviewDecision)
        .order_by(ReviewDecision.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "decisions": [
            {
                "id": d.id,
                "bid_id": d.bid_id,
                "officer_id": d.officer_id,
                "decision": d.decision,
                "justification": d.justification,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in decisions
        ],
    }


@router.post("/api/decisions/", summary="Record a final decision")
def create_decision(
    body: DecisionRequest,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    # Verify bid exists
    bid = db.query(Bid).filter(Bid.id == body.bid_id).first()
    if not bid:
        raise HTTPException(404, "Bid not found")

    decision = ReviewDecision(
        id=str(uuid.uuid4()),
        bid_id=body.bid_id,
        officer_id=user.user_id,
        decision=body.decision,
        justification=body.justification,
    )
    db.add(decision)

    # Update bid status based on decision
    if body.decision in ("approved", "compliant"):
        bid.status = "finalized"
    elif body.decision in ("rejected", "non_compliant"):
        bid.status = "rejected"

    # Audit trail
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user.user_id,
        actor_email=user.email,
        action=f"Final decision: {body.decision}",
        entity_type="Bid",
        entity_id=body.bid_id,
        summary=body.justification[:200],
    )
    db.add(audit)

    import json
    tender = db.query(Tender).filter(Tender.id == bid.tender_id).first()
    passport = BidPassport(
        id=str(uuid.uuid4()),
        bid_id=body.bid_id,
        snapshot=json.dumps({
            "bid_id": bid.id,
            "tender_id": bid.tender_id,
            "vendor_id": bid.vendor_id,
            "bid_status": bid.status,
            "decision": decision.decision,
            "decision_justification": decision.justification,
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "issued_by": user.user_id,
            "tender": {"reference_no": tender.reference_no if tender else bid.tender_id, "title": tender.title if tender else ""},
            "compliance": {}
        }),
    )
    db.add(passport)

    from models import Notification
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=bid.vendor_user_id,
        title="Final Decision Recorded",
        body=f"Your bid for tender '{bid.tender_id}' has been {body.decision}.",
        category="decision",
        severity="success" if body.decision in ("approved", "compliant") else "critical",
        link="/vendor/bids"
    )
    db.add(notif)

    db.commit()
    db.refresh(decision)

    log.info(
        "Decision %s on bid %s by %s: %s",
        decision.id, body.bid_id, user.email, body.decision,
    )

    return {
        "id": decision.id,
        "decision": decision.decision,
        "message": "Decision recorded and audited.",
    }


@router.get("/api/decision-candidates/", summary="Get bids requiring final decisions")
def get_decision_candidates(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    # Fetch all completed compliance jobs linked to bids
    jobs = db.query(ComplianceJob).filter(
        ComplianceJob.status == "completed",
        ComplianceJob.bid_id != None
    ).order_by(ComplianceJob.completed_at.desc()).all()
    
    out = []
    for j in jobs:
        bid = db.query(Bid).filter(Bid.id == j.bid_id).first()
        if not bid: continue
        tender = db.query(Tender).filter(Tender.id == bid.tender_id).first()
        vendor = db.query(Profile).filter(Profile.id == j.vendor_user_id).first()
        
        # Check review status
        reviews = db.query(HumanReviewCase).filter(HumanReviewCase.bid_id == bid.id).all()
        decision = db.query(ReviewDecision).filter(ReviewDecision.bid_id == bid.id).order_by(ReviewDecision.created_at.desc()).first()
        
        out.append({
            "id": j.id,
            "bid_id": j.bid_id,
            "vendor_user_id": j.vendor_user_id,
            "score": j.score,
            "verdict": j.verdict,
            "file_name": j.file_name,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
            "officer_status": j.officer_status,
            "bid": {
                "id": bid.id,
                "status": bid.status,
                "submitted_at": bid.submitted_at.isoformat() if bid.submitted_at else None
            },
            "tender": {
                "title": tender.title if tender else None,
                "reference_no": tender.reference_no if tender else None,
            },
            "vendor": {
                "full_name": vendor.full_name if vendor else None,
                "email": None
            },
            "decision": [{
                "id": decision.id,
                "decision": decision.decision,
                "justification": decision.justification,
                "decision_hash": "mockhash", # Removed hash for now
                "decided_at": decision.created_at.isoformat() if decision.created_at else None
            }] if decision else [],
            "review": [{"status": r.status} for r in reviews]
        })
    return out

@router.get("/api/decisions/{decision_id}", summary="Get a specific decision")
def get_decision(
    decision_id: str,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer", "reviewer")),
    db: Session = Depends(get_db),
):
    decision = db.query(ReviewDecision).filter(ReviewDecision.id == decision_id).first()
    if not decision:
        raise HTTPException(404, "Decision not found")
    return {
        "id": decision.id,
        "bid_id": decision.bid_id,
        "officer_id": decision.officer_id,
        "decision": decision.decision,
        "justification": decision.justification,
        "created_at": decision.created_at.isoformat() if decision.created_at else None,
    }


# ─── Bid Passport Endpoints ─────────────────────────────────────────────────────

@router.get("/api/bid-passports/", summary="List bid passports")
def list_passports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(BidPassport)
    
    from models import UserRole
    user_roles = [r[0] for r in db.query(UserRole.role).filter(UserRole.user_id == user.user_id).all()]
    if "admin" not in user_roles and "procurement_officer" not in user_roles:
        # Vendor only sees passports for their own bids
        query = query.join(Bid).filter(Bid.vendor_user_id == user.user_id)
        
    passports = (
        query.order_by(BidPassport.issued_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    out = []
    for p in passports:
        import json
        snap = json.loads(p.snapshot) if p.snapshot else {}
        decision = db.query(ReviewDecision).filter(ReviewDecision.bid_id == p.bid_id).order_by(ReviewDecision.created_at.desc()).first()
        out.append({
            "id": p.id,
            "bid_id": p.bid_id,
            "passport_snapshot": snap,
            "passport_hash": "mockhash", # Integrity hashes removed for now
            "issued_at": p.issued_at.isoformat() if p.issued_at else None,
            "decision": {
                "decision": decision.decision,
                "justification": decision.justification,
                "decision_hash": "mockhash",
                "decided_at": decision.created_at.isoformat() if decision.created_at else None
            } if decision else None
        })
    return out


@router.post("/api/bid-passports/", summary="Issue a bid passport")
def issue_passport(
    body: BidPassportRequest,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    """Issue a bid passport after a final decision is recorded."""
    import json

    bid = db.query(Bid).filter(Bid.id == body.bid_id).first()
    if not bid:
        raise HTTPException(404, "Bid not found")

    # Check if passport already exists
    existing = db.query(BidPassport).filter(BidPassport.bid_id == body.bid_id).first()
    if existing:
        return {
            "id": existing.id,
            "message": "Bid passport already issued.",
        }

    # Check decision exists
    decision = (
        db.query(ReviewDecision)
        .filter(ReviewDecision.bid_id == body.bid_id)
        .order_by(ReviewDecision.created_at.desc())
        .first()
    )

    passport = BidPassport(
        id=str(uuid.uuid4()),
        bid_id=body.bid_id,
        snapshot=json.dumps({
            "bid_id": bid.id,
            "tender_id": bid.tender_id,
            "vendor_id": bid.vendor_id,
            "bid_status": bid.status,
            "decision": decision.decision if decision else None,
            "decision_justification": decision.justification if decision else None,
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "issued_by": user.user_id,
        }),
    )
    db.add(passport)

    # Audit trail
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user.user_id,
        actor_email=user.email,
        action="Bid Passport Issued",
        entity_type="BidPassport",
        entity_id=passport.id,
        summary=f"Passport issued for bid {body.bid_id}",
    )
    db.add(audit)

    db.commit()
    db.refresh(passport)

    return {
        "id": passport.id,
        "bid_id": passport.bid_id,
        "message": "Bid passport issued successfully.",
    }


@router.get("/api/bid-passports/{passport_id}", summary="Get a specific passport")
def get_passport(
    passport_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    passport = db.query(BidPassport).filter(BidPassport.id == passport_id).first()
    if not passport:
        raise HTTPException(404, "Bid passport not found")
    import json
    return {
        "id": passport.id,
        "bid_id": passport.bid_id,
        "snapshot": json.loads(passport.snapshot) if passport.snapshot else None,
        "issued_at": passport.issued_at.isoformat() if passport.issued_at else None,
    }
