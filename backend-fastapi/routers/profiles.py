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


class VendorUpdate(BaseModel):
    company_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None


def _profile_dict(p: Profile, roles: list[str], vendor=None) -> dict:
    d = {
        "id": p.id,
        "account_type": p.account_type,
        "full_name": p.full_name,
        "phone": p.phone,
        "organisation": p.organisation,
        "approval_status": p.approval_status,
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
    return _profile_dict(profile, roles, vendor)


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
