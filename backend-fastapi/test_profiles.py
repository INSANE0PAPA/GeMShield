from fastapi.testclient import TestClient
from main import app
from auth import AuthUser
import uuid
import json

client = TestClient(app)

# Use dependency override to mock user
mock_uid = str(uuid.uuid4())
mock_user = AuthUser(user_id=mock_uid, email="test_vendor@example.com", role="vendor", claims={})

def override_get_current_user():
    return mock_user

from auth import get_current_user
app.dependency_overrides[get_current_user] = override_get_current_user

def test_profiles():
    print(f"Testing with user: {mock_uid}")

    # 1. GET /api/profiles/me (should auto-create profile)
    print("\n--- GET /api/profiles/me ---")
    res1 = client.get("/api/profiles/me")
    assert res1.status_code == 200, res1.text
    profile = res1.json()
    print("Created profile:", profile)
    assert profile["full_name"] == "test_vendor", "Auto-created full_name should match email split"
    
    # 2. PUT /api/profiles/me (Update settings and basic info)
    print("\n--- PUT /api/profiles/me ---")
    update_payload = {
        "full_name": "Test Vendor Updated",
        "organisation": "Vendor Corp",
        "theme": "dark",
        "language": "hi",
        "density": "compact",
        "timezone": "UTC",
        "notification_prefs": {"system": True, "marketing": False}
    }
    res2 = client.put("/api/profiles/me", json=update_payload)
    assert res2.status_code == 200, res2.text
    updated_profile = res2.json()
    print("Updated profile:", updated_profile)
    assert updated_profile["full_name"] == "Test Vendor Updated"
    assert updated_profile["theme"] == "dark"
    assert updated_profile["language"] == "hi"
    assert updated_profile["timezone"] == "UTC"
    assert updated_profile["notification_prefs"]["system"] == True

    # 3. GET /api/profiles/export
    print("\n--- GET /api/profiles/export ---")
    res3 = client.get("/api/profiles/export")
    assert res3.status_code == 200, res3.text
    export_data = res3.json()
    print("Export data keys:", list(export_data.keys()))
    assert "exported_at" in export_data
    assert "profile" in export_data
    assert export_data["profile"]["id"] == mock_uid
    assert export_data["profile"]["theme"] == "dark"
    assert "vendors" in export_data
    assert "bids" in export_data
    assert "compliance_runs" in export_data
    assert "notifications" in export_data
    assert "activity" in export_data

    print("\nAll Profile tests passed successfully!")

if __name__ == "__main__":
    test_profiles()
