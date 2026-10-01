import os
from fastapi.testclient import TestClient
from supabase import create_client
from main import app
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_PUBLISHABLE_KEY')

supabase = create_client(url, key)
res = supabase.auth.sign_in_with_password({"email": "admin@gemshield.demo", "password": "GemShieldAdmin@2026!"})
token = res.session.access_token

client = TestClient(app)

print("--- Testing valid token ---")
response = client.get("/api/profiles/me", headers={"Authorization": f"Bearer {token}"})
print("Valid token response:", response.status_code)
if response.status_code == 200:
    print("Valid token success!")
else:
    print("Valid token failed:", response.text)

print("--- Testing invalid token ---")
response = client.get("/api/profiles/me", headers={"Authorization": "Bearer fake_invalid_token.abc.123"})
print("Invalid token response:", response.status_code)
if response.status_code == 401:
    print("Invalid token rejected successfully!")
else:
    print("Invalid token failed:", response.text)

print("--- Testing missing token ---")
response = client.get("/api/profiles/me")
print("Missing token response:", response.status_code)
if response.status_code == 401 or response.status_code == 403:
    print("Missing token rejected successfully!")
else:
    print("Missing token failed:", response.text)
