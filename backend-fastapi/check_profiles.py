from db import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- Profiles ---")
    result = conn.execute(text("SELECT id, account_type FROM profiles;"))
    for row in result:
        print(row)
        
    print("--- UserRoles ---")
    roles = conn.execute(text("SELECT user_id, role FROM user_roles;"))
    for row in roles:
        print(row)
