from db import SessionLocal
from routers.profiles import get_my_profile, update_my_profile, export_my_data, ProfileUpdate
from auth import AuthUser
import uuid

db = SessionLocal()
mock_uid = str(uuid.uuid4())
mock_user = AuthUser(user_id=mock_uid, email="test_vendor2@example.com", role="vendor", claims={})

try:
    print(f"Testing with user: {mock_uid}")

    # 1. GET /api/profiles/me (should auto-create profile)
    print("\n--- GET /api/profiles/me ---")
    profile = get_my_profile(user=mock_user, db=db)
    print("Created profile:", profile)
    assert profile["full_name"] == "test_vendor2", "Auto-created full_name should match email split"
    
    # 2. PUT /api/profiles/me (Update settings and basic info)
    print("\n--- PUT /api/profiles/me ---")
    update_payload = ProfileUpdate(
        full_name="Test Vendor Updated 2",
        organisation="Vendor Corp 2",
        theme="dark",
        language="hi",
        density="compact",
        timezone="UTC",
        notification_prefs={"system": True, "marketing": False}
    )
    updated_profile = update_my_profile(body=update_payload, user=mock_user, db=db)
    print("Updated profile:", updated_profile)
    assert updated_profile["full_name"] == "Test Vendor Updated 2"
    assert updated_profile["theme"] == "dark"
    assert updated_profile["language"] == "hi"
    assert updated_profile["timezone"] == "UTC"
    assert updated_profile["notification_prefs"]["system"] == True

    # 3. GET /api/profiles/export
    print("\n--- GET /api/profiles/export ---")
    export_data = export_my_data(user=mock_user, db=db)
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

    print("\nAll Profile DB tests passed successfully!")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
