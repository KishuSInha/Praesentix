#!/usr/bin/env python3
"""
Clear all records from the enhanced attendance database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import DATABASE_FOLDER
import sqlite3
from datetime import datetime

def clear_enhanced_attendance():
    print("🗑️  Clearing Enhanced Attendance Database")
    print("="*60)
    
    db_path = os.path.join(DATABASE_FOLDER, "enhanced_attendance.db")
    print(f"Database path: {db_path}")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current record count
        cursor.execute("SELECT COUNT(*) FROM enhanced_attendance")
        current_count = cursor.fetchone()[0]
        print(f"\n📊 Current records in database: {current_count}")
        
        if current_count == 0:
            print("✅ Database is already empty!")
            conn.close()
            return
        
        # Show current records before clearing
        print("\n📋 Current records:")
        cursor.execute("""
            SELECT name, student_id, date, time, emotion, recognition_confidence
            FROM enhanced_attendance
            ORDER BY date DESC, time DESC
        """)
        
        records = cursor.fetchall()
        if records:
            print("  " + "-"*80)
            print("  Name                 | ID  | Date       | Time     | Emotion    | Confidence")
            print("  " + "-"*80)
            for record in records:
                name, student_id, date, time, emotion, confidence = record
                print(f"  {name:<20} | {student_id:<3} | {date:<10} | {time:<8} | {emotion:<10} | {confidence:<10.1f}")
        
        # Confirm deletion
        print(f"\n⚠️  This will delete all {current_count} records from the enhanced attendance database.")
        confirm = input("Are you sure you want to continue? (yes/no): ").lower().strip()
        
        if confirm in ['yes', 'y']:
            # Clear all records
            cursor.execute("DELETE FROM enhanced_attendance")
            conn.commit()
            
            # Verify deletion
            cursor.execute("SELECT COUNT(*) FROM enhanced_attendance")
            remaining_count = cursor.fetchone()[0]
            
            if remaining_count == 0:
                print(f"\n✅ Successfully cleared all records from enhanced attendance database!")
                print(f"   Deleted {current_count} records")
            else:
                print(f"\n⚠️  Warning: {remaining_count} records still remain")
        else:
            print("\n❌ Operation cancelled by user")
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error clearing database: {e}")
        return False
    
    print("\n" + "="*60)
    print("✅ Operation completed!")
    return True

def clear_all_attendance():
    """Clear both basic and enhanced attendance databases"""
    print("🗑️  Clearing ALL Attendance Databases")
    print("="*60)
    
    # Clear enhanced attendance
    clear_enhanced_attendance()
    
    # Clear basic attendance
    print(f"\n🗑️  Clearing Basic Attendance Database")
    print("-"*40)
    
    try:
        db_path = os.path.join(DATABASE_FOLDER, "attendance_demo.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current record count
        cursor.execute("SELECT COUNT(*) FROM attendance")
        current_count = cursor.fetchone()[0]
        print(f"Current records in basic attendance: {current_count}")
        
        if current_count > 0:
            confirm = input(f"Clear {current_count} basic attendance records? (yes/no): ").lower().strip()
            if confirm in ['yes', 'y']:
                cursor.execute("DELETE FROM attendance")
                conn.commit()
                print(f"✅ Cleared {current_count} basic attendance records")
            else:
                print("❌ Basic attendance clearing cancelled")
        else:
            print("✅ Basic attendance database is already empty")
    
        conn.close()
        
    except Exception as e:
        print(f"❌ Error clearing basic attendance: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        clear_all_attendance()
    else:
        clear_enhanced_attendance()
        print("\n💡 Tip: Use '--all' flag to clear both enhanced and basic attendance databases")
