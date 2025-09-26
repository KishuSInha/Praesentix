#!/usr/bin/env python3
"""
Test enhanced attendance marking functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import mark_enhanced_attendance, DATABASE_FOLDER, setup_enhanced_attendance_database
import sqlite3
from datetime import datetime

def test_enhanced_attendance():
    print("🧪 Testing Enhanced Attendance System")
    print("="*60)
    print(f"Database folder: {DATABASE_FOLDER}")
    
    # Test marking attendance
    print("\n📝 Testing attendance marking...")
    
    # Test data
    test_students = [
        ("Utkarsh Sinha", "106", "Happy", 85.0, 92.0, True),
        ("Avijit Chowdhary", "101", "Neutral", 78.0, 88.0, True),
        ("Saanjh Nayak", "102", "Surprised", 82.0, 90.0, True)
    ]
    
    for name, student_id, emotion, liveness, recognition, is_live in test_students:
        print(f"\n  Testing: {name} (ID: {student_id})")
        
        try:
            result = mark_enhanced_attendance(name, student_id, emotion, liveness, recognition, is_live)
            if result:
                print(f"  ✅ Attendance marked successfully")
            else:
                print(f"  ⚠️  Attendance already marked or failed")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    # Check database contents
    print("\n📊 Checking database contents...")
    try:
        db_path = os.path.join(DATABASE_FOLDER, "enhanced_attendance.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        today = datetime.now().strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT name, student_id, time, emotion, recognition_confidence, spoofing_status
            FROM enhanced_attendance
            WHERE date = ?
            ORDER BY time DESC
        """, (today,))
        
        records = cursor.fetchall()
        if records:
            print(f"\n  Found {len(records)} attendance records for today:")
            print("  " + "-"*80)
            print("  Name                 | ID  | Time     | Emotion    | Confidence | Status")
            print("  " + "-"*80)
            for record in records:
                name, student_id, time, emotion, confidence, status = record
                print(f"  {name:<20} | {student_id:<3} | {time:<8} | {emotion:<10} | {confidence:<10.1f} | {status}")
        else:
            print("  No attendance records found for today")
        
        conn.close()
        
    except Exception as e:
        print(f"  ❌ Error reading database: {e}")
    
    print("\n" + "="*60)
    print("✅ Test completed!")

if __name__ == "__main__":
    test_enhanced_attendance()
