from db import SessionLocal
from routers.reports import get_overview, get_compliance_insights, get_vendor_performance, get_flag_analysis, get_trends
from auth import AuthUser

db = SessionLocal()
mock_user = AuthUser(user_id="test", email="test@test.com", role="admin", claims={})

try:
    print("Testing get_overview...")
    o = get_overview(user=mock_user, db=db)
    print("Overview:", o)

    print("\nTesting get_compliance_insights...")
    c = get_compliance_insights(user=mock_user, db=db)
    print("Compliance:", c)

    print("\nTesting get_vendor_performance...")
    v = get_vendor_performance(user=mock_user, db=db)
    print("Vendor:", v)

    print("\nTesting get_flag_analysis...")
    f = get_flag_analysis(user=mock_user, db=db)
    print("Flags:", f)

    print("\nTesting get_trends...")
    t = get_trends(user=mock_user, db=db)
    print("Trends:", t)

    print("\nAll successful!")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
