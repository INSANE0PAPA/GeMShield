import os
import json
import re
import textwrap
import logging
from pathlib import Path
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from db import engine
from models import RulebookChunk
load_dotenv()
log = logging.getLogger(__name__)
_embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
_gemini_client = None
_GEMINI_MODEL  = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
def _get_gemini():
    global _gemini_client
    if _gemini_client is None:
        try:
            from google import genai
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY not set in environment / .env")
            _gemini_client = genai.Client(api_key=api_key)
            log.info("Gemini client initialised with model %s (google-genai SDK)", _GEMINI_MODEL)
        except ImportError:
            raise RuntimeError(
                "google-genai package not installed. "
                "Run: pip install google-genai"
            )
    return _gemini_client
def retrieve_rules(document_text: str, top_k: int = 5) -> list[dict]:
    query_text      = document_text[:2000]
    query_embedding = _embedding_model.encode(query_text).tolist()
    with Session(engine) as session:
        rows = (
            session.query(
                RulebookChunk.id,
                RulebookChunk.content,
                RulebookChunk.document_name,
                RulebookChunk.page_number,
                RulebookChunk.tender_id,
                RulebookChunk.clause_section,
                RulebookChunk.embedding.l2_distance(query_embedding).label("distance"),
            )
            .order_by(RulebookChunk.embedding.l2_distance(query_embedding))
            .limit(top_k)
            .all()
        )
    return [
        {
            "id": r.id, 
            "content": r.content, 
            "distance": float(r.distance),
            "document_name": r.document_name,
            "page_number": r.page_number,
            "tender_id": r.tender_id,
            "clause_section": r.clause_section
        }
        for r in rows
    ]
_SYSTEM_PROMPT = textwrap.dedent("""
You are a GeM (Government e-Marketplace) compliance expert.
You are given:
  - A list of GeM compliance rules (numbered)
  - An excerpt from a bid document

For EACH rule, you must determine:
  verdict:    "compliant" | "non_compliant" | "cannot_determine"
  confidence: float from 0.0 to 1.0 (how certain you are)
  reason:     one concise sentence explaining your verdict

Return ONLY a JSON array. No markdown, no explanation outside the JSON.

Format:
[
  {
    "rule_index": 1,
    "verdict": "compliant",
    "confidence": 0.92,
    "reason": "A valid GSTIN (22ABCDE1234F1Z5) was found in the document."
  },
  ...
]
""").strip()
def _build_prompt(rules: list[dict], document_excerpt: str) -> str:
    rules_text = "\n".join(
        f"{i+1}. {r['content']}" for i, r in enumerate(rules)
    )
    doc_excerpt = document_excerpt[:3000]   # keep prompt under token budget
    return (
        f"RULES:\n{rules_text}\n\n"
        f"DOCUMENT EXCERPT:\n{doc_excerpt}\n\n"
        f"Respond with a JSON array as instructed."
    )
def _parse_llm_response(response_text: str, rules: list[dict]) -> list[dict]:
    clean = re.sub(r"```(?:json)?|```", "", response_text).strip()
    try:
        verdicts = json.loads(clean)
    except json.JSONDecodeError:
        match = re.search(r"\[.*\]", clean, re.DOTALL)
        if match:
            try:
                verdicts = json.loads(match.group(0))
            except json.JSONDecodeError:
                verdicts = []
        else:
            verdicts = []
    results = []
    for item in verdicts:
        idx = item.get("rule_index", 1) - 1     
        if 0 <= idx < len(rules):
            results.append({
                "rule_content": rules[idx]["content"],
                "distance":     rules[idx]["distance"],
                "verdict":      item.get("verdict", "cannot_determine"),
                "confidence":   float(item.get("confidence", 0.5)),
                "reason":       item.get("reason", ""),
            })
    if not results:
        for r in rules:
            results.append({
                "rule_content": r["content"],
                "distance":     r["distance"],
                "verdict":      "cannot_determine",
                "confidence":   0.0,
                "reason":       "LLM response could not be parsed.",
            })
    return results
def rag_compliance_check(document_text: str, top_k: int = 5) -> list[dict]:
    rules = retrieve_rules(document_text, top_k=top_k)
    if not rules:
        log.warning("No rules found in rulebook_chunks — run embed_rules.py first.")
        return []
    try:
        client  = _get_gemini()
        prompt  = _build_prompt(rules, document_text)
        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=[_SYSTEM_PROMPT + "\n\n" + prompt],
            config={
                "temperature": 0.1,
                "max_output_tokens": 1024,
                "response_mime_type": "application/json",
            },
        )
        raw_text = response.text
    except Exception as exc:
        log.error("Gemini call failed: %s", exc)
        return [
            {
                "rule_content": r["content"],
                "distance":     r["distance"],
                "verdict":      "cannot_determine",
                "confidence":   0.0,
                "reason":       f"LLM grounding unavailable: {exc}",
            }
            for r in rules
        ]
    return _parse_llm_response(raw_text, rules)
def find_relevant_rules(document_text: str, top_k: int = 3) -> list[dict]:
    return retrieve_rules(document_text, top_k=top_k)
if __name__ == "__main__":
    sample = (
        "The vendor has not provided a valid GST identification number in the bid. "
        "PAN: ABCDE1234F. EMD of Rs. 50,000 enclosed. Bid validity: 120 days."
    )
    print("=== Retrieval only ===")
    for r in retrieve_rules(sample):
        print(f"  [dist={r['distance']:.4f}] {r['content']}")

    print("\n=== Full RAG (LLM grounded) ===")
    verdicts = rag_compliance_check(sample)
    for v in verdicts:
        print(f"  [{v['verdict'].upper()}] conf={v['confidence']:.2f}  {v['reason']}")
        print(f"    rule: {v['rule_content'][:80]}")
