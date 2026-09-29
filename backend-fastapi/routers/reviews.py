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
from models import ReviewDecision, BidPassport, Bid, AuditLog

log = logging.getLogger(__name__)

router = APIRouter(tags=["Reviews & Decisions"])


# ─── Decision Models ────────────────────────────────────────────────────────────

class DecisionRequest(BaseModel):
    bid_id: str
    decision: str = Field(..., pattern=r"^(approved|rejected|needs_review|escalated)$")
    justification: str = Field(..., min_length=10, max_length=4000)


class BidPassportRequest(BaseModel):
    bid_id: str


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
    if body.decision == "approved":
        bid.status = "finalized"
    elif body.decision == "rejected":
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
    total = db.query(BidPassport).count()
    passports = (
        db.query(BidPassport)
        .order_by(BidPassport.issued_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "passports": [
            {
                "id": p.id,
                "bid_id": p.bid_id,
                "snapshot": p.snapshot,
                "issued_at": p.issued_at.isoformat() if p.issued_at else None,
            }
            for p in passports
        ],
    }


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
