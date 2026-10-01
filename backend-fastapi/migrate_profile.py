from db import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN designation VARCHAR;"))
    except Exception as e: print(e)
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN ministry_department VARCHAR;"))
    except Exception as e: print(e)
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN employee_official_id VARCHAR;"))
    except Exception as e: print(e)
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN office_location VARCHAR;"))
    except Exception as e: print(e)
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN timezone VARCHAR DEFAULT 'Asia/Kolkata';"))
    except Exception as e: print(e)
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN language VARCHAR DEFAULT 'en';"))
    except Exception as e: print(e)
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN theme VARCHAR DEFAULT 'system';"))
    except Exception as e: print(e)
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN density VARCHAR DEFAULT 'default';"))
    except Exception as e: print(e)
    try:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN notification_prefs JSON;"))
    except Exception as e: print(e)
    conn.commit()
    print("Migration complete")
