#!/usr/bin/env python3
"""
Test script for period attendance API endpoints
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5001/api"

def test_api_endpoints():
    """Test the period attendance API endpoints"""
    print("🧪 Testing Period Attendance API Endpoints")
    print("=" * 50)
    
    # Test getting period attendance
    print("1. Testing GET /period-attendance...")
    try:
        response = requests.get(f"{BASE_URL}/period-attendance")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API response successful: {data['total']} records found")
        else:
            print(f"❌ API error: {response.status_code}")
    except Exception as e:
        print(f"❌ Connection error: {e}")
        print("   Make sure the Flask server is running on port 5001")
    
    # Test getting attendance summary
    print("\n2. Testing GET /period-attendance/summary...")
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/period-attendance/summary?date={today}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Summary API successful: {len(data['data'])} periods found")
        else:
            print(f"❌ Summary API error: {response.status_code}")
    except Exception as e:
        print(f"❌ Connection error: {e}")
    
    # Test CSV export
    print("\n3. Testing GET /period-attendance/export...")
    try:
        response = requests.get(f"{BASE_URL}/period-attendance/export")
        if response.status_code == 200:
            print(f"✅ CSV export successful: {len(response.content)} bytes")
        else:
            print(f"❌ CSV export error: {response.status_code}")
    except Exception as e:
        print(f"❌ Connection error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 API endpoint testing completed!")
    print("Note: Start the Flask server with 'python app.py' to test API endpoints")

if __name__ == "__main__":
    test_api_endpoints()