from db import SessionLocal
from routers.notifications import list_notifications, mark_all_read, mark_read
from auth import AuthUser
import uuid

db = SessionLocal()
mock_user = AuthUser(user_id=str(uuid.uuid4()), email="test@test.com", role="vendor", claims={})

try:
    print("Testing list_notifications...")
    logs = list_notifications(skip=0, limit=50, unread_only=False, user=mock_user, db=db)
    print("Total Logs:", logs['total'])
    print("Unread count:", logs['unread_count'])

    print("\nTesting mark_all_read...")
    res = mark_all_read(user=mock_user, db=db)
    print("Marked read count:", res)

    print("\nAll successful!")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
