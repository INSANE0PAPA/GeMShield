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
        ALTER TABLE compliance_rule_versions ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'draft';
        ALTER TABLE compliance_rule_versions ADD COLUMN IF NOT EXISTS rules JSON;
        ALTER TABLE compliance_rule_versions ADD COLUMN IF NOT EXISTS change_summary TEXT;
        ALTER TABLE compliance_rule_versions ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
    """))
    # rename version_name to version if it exists
    try:
        conn.execute(text("ALTER TABLE compliance_rule_versions RENAME COLUMN version_name TO version;"))
    except Exception as e:
        pass
    print("compliance_rule_versions table altered successfully.")
