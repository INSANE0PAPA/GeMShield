import os
from dotenv import load_dotenv

load_dotenv()

import logging
from sqlalchemy import create_engine, text
from db import engine
from models import Base
from google import genai
from google.genai import types

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("InitTest")

def run_tests():
    # 1. Validate DATABASE_URL & pgvector
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        log.error("DATABASE_URL is missing!")
        return False
        
    try:
        log.info(f"Connecting to database...")
        with engine.connect() as conn:
            # Enable extensions
            log.info("Enabling pgvector and uuid-ossp...")
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS "vector";'))
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
            conn.commit()
            
            # Check version
            version = conn.execute(text("SELECT version();")).scalar()
            log.info(f"Connected to: {version}")
            
    except Exception as e:
        log.error(f"Database connection or extension setup failed: {e}")
        return False

    # 3. Create schema
    try:
        log.info("Recreating database schema...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        log.info("Schema creation successful.")
    except Exception as e:
        log.error(f"Schema creation failed: {e}")
        return False

    # 4 & 5. Validate GEMINI_API_KEY and run test
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        log.error("GEMINI_API_KEY is missing!")
        return False
        
    try:
        log.info("Testing Gemini connection...")
        client = genai.Client(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        
        response = client.models.generate_content(
            model=model_name,
            contents="Say 'Connection Successful' if you can read this."
        )
        log.info(f"Gemini Response: {response.text}")
    except Exception as e:
        log.error(f"Gemini test failed: {e}")
        return False
        
    log.info("All tests passed successfully!")
    return True

if __name__ == "__main__":
    run_tests()
