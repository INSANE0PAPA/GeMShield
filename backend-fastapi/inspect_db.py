from sqlalchemy import text
from db import engine

def main():
    try:
        conn = engine.connect()
        # List tables
        res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [r[0] for r in res.fetchall()]
        print("Tables:", tables)

        if "bids" in tables:
            res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bids'"))
            columns = [f"{r[0]} ({r[1]})" for r in res.fetchall()]
            print("bids columns:", columns)
            
        if "saved_tenders" in tables:
            res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'saved_tenders'"))
            columns = [f"{r[0]} ({r[1]})" for r in res.fetchall()]
            print("saved_tenders columns:", columns)
        else:
            print("saved_tenders NOT FOUND")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
