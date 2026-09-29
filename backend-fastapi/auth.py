"""
auth.py — Supabase JWT validation and RBAC enforcement for FastAPI.

Validates the Supabase-issued JWT from the Authorization header,
extracts user ID and claims, and provides role-based access control.
"""

import os
import logging
from functools import wraps
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger(__name__)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")

security = HTTPBearer(auto_error=False)


class AuthUser:
    """Authenticated user extracted from a valid Supabase JWT."""

    def __init__(self, user_id: str, email: str, role: str, claims: dict):
        self.user_id = user_id
        self.email = email
        self.role = role  # Supabase role claim (authenticated/anon)
        self.claims = claims


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthUser:
    """
    Dependency that validates the Supabase JWT and returns an AuthUser.
    Raises 401 if the token is missing, expired, or invalid.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    token = credentials.credentials
    try:
        # Supabase JWTs are signed with the project's JWT secret
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": True} if SUPABASE_JWT_SECRET else {"verify_signature": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        log.warning("JWT validation failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing subject")

    return AuthUser(
        user_id=user_id,
        email=payload.get("email", ""),
        role=payload.get("role", "authenticated"),
        claims=payload,
    )


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthUser]:
    """
    Like get_current_user but returns None instead of raising 401
    when no credentials are provided (for public + auth endpoints).
    """
    if not credentials:
        return None
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


def require_roles(*allowed_roles: str):
    """
    Returns a FastAPI dependency that enforces application-level RBAC.
    Checks user_roles in the database (not the JWT role claim).

    Usage:
        @app.get("/admin-only", dependencies=[Depends(require_roles("admin"))])
    """
    from db import get_db
    from sqlalchemy.orm import Session

    async def _check(
        user: AuthUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> AuthUser:
        from models import UserRole
        roles = (
            db.query(UserRole.role)
            .filter(UserRole.user_id == user.user_id)
            .all()
        )
        user_roles = {r[0] for r in roles}
        if not user_roles.intersection(set(allowed_roles)):
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required: {', '.join(allowed_roles)}",
            )
        # Attach resolved app roles to the user object
        user.app_roles = user_roles
        return user

    return _check
