from fastapi.testclient import TestClient
from main import app
from auth import AuthUser
import uuid

client = TestClient(app)

def test_notification_endpoints():
    print("Testing unauthenticated GET...")
    resp = client.get("/api/notifications")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    print("Unauthenticated GET blocked (401)")
    
    print("Testing unauthenticated read-all...")
    resp = client.put("/api/notifications/read-all")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    print("Unauthenticated read-all blocked (401)")

if __name__ == "__main__":
    test_notification_endpoints()
