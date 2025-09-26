import requests
import base64

# Test the API endpoint
url = "http://localhost:5001/api/recognize"

# Create a test payload (empty image for testing)
test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
test_payload = {
    "image": test_image
}

try:
    response = requests.post(url, json=test_payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {str(e)}")
