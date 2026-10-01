from fastapi.testclient import TestClient
from main import app
from auth import AuthUser

client = TestClient(app)

def test_audit_endpoints():
    print("Testing unauthenticated access...")
    resp = client.get("/api/audit")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    print("Unauthenticated access blocked (401)")

if __name__ == "__main__":
    test_audit_endpoints()
