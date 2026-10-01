from db import SessionLocal
from helpdesk import create_ticket, list_tickets, HelpTicketRequest
from auth import AuthUser
import uuid
import asyncio

async def test_help():
    db = SessionLocal()
    mock_uid = str(uuid.uuid4())
    mock_user = AuthUser(user_id=mock_uid, email="vendor_test@example.com", role="vendor", claims={})

    try:
        print(f"Testing help endpoints with user: {mock_uid}")

        # 1. Create Ticket
        print("\n--- Create Ticket ---")
        ticket_req = HelpTicketRequest(subject="Cannot submit bid", body="I am facing an issue submitting my bid.", category="general")
        res = await create_ticket(body=ticket_req, user=mock_user, db=db)
        print("Create response:", res)
        assert res["status"] == "open"
        assert "ticket_id" in res

        # 2. List Tickets
        print("\n--- List Tickets ---")
        list_res = await list_tickets(user=mock_user, db=db)
        print("List response:", list_res)
        tickets = list_res["tickets"]
        assert len(tickets) == 1
        assert tickets[0]["subject"] == "Cannot submit bid"
        
        print("\nAll Help Ticket DB tests passed successfully!")

    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_help())
