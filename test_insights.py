import sys
sys.path.append("D:/Gem-Shield Master/backend-fastapi")
from db import SessionLocal
from models import ComplianceJob
from routers.verification import generate_insights

# Mocking FastAPI user
class MockUser:
    id = "1"
    role = "officer"

try:
    db = SessionLocal()
    j = db.query(ComplianceJob).filter(ComplianceJob.id == 3).first()
    if j:
        j.ai_summary = None # clear it to force regen
        db.commit()
        res = generate_insights(run_id=3, user=MockUser(), db=db)
        print("Generated Insights Result:", res)
        
        # Now fetch the job again to see what was saved
        db.refresh(j)
        print("AI Summary:", j.ai_summary)
        print("AI Recommendations:", j.ai_recommendations)
    else:
        print("Job 3 not found.")
except Exception as e:
    import traceback
    traceback.print_exc()
