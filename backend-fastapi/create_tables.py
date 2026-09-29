from db import engine
from models import Base, ComplianceJob
from sqlalchemy import ForeignKey
print("Connecting to:", engine.url)
Base.metadata.create_all(bind=engine)
print("Done — tables should now exist")