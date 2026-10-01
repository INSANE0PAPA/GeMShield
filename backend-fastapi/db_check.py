from db import SessionLocal
from models import Bid, UserRole, Vendor

db = SessionLocal()
print("Bids:", db.query(Bid).count())
print("Vendors:", db.query(Vendor).count())
print("Roles:", [(r.user_id, r.role) for r in db.query(UserRole).all()])
db.close()
