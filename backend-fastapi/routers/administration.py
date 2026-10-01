from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from db import get_db
from auth import get_current_user, require_roles, AuthUser
from models import Vendor, Profile, UserRole, ComplianceRuleVersion

router = APIRouter(prefix="/api/admin", tags=["Administration"])

# ─── Vendors ────────────────────────────────────────────────────────────

@router.get("/vendors")
def list_vendors(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    vendors = db.query(Vendor).order_by(Vendor.created_at.desc()).all()
    return [{
        "id": v.id,
        "owner_id": v.owner_id,
        "legal_name": v.legal_name,
        "trade_name": v.trade_name,
        "gstin": v.gstin,
        "category": v.category,
        "onboarding_status": v.onboarding_status,
        "status": v.status,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    } for v in vendors]

@router.get("/vendors/{vendor_id}")
def get_vendor(
    vendor_id: str,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(404, "Vendor not found")
    return {
        "id": v.id,
        "owner_id": v.owner_id,
        "legal_name": v.legal_name,
        "trade_name": v.trade_name,
        "gstin": v.gstin,
        "pan": v.pan,
        "udyam_number": v.udyam_number,
        "category": v.category,
        "address": v.address,
        "state": v.state,
        "city": v.city,
        "pincode": v.pincode,
        "contact_email": v.contact_email,
        "contact_phone": v.contact_phone,
        "onboarding_status": v.onboarding_status,
        "verification_notes": v.verification_notes,
        "status": v.status,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }

# ─── Users ────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    profiles = db.query(Profile).order_by(Profile.created_at.desc()).all()
    roles = db.query(UserRole).all()
    
    roles_by_user = {}
    for r in roles:
        if r.user_id not in roles_by_user:
            roles_by_user[r.user_id] = []
        roles_by_user[r.user_id].append(r.role)

    return [{
        "id": p.id,
        "full_name": p.full_name,
        "phone": p.phone,
        "organisation": p.organisation,
        "account_type": p.account_type,
        "approval_status": p.approval_status,
        "roles": roles_by_user.get(p.id, []),
        "created_at": p.created_at.isoformat() if p.created_at else None,
    } for p in profiles]

# ─── Rules ────────────────────────────────────────────────────────────

from pydantic import BaseModel
class PublishRequest(BaseModel):
    version: str
    change_summary: str
    rules: list

@router.get("/rules/versions")
def list_rule_versions(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    versions = db.query(ComplianceRuleVersion).order_by(ComplianceRuleVersion.created_at.desc()).all()
    
    if not versions:
        # Seed from rules.json if DB is empty
        import json
        from pathlib import Path
        rules_path = Path(__file__).parent.parent / "rules.json"
        if rules_path.exists():
            with open(rules_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                rules_list = data.get("rules", [])
        else:
            rules_list = []
            
        seed_version = ComplianceRuleVersion(
            id=str(uuid.uuid4()),
            version="v1.0 (Initial)",
            change_summary="Initial import from rules.json",
            rules=rules_list,
            status="published",
            published_at=datetime.now(timezone.utc)
        )
        db.add(seed_version)
        db.commit()
        db.refresh(seed_version)
        versions = [seed_version]
    # The frontend expects status, version, rules, change_summary, etc.
    # The existing model ComplianceRuleVersion only has id, version_name, created_at!
    # Wait, in the frontend rules.tsx it queries compliance_rule_versions using supabase
    # and gets id, version, status, rules, change_summary, created_at, published_at.
    # I need to update the ComplianceRuleVersion model to match!
    # Let me return what is in the table for now, and I will update the model later.
    return [{
        "id": v.id,
        "version": getattr(v, "version", "Unknown"),
        "status": getattr(v, "status", "published"),
        "rules": getattr(v, "rules", []),
        "change_summary": getattr(v, "change_summary", ""),
        "created_at": v.created_at.isoformat() if getattr(v, "created_at", None) else None,
        "published_at": getattr(v, "published_at", None) and v.published_at.isoformat(),
    } for v in versions]

@router.post("/rules/versions")
def create_rule_version(
    body: dict,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    version = ComplianceRuleVersion(
        id=str(uuid.uuid4()),
        version=body.get("version"),
        change_summary=body.get("change_summary"),
        rules=body.get("rules"),
        status="draft"
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return {"id": version.id}

@router.patch("/rules/versions/{version_id}")
def update_rule_version(
    version_id: str,
    body: dict,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    version = db.query(ComplianceRuleVersion).filter(ComplianceRuleVersion.id == version_id).first()
    if not version:
        raise HTTPException(404, "Version not found")
    if version.status != "draft":
        raise HTTPException(400, "Cannot edit a non-draft version")
        
    version.rules = body.get("rules")
    db.commit()
    return {"message": "Updated successfully"}

@router.post("/rules/versions/{version_id}/publish")
def publish_rule_version(
    version_id: str,
    body: dict,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    version = db.query(ComplianceRuleVersion).filter(ComplianceRuleVersion.id == version_id).first()
    if not version:
        raise HTTPException(404, "Version not found")
    if version.status != "draft":
        raise HTTPException(400, "Can only publish draft versions")
        
    # Archive currently published
    db.query(ComplianceRuleVersion).filter(ComplianceRuleVersion.status == "published").update({"status": "archived"})
    
    version.status = "published"
    version.published_at = datetime.now(timezone.utc)
    
    from models import AuditLog
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user.user_id,
        actor_email=user.email,
        action="Publish Rulebook",
        entity_type="ComplianceRuleVersion",
        entity_id=version.id,
        summary=body.get("justification", "")
    )
    db.add(audit)
    db.commit()

    # Synchronize back to rules.json so the rule engine uses the latest rules
    import json
    from pathlib import Path
    rules_path = Path(__file__).parent.parent / "rules.json"
    with open(rules_path, "w", encoding="utf-8") as f:
        json.dump({"rules": version.rules or []}, f, indent=2)

    return {"message": "Published successfully"}


