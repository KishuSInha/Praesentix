#!/usr/bin/env python3
"""
Test attendance marking functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import save_attendance_to_db, mark_enhanced_attendance, setup_enhanced_attendance_database
import DataBase_attendance as db
import sqlite3
from datetime import datetime

def test_attendance_marking():
    print("🧪 Testing Attendance Marking System")
    print("="*60)
    
    # Test for each student
    students = [
        ("Utkarsh Sinha", "106"),
        ("Avijit Chowdhary", "101"),
        ("Saanjh Nayak", "102")
    ]
    
    for name, roll_number in students:
        print(f"\n📝 Testing attendance for {name} (ID: {roll_number})")
        
        # Test basic attendance
        print("  Testing basic attendance...")
        try:
            result = save_attendance_to_db(roll_number)
            if result:
                print(f"  ✅ Basic attendance marked successfully")
            else:
                print(f"  ⚠️  Attendance already marked or failed")
        except Exception as e:
            print(f"  ❌ Error: {e}")
        
        # Test enhanced attendance
        print("  Testing enhanced attendance...")
        try:
            result = mark_enhanced_attendance(name, roll_number, "Happy", 85.0, 92.0, True)
            if result:
                print(f"  ✅ Enhanced attendance marked successfully")
            else:
                print(f"  ⚠️  Attendance already marked or failed")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    # Check attendance records
    print("\n📊 Checking attendance records...")
    print("-"*60)
    
    # Check basic attendance
    try:
        conn = sqlite3.connect("attendance_demo.db")
        cursor = conn.cursor()
        today = datetime.now().strftime("%Y-%m-%d")
        
        cursor.execute("""
            SELECT s.name, s.reg_no, a.date, a.time, a.status
            FROM attendance a
            JOIN students s ON s.id = a.student_id
            WHERE a.date = ?
        """, (today,))
        
        records = cursor.fetchall()
        if records:
            print("Basic Attendance Records:")
            for record in records:
                print(f"  {record[0]} ({record[1]}) - {record[3]} - {record[4]}")
        else:
            print("No basic attendance records found for today")
        
        conn.close()
    except Exception as e:
        print(f"Error checking basic attendance: {e}")
    
    # Check enhanced attendance
    try:
        conn = setup_enhanced_attendance_database()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT name, student_id, time, emotion, recognition_confidence
            FROM enhanced_attendance
            WHERE date = ?
        """, (today,))
        
        records = cursor.fetchall()
        if records:
            print("\nEnhanced Attendance Records:")
            for record in records:
                print(f"  {record[0]} ({record[1]}) - {record[2]} - {record[3]} - {record[4]:.1f}%")
        else:
            print("No enhanced attendance records found for today")
        
        conn.close()
    except Exception as e:
        print(f"Error checking enhanced attendance: {e}")
    
    print("\n" + "="*60)
    print("✅ Test completed!")

if __name__ == "__main__":
    test_attendance_marking()
