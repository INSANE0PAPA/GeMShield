import sys
sys.path.append('.')
from db import SessionLocal
from models import Profile, UserRole
db = SessionLocal()

try:
    profiles = db.query(Profile).all()
    print("Profiles:")
    for p in profiles:
        print(f"ID: {p.id}, Name: {p.full_name}, Type: {p.account_type}")
except Exception as e:
    print("Error querying profiles:", e)
    db.rollback()

try:
    roles = db.query(UserRole).all()
    print("Roles:")
    for r in roles:
        print(f"UserID: {r.user_id}, Role: {r.role}")
except Exception as e:
    print("Error querying user_roles:", e)
