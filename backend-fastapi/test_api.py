import httpx

def test_api():
    try:
        response = httpx.get("http://127.0.0.1:8000/api/tenders/")
        print("Tenders API Status:", response.status_code)
        print("Tenders API Response:", response.json())
        
        response = httpx.get("http://127.0.0.1:8000/api/bids/")
        print("Bids API Status:", response.status_code)
        print("Bids API Response:", response.json())
        
    except Exception as e:
        print("API test failed:", e)

if __name__ == "__main__":
    test_api()
