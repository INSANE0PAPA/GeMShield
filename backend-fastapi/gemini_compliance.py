"""
gemini_compliance.py — FastAPI router for Gemini-based compliance analysis.

Replaces the Lovable AI Gateway (callGateway) with server-side Gemini calls.
Gemini is advisory only — it evaluates ambiguous/semantic clauses using retrieved evidence.
It cannot make the final procurement decision, invent evidence, or modify a final decision.

Uses structured JSON output.
"""

import os
import json
import logging
import asyncio
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user, AuthUser

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/compliance", tags=["Gemini Compliance"])

_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


# ─── Request/Response Models ───────────────────────────────────────────────────

class TechRequirement(BaseModel):
    parameter: str
    spec: str


class ComplianceAnalysisRequest(BaseModel):
    """Request for Gemini semantic analysis of a compliance run."""
    document_text: str = Field(..., max_length=100000)
    ambiguous_rules: List[dict] = Field(default_factory=list)
    tech_requirements: List[TechRequirement] = Field(default_factory=list)


class ComplianceResponse(BaseModel):
    """Structured Gemini compliance advisory response."""
    rule_id: str
    compliant: bool
    confidence_score: float
    found_evidence: Optional[str] = None
    page_reference: Optional[int] = None
    reasoning: str
    recommended_action: str  # advisory_pass | flag_human_review | flag_critical_veto


# ─── Gemini helper ──────────────────────────────────────────────────────────────

def _get_gemini_client():
    from google import genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(503, "Gemini API key is not configured.")
    return genai.Client(api_key=api_key)


SYSTEM_PROMPT = """You are GeMShield's advisory compliance analyst for Indian government procurement (GeM).

Your role:
- Evaluate ambiguous/semantic clauses using the supplied document text
- Judge ONLY from the supplied document text
- Never invent facts or evidence
- If evidence is absent, say so clearly
- Contradictions are review signals, never automatic fraud
- You are advisory only — the procurement officer makes the final decision

For EACH item, return a JSON object with:
{
  "rule_id": "R001",
  "compliant": true/false,
  "confidence_score": 0.0-1.0,
  "found_evidence": "quoted text from document or null",
  "page_reference": page_number_or_null,
  "reasoning": "one concise sentence",
  "recommended_action": "advisory_pass" | "flag_human_review" | "flag_critical_veto"
}

Rules for recommended_action:
- advisory_pass: clear evidence supports compliance
- flag_human_review: ambiguous evidence or low confidence
- flag_critical_veto: clear evidence of non-compliance on a critical requirement

Return a JSON object with keys: "rules" (array of rule assessments), "requirements" (array of tech requirement assessments), "summary" (2-3 sentences), "confidence" (0-1), "recommendations" (up to 5 short strings).
"""


@router.post("/analyze", summary="Run Gemini semantic compliance analysis")
async def analyze_compliance(
    body: ComplianceAnalysisRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Run Gemini advisory analysis on document text.
    Evaluates ambiguous rules and tender technical requirements.
    Returns structured JSON with per-item verdicts.
    
    Gemini is advisory only — it cannot make the final decision.
    """
    if not body.document_text.strip():
        raise HTTPException(400, "Document text is required.")

    # Build the prompt
    excerpt = body.document_text[:60000]  # Keep under token budget

    prompt_parts = [f"Document text:\n{excerpt}\n\nTasks:"]

    if body.tech_requirements:
        reqs = [
            {"i": i, "parameter": r.parameter, "spec": r.spec}
            for i, r in enumerate(body.tech_requirements)
        ]
        prompt_parts.append(
            f"1. For each tender requirement, assess compliance:\n"
            f"Requirements: {json.dumps(reqs)}"
        )

    if body.ambiguous_rules:
        prompt_parts.append(
            f"2. For each ambiguous rule result, re-check semantically:\n"
            f"{json.dumps(body.ambiguous_rules)}"
        )

    prompt_parts.append(
        "3. Give a 2-3 sentence summary, overall confidence 0-1, and up to 5 short recommendations."
    )

    full_prompt = "\n".join(prompt_parts)

    try:
        def _call():
            client = _get_gemini_client()
            return client.models.generate_content(
                model=_GEMINI_MODEL,
                contents=[SYSTEM_PROMPT + "\n\n" + full_prompt],
                config={
                    "temperature": 0.1,
                    "max_output_tokens": 4096,
                    "response_mime_type": "application/json",
                },
            )
        
        # Exponential backoff
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
                log.warning("Gemini API error (attempt %d/%d): %s. Retrying in %s s...", attempt+1, max_retries, e, delay)
                await asyncio.sleep(delay)
                delay *= 2

        raw_text = response.text

        # Parse the structured JSON response
        parsed = json.loads(raw_text.replace("```json", "").replace("```", "").strip())

    except json.JSONDecodeError:
        log.warning("Gemini returned non-JSON response, attempting extraction")
        import re
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
            except json.JSONDecodeError:
                parsed = {"summary": "AI analysis produced unparseable output. Please review manually.", "confidence": 0.0, "rules": [], "requirements": []}
        else:
            parsed = {"summary": "AI analysis produced no structured output. Please review manually.", "confidence": 0.0, "rules": [], "requirements": []}
    except Exception as exc:
        log.error("Gemini compliance analysis failed: %s", exc)
        parsed = {
            "summary": "AI analysis is temporarily unavailable due to high demand. Please rely on manual human review.",
            "confidence": 0.0,
            "rules": [],
            "requirements": [],
            "recommendations": ["Service temporarily unavailable"]
        }

    return {
        "rules": parsed.get("rules", []),
        "requirements": parsed.get("requirements", []),
        "summary": parsed.get("summary", ""),
        "confidence": parsed.get("confidence", 0.0),
        "recommendations": parsed.get("recommendations", []),
        "model": _GEMINI_MODEL,
        "advisory": True,  # Always true — Gemini is advisory only
    }
