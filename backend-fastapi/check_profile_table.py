from db import engine
from sqlalchemy import inspect

inspector = inspect(engine)
columns = inspector.get_columns('profiles')
for c in columns:
    print(c['name'], c['type'])
