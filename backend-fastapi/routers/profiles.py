"""
profiles.py — User profile and role management router.

Endpoints:
  GET  /api/profiles/me          — Get current user's profile and roles
  PUT  /api/profiles/me          — Update current user's profile
  GET  /api/profiles/             — List profiles (admin/officer only)
  GET  /api/profiles/:id         — Get a specific profile
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from db import get_db
from auth import get_current_user, require_roles, AuthUser
from models import Profile, UserRole, Vendor

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profiles", tags=["Profiles"])


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    organisation: Optional[str] = None
    designation: Optional[str] = None
    ministry_department: Optional[str] = None
    employee_official_id: Optional[str] = None
    office_location: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None
    density: Optional[str] = None
    notification_prefs: Optional[dict] = None


class VendorUpdate(BaseModel):
    company_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None


def _profile_dict(p: Profile, roles: list[str], vendor=None, email: str = None) -> dict:
    d = {
        "id": p.id,
        "account_type": p.account_type,
        "full_name": p.full_name,
        "email": email,
        "phone": p.phone,
        "organisation": p.organisation,
        "approval_status": p.approval_status,
        "designation": p.designation,
        "ministry_department": p.ministry_department,
        "employee_official_id": p.employee_official_id,
        "office_location": p.office_location,
        "timezone": p.timezone,
        "language": p.language,
        "theme": p.theme,
        "density": p.density,
        "notification_prefs": p.notification_prefs,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "roles": roles,
    }
    if vendor:
        d["vendor"] = {
            "id": vendor.id,
            "company_name": vendor.company_name,
            "gstin": vendor.gstin,
            "pan": vendor.pan,
            "status": vendor.status,
        }
    return d


@router.get("/me", summary="Get current user's profile")
def get_my_profile(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.id == user.user_id).first()
    if not profile:
        # Auto-create profile on first access
        profile = Profile(
            id=user.user_id,
            account_type="vendor",
            full_name=user.email.split("@")[0] if user.email else None,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    roles = [r[0] for r in db.query(UserRole.role).filter(UserRole.user_id == user.user_id).all()]
    vendor = db.query(Vendor).filter(Vendor.profile_id == user.user_id).first()
    return _profile_dict(profile, roles, vendor, email=user.email)


@router.put("/me", summary="Update current user's profile")
def update_my_profile(
    body: ProfileUpdate,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.id == user.user_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    if body.full_name is not None:
        profile.full_name = body.full_name
    if body.phone is not None:
        profile.phone = body.phone
    if body.organisation is not None:
        profile.organisation = body.organisation
    if body.designation is not None:
        profile.designation = body.designation
    if body.ministry_department is not None:
        profile.ministry_department = body.ministry_department
    if body.employee_official_id is not None:
        profile.employee_official_id = body.employee_official_id
    if body.office_location is not None:
        profile.office_location = body.office_location
    if body.timezone is not None:
        profile.timezone = body.timezone
    if body.language is not None:
        profile.language = body.language
    if body.theme is not None:
        profile.theme = body.theme
    if body.density is not None:
        profile.density = body.density
    if body.notification_prefs is not None:
        profile.notification_prefs = body.notification_prefs

    db.commit()
    db.refresh(profile)

    roles = [r[0] for r in db.query(UserRole.role).filter(UserRole.user_id == user.user_id).all()]
    return _profile_dict(profile, roles)


@router.get("/", summary="List all profiles (admin/officer)")
def list_profiles(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    profiles = db.query(Profile).order_by(Profile.created_at.desc()).all()
    result = []
    for p in profiles:
        roles = [r[0] for r in db.query(UserRole.role).filter(UserRole.user_id == p.id).all()]
        result.append(_profile_dict(p, roles))
    return {"profiles": result}


@router.get("/export", summary="Export all user data")
def export_my_data(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from models import Bid, ComplianceJob, Notification, AuditLog
    
    uid = user.user_id
    profile = db.query(Profile).filter(Profile.id == uid).first()
    vendor = db.query(Vendor).filter(Vendor.owner_id == uid).first()
    bids = db.query(Bid).filter(Bid.vendor_user_id == uid).all()
    compliance_jobs = db.query(ComplianceJob).filter(ComplianceJob.vendor_user_id == uid).all()
    notifications = db.query(Notification).filter(Notification.user_id == uid).all()
    audit_logs = db.query(AuditLog).filter(AuditLog.actor_id == uid).all()

    def row2dict(row):
        d = {}
        for column in row.__table__.columns:
            val = getattr(row, column.name)
            if isinstance(val, datetime):
                d[column.name] = val.isoformat()
            else:
                d[column.name] = val
        return d

    import json
    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "profile": row2dict(profile) if profile else None,
        "vendors": [row2dict(vendor)] if vendor else [],
        "bids": [row2dict(b) for b in bids],
        "compliance_runs": [row2dict(c) for c in compliance_jobs],
        "notifications": [row2dict(n) for n in notifications],
        "activity": [row2dict(a) for a in audit_logs],
    }

@router.get("/{profile_id}", summary="Get a specific profile")
def get_profile(
    profile_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    roles = [r[0] for r in db.query(UserRole.role).filter(UserRole.user_id == profile_id).all()]
    vendor = db.query(Vendor).filter(Vendor.profile_id == profile_id).first()
    return _profile_dict(profile, roles, vendor)
