from db import SessionLocal
from routers.audit import list_audit_logs, get_audit_entry, create_audit_entry, AuditEntry
from auth import AuthUser
import uuid

db = SessionLocal()
mock_user = AuthUser(user_id=str(uuid.uuid4()), email="test@test.com", role="admin", claims={})

try:
    print("Testing list_audit_logs...")
    logs = list_audit_logs(skip=0, limit=50, user=mock_user, db=db)
    print("Total Logs:", logs['total'])

    print("\nTesting create_audit_entry...")
    entry = AuditEntry(action="test_action", entity_type="Test", summary="Test log")
    res = create_audit_entry(body=entry, user=mock_user, db=db)
    print("Created:", res)
    
    print("\nTesting get_audit_entry...")
    single = get_audit_entry(audit_id=res['id'], user=mock_user, db=db)
    print("Fetched:", single['id'])

    print("\nAll successful!")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
