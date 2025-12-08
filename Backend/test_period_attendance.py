#!/usr/bin/env python3
"""
Test script for period attendance system
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import period_attendance as period_db
from datetime import datetime

def test_period_attendance():
    """Test the period attendance system"""
    print("🧪 Testing Period Attendance System")
    print("=" * 50)
    
    # Test database setup
    print("1. Setting up period attendance database...")
    try:
        conn = period_db.setup_period_attendance_database()
        conn.close()
        print("✅ Database setup successful")
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        return False
    
    # Test marking attendance
    print("\n2. Testing attendance marking...")
    test_date = datetime.now().strftime("%Y-%m-%d")
    test_period = "1st Period (9:00-10:00)"
    
    # Test data
    test_students = [
        ("101", "John Doe"),
        ("102", "Jane Smith"),
        ("103", "Bob Johnson")
    ]
    
    for student_id, name in test_students:
        try:
            success, message = period_db.mark_period_attendance(
                student_id, name, test_date, test_period, 
                emotion="Happy", liveness_confidence=85.0, 
                recognition_confidence=92.0, is_live=True
            )
            if success:
                print(f"✅ Marked attendance for {name} ({student_id})")
            else:
                print(f"⚠️ {name} ({student_id}): {message}")
        except Exception as e:
            print(f"❌ Error marking attendance for {name}: {e}")
    
    # Test duplicate prevention
    print("\n3. Testing duplicate prevention...")
    try:
        success, message = period_db.mark_period_attendance(
            "101", "John Doe", test_date, test_period
        )
        if not success:
            print(f"✅ Duplicate prevention working: {message}")
        else:
            print("❌ Duplicate prevention failed")
    except Exception as e:
        print(f"❌ Error testing duplicates: {e}")
    
    # Test retrieval
    print("\n4. Testing attendance retrieval...")
    try:
        records = period_db.get_period_attendance(test_date, test_period)
        print(f"✅ Retrieved {len(records)} attendance records")
        for record in records:
            print(f"   - {record[2]} ({record[1]}) at {record[5]}")
    except Exception as e:
        print(f"❌ Error retrieving attendance: {e}")
    
    # Test summary
    print("\n5. Testing attendance summary...")
    try:
        summary = period_db.get_attendance_summary(test_date)
        print(f"✅ Retrieved summary for {len(summary)} periods")
        for period_summary in summary:
            print(f"   - {period_summary[0]}: {period_summary[1]} present")
    except Exception as e:
        print(f"❌ Error getting summary: {e}")
    
    # Test CSV export
    print("\n6. Testing CSV export...")
    try:
        csv_content = period_db.export_period_attendance_csv(test_date, test_period)
        if csv_content:
            lines = csv_content.strip().split('\n')
            print(f"✅ CSV export successful: {len(lines)} lines generated")
            print(f"   Header: {lines[0]}")
        else:
            print("❌ CSV export returned empty content")
    except Exception as e:
        print(f"❌ Error exporting CSV: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Period attendance system test completed!")
    return True

if __name__ == "__main__":
    test_period_attendance()