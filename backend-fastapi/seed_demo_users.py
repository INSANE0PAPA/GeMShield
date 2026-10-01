import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
from sqlalchemy import text
sys.path.append('.')
from db import SessionLocal
from models import Profile, UserRole
import uuid
import datetime

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_KEY")
if not url or not key:
    print("Missing Supabase URL or Key")
    sys.exit(1)

supabase: Client = create_client(url, key)

db = SessionLocal()

users_to_seed = [
    {
        "email": "admin@gemshield.demo",
        "password": "GemShieldAdmin@2026!",
        "role": "admin",
        "account_type": "officer",
        "full_name": "Demo Admin"
    },
    {
        "email": "vendor@gemshield.demo",
        "password": "GemShieldVendor@2026!",
        "role": "vendor",
        "account_type": "vendor",
        "full_name": "Demo Vendor"
    }
]

for u in users_to_seed:
    user_id = None
    try:
        # Try to sign in to see if they exist
        res = supabase.auth.sign_in_with_password({"email": u["email"], "password": u["password"]})
        user_id = res.user.id
        print(f"Found existing user {u['email']} in Supabase Auth (ID: {user_id})")
    except Exception as e:
        print(f"Sign in failed for {u['email']}, attempting sign up: {e}")
        try:
            res = supabase.auth.sign_up({"email": u["email"], "password": u["password"]})
            if res.user:
                user_id = res.user.id
                print(f"Created user {u['email']} in Supabase Auth (ID: {user_id})")
            else:
                print(f"Sign up returned no user for {u['email']}")
        except Exception as e2:
            print(f"Sign up also failed for {u['email']}: {e2}")

    if user_id:
        # Let's use raw SQL for exact safety with ON CONFLICT DO NOTHING
        try:
            db.execute(
                text("""
                INSERT INTO profiles (id, account_type, full_name, approval_status)
                VALUES (:id, :acct, :name, 'approved')
                ON CONFLICT (id) DO UPDATE SET 
                    account_type = EXCLUDED.account_type,
                    full_name = EXCLUDED.full_name,
                    approval_status = 'approved'
                """),
                {"id": user_id, "acct": u["account_type"], "name": u["full_name"]}
            )
            db.commit()
            print(f"Upserted Profile for {u['email']} in Neon DB")
        except Exception as e:
            db.rollback()
            print(f"Error upserting Profile for {u['email']}: {e}")

        # Idempotent DB insertion for UserRole
        # UserRole table might not have ON CONFLICT constraint on user_id if it's not unique, wait.
        # UserRole schema: id (String, pk), user_id (String), role (String), granted_at
        # Let's check if role exists.
        try:
            existing_role = db.query(UserRole).filter(UserRole.user_id == user_id, UserRole.role == u["role"]).first()
            if not existing_role:
                new_role = UserRole(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    role=u["role"],
                    granted_at=datetime.datetime.utcnow()
                )
                db.add(new_role)
                db.commit()
                print(f"Created Role '{u['role']}' for {u['email']} in Neon DB")
            else:
                print(f"Role '{u['role']}' already exists for {u['email']} in Neon DB")
        except Exception as e:
            db.rollback()
            print(f"Error checking/creating role for {u['email']}: {e}")
