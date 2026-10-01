import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_PUBLISHABLE_KEY")

supabase: Client = create_client(url, key)

users = [
    {"email": "admin@gemshield.demo", "password": "GemShieldAdmin@2026!"},
    {"email": "vendor@gemshield.demo", "password": "GemShieldVendor@2026!"}
]

for user in users:
    print(f"Testing {user['email']}...")
    try:
        response = supabase.auth.sign_in_with_password({
            "email": user["email"],
            "password": user["password"]
        })
        print(f"Success! Session token: {response.session.access_token[:20]}...")
    except Exception as e:
        print(f"Failed: {e}")
