"""
alter_bids.py — One-time migration to add new columns to the bids and
bid_documents tables so they match the extended ORM models.
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)

BIDS_ALTERATIONS = [
    "ALTER TABLE bids ADD COLUMN IF NOT EXISTS vendor_user_id VARCHAR;",
    "ALTER TABLE bids ADD COLUMN IF NOT EXISTS application JSONB;",
    "ALTER TABLE bids ADD COLUMN IF NOT EXISTS quoted_amount DOUBLE PRECISION;",
    "ALTER TABLE bids ADD COLUMN IF NOT EXISTS notes TEXT;",
    "ALTER TABLE bids ADD COLUMN IF NOT EXISTS stage VARCHAR DEFAULT 'basic';",
    "ALTER TABLE bids ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;",
    # Backfill vendor_user_id from vendor_id where possible
    "CREATE INDEX IF NOT EXISTS idx_bids_vendor_user_id ON bids (vendor_user_id);",
]

BID_DOCS_ALTERATIONS = [
    "ALTER TABLE bid_documents ADD COLUMN IF NOT EXISTS doc_type VARCHAR;",
    "ALTER TABLE bid_documents ADD COLUMN IF NOT EXISTS name VARCHAR;",
    "ALTER TABLE bid_documents ADD COLUMN IF NOT EXISTS file_path VARCHAR;",
    "ALTER TABLE bid_documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR;",
    "ALTER TABLE bid_documents ADD COLUMN IF NOT EXISTS size_bytes INTEGER;",
    # Migrate existing data from old columns
    "UPDATE bid_documents SET name = filename WHERE name IS NULL AND filename IS NOT NULL;",
    "UPDATE bid_documents SET file_path = stored_path WHERE file_path IS NULL AND stored_path IS NOT NULL;",
]

with engine.begin() as conn:
    print("Altering bids table...")
    for stmt in BIDS_ALTERATIONS:
        try:
            conn.execute(text(stmt))
            print(f"  OK: {stmt[:60]}...")
        except Exception as e:
            print(f"  SKIP: {e}")

    print("\nAltering bid_documents table...")
    for stmt in BID_DOCS_ALTERATIONS:
        try:
            conn.execute(text(stmt))
            print(f"  OK: {stmt[:60]}...")
        except Exception as e:
            print(f"  SKIP: {e}")

    print("\nDone. Bids schema updated.")
