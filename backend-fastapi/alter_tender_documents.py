import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)
with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE tender_documents ADD COLUMN name VARCHAR;"))
        conn.execute(text("ALTER TABLE tender_documents ADD COLUMN file_path VARCHAR;"))
        conn.execute(text("ALTER TABLE tender_documents ADD COLUMN mime_type VARCHAR;"))
        conn.execute(text("ALTER TABLE tender_documents ADD COLUMN size_bytes INTEGER;"))
        conn.execute(text("ALTER TABLE tender_documents ADD COLUMN sha256 VARCHAR;"))
        
        # Optionally migrate existing data
        conn.execute(text("UPDATE tender_documents SET name = filename WHERE name IS NULL;"))
        conn.execute(text("UPDATE tender_documents SET file_path = stored_path WHERE file_path IS NULL;"))
        
        # Drop old columns
        conn.execute(text("ALTER TABLE tender_documents DROP COLUMN filename;"))
        conn.execute(text("ALTER TABLE tender_documents DROP COLUMN stored_path;"))
        
        # Set constraints
        conn.execute(text("ALTER TABLE tender_documents ALTER COLUMN name SET NOT NULL;"))
        print("Successfully altered tender_documents.")
    except Exception as e:
        print(f"Error altering table: {e}")
