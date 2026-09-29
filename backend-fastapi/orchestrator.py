import logging
import traceback
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
import document_processor
import rule_engine as re_mod
import rag_engine
from db import SessionLocal
from models import ComplianceJob, RuleResult, RAGResult
log = logging.getLogger(__name__)
def score_and_verdict(rule_results: list[dict], rag_verdicts: list[dict]) -> tuple[float, str]:
    weights  = {"critical": 40, "warning": 15, "info": 5}
    total    = sum(weights.get(r["severity"], 5) for r in rule_results) or 1
    earned   = sum(weights.get(r["severity"], 5) for r in rule_results if r["passed"])
    rag_delta = 0
    for v in rag_verdicts:
        if v["verdict"] == "compliant":
            rag_delta += 2 * float(v.get("confidence", 0.5))
        elif v["verdict"] == "non_compliant":
            rag_delta -= 2 * float(v.get("confidence", 0.5))
    rag_delta = max(-10, min(10, rag_delta))
    raw_score = (earned / total * 100) + rag_delta
    score     = round(max(0, min(100, raw_score)), 1)
    critical_failed = any(
        (not r["passed"]) and r["severity"] == "critical"
        for r in rule_results
    )
    if critical_failed:
        verdict = "non_compliant"
    elif score >= 85:
        verdict = "compliant"
    else:
        verdict = "needs_review"
    return score, verdict
def build_fix_guide(rule_results: list[dict]) -> list[dict]:
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    failed = [r for r in rule_results if not r["passed"] and r.get("suggestion")]
    failed.sort(key=lambda r: (severity_order.get(r["severity"], 9), r["rule_id"]))
    return [
        {
            "rule_code":  r["rule_id"],
            "rule_name":  r["rule_name"],
            "severity":   r["severity"],
            "suggestion": r["suggestion"],
            "evidence":   r.get("evidence_text", ""),
            "page":       r.get("evidence_page"),
        }
        for r in failed
    ]
def _persist_results(
    db: Session,
    job: ComplianceJob,
    rule_results: list[dict],
    rag_verdicts: list[dict],
    score: float,
    verdict: str,
    extraction: dict,
):
    job.score         = score
    job.verdict       = verdict
    job.status        = "completed"
    job.page_count    = extraction.get("page_count")
    job.char_count    = extraction.get("char_count")
    job.completed_at  = datetime.now(timezone.utc)
    for r in rule_results:
        db.add(RuleResult(
            job_id         = job.id,
            rule_code      = r.get("rule_code", r["rule_id"]),
            rule_name      = r["rule_name"],
            passed         = bool(r["passed"]),
            severity       = r["severity"],
            found_value    = r.get("found_value"),
            expected_value = r.get("expected_value"),
            evidence_text  = r.get("evidence_text"),
            evidence_page  = r.get("evidence_page"),
            suggestion     = r.get("suggestion"),
        ))
    for v in rag_verdicts:
        db.add(RAGResult(
            job_id       = job.id,
            rule_content = v["rule_content"],
            verdict      = v.get("verdict"),
            confidence   = v.get("confidence"),
            reason       = v.get("reason"),
            distance     = v.get("distance"),
        ))

    db.commit()
def run_compliance_check(job_id: int, file_path: str):
    db = SessionLocal()
    try:
        job = db.query(ComplianceJob).filter(ComplianceJob.id == job_id).first()
        if not job:
            log.error("Job %d not found — aborting pipeline.", job_id)
            return

        job.status = "processing"
        db.commit()
        log.info("[job %d] Extracting document: %s", job_id, file_path)
        extraction = document_processor.extract(file_path)
        full_text  = extraction["full_text"]
        pages      = extraction["pages"]

        if not full_text.strip():
            raise ValueError("PDF contains no extractable text after extraction.")
        log.info("[job %d] Running rule engine (%d pages)…", job_id, extraction["page_count"])
        rule_results, rule_summary = re_mod.check_compliance(full_text, pages)
        log.info("[job %d] Rule engine: %d/%d passed.", job_id,
                 rule_summary["rules_passed"], rule_summary["rules_checked"])
        log.info("[job %d] Running RAG pipeline…", job_id)
        try:
            rag_verdicts = rag_engine.rag_compliance_check(full_text)
            log.info("[job %d] RAG returned %d verdicts.", job_id, len(rag_verdicts))
        except Exception as rag_exc:
            log.warning("[job %d] RAG failed (non-fatal): %s", job_id, rag_exc)
            rag_verdicts = []
        score, verdict = score_and_verdict(rule_results, rag_verdicts)
        log.info("[job %d] Score=%.1f  Verdict=%s", job_id, score, verdict)
        fix_guide = build_fix_guide(rule_results)
        _persist_results(db, job, rule_results, rag_verdicts, score, verdict, extraction)
        log.info("[job %d] Persisted. Pipeline complete.", job_id)
    except Exception as exc:
        log.error("[job %d] Pipeline error: %s\n%s", job_id, exc, traceback.format_exc())
        try:
            job = db.query(ComplianceJob).filter(ComplianceJob.id == job_id).first()
            if job:
                job.status           = "failed"
                job.processing_error = str(exc)
                job.completed_at     = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()