from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_endpoints_unauthenticated():
    endpoints = [
        "/api/reports/overview",
        "/api/reports/compliance",
        "/api/reports/vendor-performance",
        "/api/reports/flags",
        "/api/reports/trends"
    ]
    for ep in endpoints:
        resp = client.get(ep)
        assert resp.status_code == 401, f"{ep} did not return 401, returned {resp.status_code}"
        print(f"{ep} properly returned 401 Unauthenticated")

if __name__ == "__main__":
    test_endpoints_unauthenticated()
    print("All tests passed.")
