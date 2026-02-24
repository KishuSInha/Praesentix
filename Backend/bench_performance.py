import requests
import base64
import time
import json
import sys
import os

# Configuration
API_URL = "http://localhost:8080/api/recognize"
TOKEN = "YOUR_JWT_TOKEN_HERE" # Need to get this from a login attempt
IMAGE_PATH = "test_classroom.jpg" # Dummy or real image

def benchmark():
    if not os.path.exists(IMAGE_PATH):
        print(f"Error: {IMAGE_PATH} not found. Please provide a test image.")
        return

    with open(IMAGE_PATH, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode('utf-8')

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "period": "Period 1",
        "image": img_b64,
        "date": "2026-02-23"
    }

    print("Sending recognition request...")
    start_time = time.time()
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        end_time = time.time()
        
        if response.status_code == 200:
            result = response.json()
            print(f"Success! Time taken: {end_time - start_time:.2f} seconds")
            print(f"Detected: {len(result.get('detectedFaces', []))} faces")
        else:
            print(f"Failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    benchmark()
