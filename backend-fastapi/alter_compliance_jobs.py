"""
alter_compliance_jobs.py — One-time migration to add missing columns to compliance_jobs table.
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)

ALTERATIONS = [
    "ALTER TABLE compliance_jobs RENAME COLUMN filename TO file_name;",
    "ALTER TABLE compliance_jobs ADD COLUMN IF NOT EXISTS vendor_user_id VARCHAR;",
    "ALTER TABLE compliance_jobs ADD COLUMN IF NOT EXISTS bid_id VARCHAR;",
    "ALTER TABLE compliance_jobs ADD COLUMN IF NOT EXISTS tender_id VARCHAR;",
    "ALTER TABLE compliance_jobs ADD COLUMN IF NOT EXISTS bid_document_id INTEGER;",
    "ALTER TABLE compliance_jobs ADD COLUMN IF NOT EXISTS officer_status VARCHAR DEFAULT 'pending';",
    "ALTER TABLE compliance_jobs ADD COLUMN IF NOT EXISTS officer_note TEXT;",
    "ALTER TABLE compliance_jobs ADD COLUMN IF NOT EXISTS officer_id VARCHAR;",
    "ALTER TABLE compliance_jobs ADD COLUMN IF NOT EXISTS officer_decided_at TIMESTAMP;",
    "CREATE INDEX IF NOT EXISTS idx_compliance_jobs_vendor_user_id ON compliance_jobs (vendor_user_id);",
    "CREATE INDEX IF NOT EXISTS idx_compliance_jobs_bid_id ON compliance_jobs (bid_id);"
]

with engine.begin() as conn:
    print("Altering compliance_jobs table...")
    for stmt in ALTERATIONS:
        try:
            conn.execute(text(stmt))
            print(f"  OK: {stmt[:60]}...")
        except Exception as e:
            print(f"  SKIP: {e}")

    print("\nDone. compliance_jobs schema updated.")
