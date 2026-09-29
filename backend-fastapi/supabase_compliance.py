import os
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from supabase import create_client, Client
import document_processor
import rule_engine
import rag_engine
import json

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/compliance", tags=["Supabase Compliance"])

# Read Supabase keys from environment or default
SUPABASE_URL = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", ""))
SUPABASE_KEY = os.getenv("SUPABASE_KEY", os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY", ""))

class RunRequest(BaseModel):
    runId: str

def get_supabase(auth_token: str = None) -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase URL and Key must be set in the environment.")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    if auth_token:
        # Pass the user's JWT to authenticate requests
        client.postgrest.auth(auth_token)
        client.storage.postgrest.auth(auth_token)
    return client

def do_compliance_run(run_id: str, auth_token: str = None):
    supabase = get_supabase(auth_token)
    
    # 1. Fetch the run
    run_resp = supabase.table("compliance_runs").select("*").eq("id", run_id).single().execute()
    if not run_resp.data:
        log.error(f"Run {run_id} not found.")
        return
    run_data = run_resp.data
    
    file_path = run_data.get("file_path")
    if not file_path:
        log.error("No file_path in run_data")
        supabase.table("compliance_runs").update({"status": "failed", "error": "No file_path"}).eq("id", run_id).execute()
        return

    # Update status
    supabase.table("compliance_runs").update({"status": "processing"}).eq("id", run_id).execute()

    try:
        # 2. Download PDF
        log.info(f"Downloading {file_path} from Supabase storage")
        storage_resp = supabase.storage.from_("bid_documents").download(file_path)
        
        # Save temp file to uploads directory
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        temp_pdf = os.path.join(uploads_dir, f"_tmp_{run_id}.pdf")
        with open(temp_pdf, "wb") as f:
            f.write(storage_resp)
        
        # 3. Process PDF using document_processor.extract()
        log.info(f"Extracting text from {temp_pdf}")
        extraction = document_processor.extract(temp_pdf)
        text_content = extraction["full_text"]
        pages = extraction["pages"]
        os.remove(temp_pdf)
        
        # 4. Run deterministic rules
        log.info("Running deterministic rules")
        rule_results, rule_summary = rule_engine.check_compliance(text_content, pages)
        
        # 5. RAG / Gemini semantic checks
        log.info("Running RAG semantic checks")
        rag_verdicts = []
        try:
            rag_verdicts = rag_engine.rag_compliance_check(text_content)
        except Exception as e:
            log.warning(f"RAG checks failed: {e}")
        
        # 6. Scoring
        from orchestrator import score_and_verdict
        score, verdict = score_and_verdict(rule_results, rag_verdicts)
        
        # 7. Save results
        # Clear old
        supabase.table("compliance_results").delete().eq("run_id", run_id).execute()
        
        inserts = []
        for i, r in enumerate(rule_results):
            # Match schema of compliance_results
            passed = r["passed"]
            severity = r.get("severity", "info")
            st = "compliant" if passed else ("non_compliant" if severity == "critical" else "needs_attention")
            
            inserts.append({
                "run_id": run_id,
                "position": i,
                "rule_code": r.get("rule_code", r["rule_id"]),
                "rule_name": r["rule_name"],
                "category": r.get("category", "General"),
                "severity": severity,
                "source": "rule_engine",
                "passed": passed,
                "status": st,
                "expected": r.get("expected_value"),
                "found_value": r.get("found_value"),
                "evidence_text": r.get("evidence_text"),
                "evidence_page": r.get("evidence_page"),
                "suggestion": r.get("suggestion")
            })
            
        if inserts:
            supabase.table("compliance_results").insert(inserts).execute()
            
        # 8. Mark run complete
        supabase.table("compliance_runs").update({
            "status": "completed",
            "score": score,
            "rule_score": score,
            "verdict": verdict,
            "completed_at": "now()"
        }).eq("id", run_id).execute()

    except Exception as e:
        log.error(f"Error processing run {run_id}: {e}")
        supabase.table("compliance_runs").update({"status": "failed", "error": str(e)}).eq("id", run_id).execute()

from fastapi import Request

@router.post("/run")
async def trigger_compliance_run(request: Request, body: RunRequest, bg_tasks: BackgroundTasks):
    auth_header = request.headers.get("Authorization", "")
    auth_token = auth_header.replace("Bearer ", "").strip() if "Bearer " in auth_header else None
    
    try:
        get_supabase(auth_token)
    except Exception as e:
        raise HTTPException(500, f"Backend Supabase client not configured: {e}")
    bg_tasks.add_task(do_compliance_run, body.runId, auth_token)
    return {"ok": True, "message": "Compliance run started"}
