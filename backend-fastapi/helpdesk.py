"""
helpdesk.py — Vendor AI Help Desk router for GeMShield.

Separate Gemini workflow from compliance RAG.
Provides vendor-facing AI assistance with:
  - Platform navigation
  - Approved procurement documentation guidance
  - Approved procurement rules/guidelines
  - Tender clarification process
  - Multilingual responses

Security boundaries enforced:
  - No internal scoring weights
  - No private competitor bid information
  - No unauthorized internal algorithms/rules
  - No invented government policy
  - No tender-specific rules without backing source
  - Formal issues create clarification tickets
"""

import os
import json
import uuid
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from db import get_db
from auth import get_current_user, AuthUser

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/helpdesk", tags=["Vendor Help Desk"])

_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
}

GUIDE = """GeMShield vendor guide (approved platform guidance):
- Registration: vendors sign up at Vendor Sign Up with organisation name, GSTIN, PAN, email and phone. Organisation details can be completed in Profile & Settings > My Profile.
- Finding tenders: Find Tenders lists published tenders with search and filters (category, department, location, closing date, value). Save tenders with the bookmark; open a tender to see Overview, Documents, Technical Requirements, Financial Details, Important Dates and Requirements & ATC.
- Applying: Apply opens a four-stage flow: Basic Details → Documents → Bid Details (price) → Review & Submit. The draft is saved; after submission it is locked and appears in My Bids. Submitted bids can only change if the department requests clarification.
- Documents: upload PDFs in the Documents stage; each file is hashed (SHA-256) for integrity.
- Compliance Check: upload a bid PDF (optionally linked to a bid). GeMShield runs 15 deterministic rules (GSTIN, PAN, bid validity ≥ 90 days, EMD with amount, authorised signatory, annual turnover ≥ ₹5,00,000, Udyam/MSME, delivery period, Make in India, warranty, OEM authorisation, payment terms, technical specifications, past performance, compliance certificates) and AI checks against the tender's technical requirements. Score: critical 40, warning 15, info 5 weights; any critical failure = Non-Compliant; score ≥ 85 = Compliant; otherwise Needs Review. AI is advisory; the procurement officer makes the final decision.
- Bid Passport: finalised decision record for completed bids.
- Notifications: bid, compliance and department updates.
- Profile & Settings: account, security (password), notification preferences, appearance (light/dark).
"""

SYSTEM_PROMPT_TEMPLATE = """You are GeMShield Assistant helping {audience} on GeMShield, an Indian government procurement compliance platform.
Answer in {language_name}.
Use the approved guidance below and general, widely known GeM practice.
Be concise, use short numbered lists when helpful, and use markdown.
Never invent specific procurement policy, clause numbers, fees or deadlines.
If you are unsure or a question needs an official ruling, say that official GeM guidance or the procuring department must be consulted.

SECURITY BOUNDARIES — You MUST NOT:
- Reveal internal scoring weights or formulas
- Reveal private competitor bid information
- Reveal unauthorized internal algorithms or rules
- Invent government policy
- Claim a tender-specific rule unless it is backed by the current tender/approved source
- Make promises about bid outcomes

{guide}"""


# ─── Request/Response Models ───────────────────────────────────────────────────

class Message(BaseModel):
    role: str = Field(..., pattern=r"^(user|assistant)$")
    content: str = Field(..., max_length=4000)


class AskRequest(BaseModel):
    messages: List[Message] = Field(..., min_length=1, max_length=30)
    audience: str = Field("vendor", pattern=r"^(vendor|officer)$")
    language: str = Field("en", pattern=r"^(en|hi|mr|bn|gu|ta|te|ml)$")


class HelpTicketRequest(BaseModel):
    subject: str = Field(..., min_length=5, max_length=200)
    body: str = Field(..., min_length=10, max_length=4000)
    category: str = Field("general", pattern=r"^(general|tender_clarification|technical|account)$")
    tender_id: Optional[str] = None


# ─── SQLAlchemy model for help tickets ──────────────────────────────────────────

from sqlalchemy import Column, Integer, String, Text, DateTime
from models import Base, HelpTicket





# ─── Gemini helper ──────────────────────────────────────────────────────────────

def _get_gemini_client():
    """Get or create the Gemini client using the current google-genai SDK."""
    from google import genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(503, "AI service is not configured.")
    return genai.Client(api_key=api_key)


# ─── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/ask", summary="Ask the AI Help Desk assistant")
async def ask_assistant(
    body: AskRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Send a conversation to the GeMShield AI assistant.
    Responds in the selected language.
    Uses Gemini via FastAPI — no Lovable AI Gateway.
    """
    language_name = LANGUAGE_NAMES.get(body.language, "English")
    audience_label = "vendors" if body.audience == "vendor" else "procurement officers"

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        audience=audience_label,
        language_name=language_name,
        guide=GUIDE,
    )

    # Build the conversation for Gemini
    conversation_parts = [system_prompt + "\n\n"]
    for msg in body.messages:
        prefix = "User: " if msg.role == "user" else "Assistant: "
        conversation_parts.append(prefix + msg.content)

    try:
        def _call():
            client = _get_gemini_client()
            return client.models.generate_content(
                model=_GEMINI_MODEL,
                contents=["\n\n".join(conversation_parts)],
                config={
                    "temperature": 0.7,
                    "max_output_tokens": 2048,
                },
            )

        max_retries = 3
        delay = 1.0
        response = None
        for attempt in range(max_retries):
            try:
                response = await asyncio.to_thread(_call)
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                log.warning("Gemini Helpdesk API error (attempt %d/%d): %s. Retrying in %s s...", attempt+1, max_retries, e, delay)
                await asyncio.sleep(delay)
                delay *= 2
                
        reply = response.text
    except Exception as exc:
        log.error("Gemini Help Desk call failed: %s", exc)
        reply = "I apologize, but I am temporarily unable to respond due to high demand on the AI service. Please try again later or raise a support ticket if your query is urgent."

    return {"reply": reply}


@router.post("/tickets", summary="Create a help ticket")
async def create_ticket(
    body: HelpTicketRequest,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a formal help ticket. Persisted in Neon.
    Tender clarification tickets can reference a specific tender.
    """
    ticket = HelpTicket(
        ticket_id=f"GS-{uuid.uuid4().hex[:8].upper()}",
        user_id=user.user_id,
        user_email=user.email,
        subject=body.subject,
        body=body.body,
        category=body.category,
        tender_id=body.tender_id,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    log.info("Help ticket created: %s by %s", ticket.ticket_id, user.email)

    return {
        "ticket_id": ticket.ticket_id,
        "status": ticket.status,
        "message": "Your help ticket has been created and will be reviewed.",
    }


@router.get("/tickets", summary="List user's help tickets")
async def list_tickets(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all help tickets for the current user."""
    tickets = (
        db.query(HelpTicket)
        .filter(HelpTicket.user_id == user.user_id)
        .order_by(HelpTicket.created_at.desc())
        .all()
    )
    return {
        "tickets": [
            {
                "ticket_id": t.ticket_id,
                "subject": t.subject,
                "category": t.category,
                "status": t.status,
                "tender_id": t.tender_id,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in tickets
        ],
    }
