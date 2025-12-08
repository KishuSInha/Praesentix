import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import DATABASE_FOLDER
import sqlite3

def clear_period_attendance():
    db_path = os.path.join(DATABASE_FOLDER, "period_attendance.db")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM period_attendance")
        current_records = cursor.fetchone()[0]
        print(f"Current records in Database: {current_records}")
        
        if current_records == 0:
            print("No records to delete.")
            conn.close()
            return
        
        cursor.execute("""
            SELECT name, student_id, date, time, emotion, recognition_confidence
            FROM period_attendance
            ORDER BY date DESC, time DESC
            LIMIT 10
        """)
        records = cursor.fetchall()
        
        if records:
            print("\nSample records (showing up to 10):")
            for record in records:
                name, student_id, date, time, emotion, confidence = record
                print(f"{name}, {student_id}, {date}, {time}, {emotion}, {confidence}")
        
        confirm = input("\nAre you sure to delete all records? (yes/no): ").lower().strip()

        if confirm in ['yes', 'y']:
            cursor.execute("DELETE FROM period_attendance")
            conn.commit()

            cursor.execute("SELECT COUNT(*) FROM period_attendance")
            remaining_count = cursor.fetchone()[0]

            if remaining_count == 0:
                print(f"Successfully deleted {current_records} records from the database.")
            else:
                print(f"Warning: {remaining_count} records remain in the database.")
        else:
            print("Operation cancelled by user.")
        
        conn.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clear_period_attendance()
