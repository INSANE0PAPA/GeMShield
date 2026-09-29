"""
notifications.py — Notifications router for GeMShield.

Provides notification management for authenticated users.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db import get_db
from auth import get_current_user, AuthUser
from models import Notification

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/", summary="List current user's notifications")
def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = False,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == user.user_id)
    if unread_only:
        query = query.filter(Notification.read_at == None)

    total = query.count()
    notifs = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "unread_count": db.query(Notification).filter(
            Notification.user_id == user.user_id,
            Notification.read_at == None,
        ).count(),
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "body": n.body,
                "category": n.category,
                "severity": n.severity,
                "link": n.link,
                "read_at": n.read_at.isoformat() if n.read_at else None,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifs
        ],
    }


@router.put("/{notification_id}/read", summary="Mark a notification as read")
def mark_read(
    notification_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user.user_id,
    ).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": notif.id, "read_at": notif.read_at.isoformat()}


@router.put("/read-all", summary="Mark all notifications as read")
def mark_all_read(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user.user_id, Notification.read_at == None)
        .update({"read_at": datetime.now(timezone.utc)})
    )
    db.commit()
    return {"marked_read": count}
