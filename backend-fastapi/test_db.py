from sqlalchemy import text
from db import engine

def main():
    try:
        conn = engine.connect()
        conn.execute(text("SELECT 1"))
        print("Neon connection: PASS")
        
        res1 = conn.execute(text("SELECT to_regclass('public.rulebook_chunks')")).scalar()
        if res1:
            print("Database schema: PASS")
        else:
            print("Database schema: FAIL")
            
        res2 = conn.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'")).scalar()
        if res2 == 'vector':
            print("pgvector: PASS")
        else:
            print("pgvector: FAIL")
            
        conn.close()
    except Exception as e:
        print(f"FAIL: {e}")

if __name__ == '__main__':
    main()
