import base64
import requests

url = "http://localhost:5000/api/rtsp/recognize"
data = {
    "rtspUrl": "rtsp://admin:888888@10.141.136.8:554/stream1",
    "period": "1st Period (9:00-10:00)",
    "date": "2026-02-24"
}

try:
    # Login first
    login_resp = requests.post("http://localhost:5000/api/login", json={"username": "teacher123", "password": "password", "role": "teacher"})
    if login_resp.status_code == 200:
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Sending recognition request...")
        r = requests.post(url, json=data, headers=headers)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
    else:
        print(f"Login failed: {login_resp.text}")
except Exception as e:
    print(f"Error: {e}")
