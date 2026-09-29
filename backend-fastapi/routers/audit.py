"""
audit.py — Audit log router for GeMShield.

Provides append-only audit trail for all material actions.
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
from models import AuditLog

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit", tags=["Audit"])


class AuditEntry(BaseModel):
    action: str = Field(..., max_length=200)
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    summary: Optional[str] = None
    metadata: Optional[dict] = None


@router.get("/", summary="List audit logs")
def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=2000),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer", "reviewer")),
    db: Session = Depends(get_db),
):
    """List audit log entries with optional filters."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)

    total = query.count()
    entries = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "entries": [
            {
                "id": e.id,
                "actor_id": e.actor_id,
                "actor_email": e.actor_email,
                "actor_role": e.actor_role,
                "action": e.action,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "summary": e.summary,
                "ip_address": e.ip_address,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ],
    }


@router.get("/me", summary="List my audit logs")
def list_my_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).filter(AuditLog.actor_id == user.user_id)
    total = query.count()
    entries = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "entries": [
            {
                "id": e.id,
                "action": e.action,
                "entity_type": e.entity_type,
                "summary": e.summary,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ],
    }

@router.get("/{audit_id}", summary="Get a specific audit entry")
def get_audit_entry(
    audit_id: str,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer", "reviewer")),
    db: Session = Depends(get_db),
):
    entry = db.query(AuditLog).filter(AuditLog.id == audit_id).first()
    if not entry:
        raise HTTPException(404, "Audit entry not found")
    return {
        "id": entry.id,
        "actor_id": entry.actor_id,
        "actor_email": entry.actor_email,
        "actor_role": entry.actor_role,
        "action": entry.action,
        "entity_type": entry.entity_type,
        "entity_id": entry.entity_id,
        "summary": entry.summary,
        "metadata": entry.metadata_,
        "ip_address": entry.ip_address,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }


@router.post("/", summary="Create an audit log entry")
def create_audit_entry(
    body: AuditEntry,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Append a new audit log entry. Used by the frontend for client-side material actions."""
    import json
    entry = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user.user_id,
        actor_email=user.email,
        action=body.action,
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        summary=body.summary,
        metadata_=json.dumps(body.metadata) if body.metadata else None,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "message": "Audit entry created"}
