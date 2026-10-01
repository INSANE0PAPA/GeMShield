import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL found.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
with engine.begin() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS human_review_cases (
            id VARCHAR PRIMARY KEY,
            run_id INTEGER NOT NULL REFERENCES compliance_jobs(id),
            bid_id VARCHAR REFERENCES bids(id),
            tender_id VARCHAR REFERENCES tenders(id),
            vendor_user_id VARCHAR NOT NULL,
            status VARCHAR DEFAULT 'pending',
            priority VARCHAR DEFAULT 'medium',
            trigger_reason TEXT NOT NULL,
            resolution VARCHAR,
            justification TEXT,
            assigned_to VARCHAR,
            resolved_by VARCHAR,
            resolved_at TIMESTAMP WITH TIME ZONE,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS ix_human_review_cases_run_id ON human_review_cases (run_id);
        CREATE INDEX IF NOT EXISTS ix_human_review_cases_vendor_user_id ON human_review_cases (vendor_user_id);
    """))
    print("human_review_cases table created successfully.")
