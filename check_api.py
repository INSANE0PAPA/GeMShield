import requests

def test_api():
    # 1. Login
    url = "http://localhost:8000" # default FastAPI
    try:
        r = requests.get(f"{url}/")
        print("API is running:", r.json())
    except Exception as e:
        print("API not running on 8000:", e)
        return
        
    # We can't easily login via Supabase from python script without API key, 
    # but wait! We can bypass auth for testing, or just use `routers.verification._serialize_run` directly!

    import sys
    sys.path.append("D:/Gem-Shield Master/backend-fastapi")
    from db import SessionLocal
    from models import ComplianceJob, RuleResult, Tender
    from routers.verification import _serialize_run

    db = SessionLocal()
    j = db.query(ComplianceJob).filter(ComplianceJob.id == 3).first()
    if j:
        tender = db.query(Tender).filter(Tender.id == j.tender_id).first() if j.tender_id else None
        rule_results = db.query(RuleResult).filter(RuleResult.job_id == j.id).all()
        # This will use the NEW _serialize_run code
        out = _serialize_run(j, tender, rule_results)
        print("Serialize test:")
        print("ai_summary in out?", "ai_summary" in out)
        
        # Test full get_verification_run manually
        base = out
        base["rule_results"] = [
            {
                "id": r.id,
                "rule_code": r.rule_code,
                "rule_name": r.rule_name,
                "passed": r.passed,
                "severity": r.severity,
                "status": "compliant" if r.passed else ("missing" if not r.found_value else ("non_compliant" if r.severity == "critical" else "needs_attention")),
                "found_value": r.found_value,
                "expected": r.expected_value,
            } for r in rule_results
        ]
        
        print("Status in first rule result?", "status" in base["rule_results"][0])
        print("Expected in first rule result?", "expected" in base["rule_results"][0])
        print(base["rule_results"][0])

if __name__ == "__main__":
    test_api()
