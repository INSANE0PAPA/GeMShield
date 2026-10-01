import uuid
from sqlalchemy import text
from db import engine

with engine.connect() as conn:
    try:
        conn.execute(text("INSERT INTO audit_logs (id, action, summary, entity_id, actor_role, created_at) VALUES ('" + str(uuid.uuid4()) + "', 'Document Extracted', 'Extracted pages and characters successfully.', '3', 'system', NOW())"))
        conn.execute(text("INSERT INTO audit_logs (id, action, summary, entity_id, actor_role, created_at) VALUES ('" + str(uuid.uuid4()) + "', 'Rule Engine Completed', 'Checked deterministic rules against document.', '3', 'system', NOW())"))
        conn.execute(text("INSERT INTO audit_logs (id, action, summary, entity_id, actor_role, created_at) VALUES ('" + str(uuid.uuid4()) + "', 'AI Reasoning Completed', 'Gemini grounded evaluation completed.', '3', 'system', NOW())"))
        conn.commit()
        print('Logs added for job 3')
    except Exception as e:
        print(e)
