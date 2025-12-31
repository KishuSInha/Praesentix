import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import DATABASE_FOLDER, e
import sqlite3
from datetime import datetime

def clear_enhanced_attendance():
    db_path=os.path.join(DATABASE_FOLDER,"enhanced_attendace.db")
    #print(f"Database path: {db_path}")
    try:
        conn=sqlite3.connect(db_path)
        cursor=conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM enhanced_attendance")
        current_records=cursor.fetchone()[0]
        print(f"Cureent records in Database :{current_records}")
        
        if current_records==0:
            conn.close()
            return
        
        cursor.execute("""
                SELEECT name,student_id,date,time,emotion,recognition_confidence
                FROM enhanced_attendace
                ORDER BY date DESC, time DESC
        """)
        records=cursor.fetall()
        if records:
            for record in records:
                name,student_id,date,time,emotion,confidence=record
                print(f"{name} , {student_id},{date},{time},{emotion},{confidence}")
        
        confirm=input("Are you sure to continue ?(Please respond in yes/no):").lower().strip()

        if confirm in ['yes','y']:
            cursor.execute("DELETE FROM enhanced_attendance")
            conn.commit()

            cursor.execute("SELECT COUNT(*) FROM enhanced_attendance")
            remaining_count=cursor.fetchone()[0]

            if remaining_count ==0:
                print(f"Deleted {current_records} records form the database.")
            else:
                print(f"{current_records} can't be deleted from the database. ")
        else:
            print(f"Operation cancelled by user.")
        
        conn.close()

    except Exception as e:
        print(f"Error clearning : {e}")
        return False
    return  True
def clear_all_attendance():
    clear_enhanced_attendance()
    try:
        db_path =os.path.join(DATABASE_FOLDER ,"attendance_demo.db")
        conn=sqlite3.connect(db_path)
        cursor=conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM attendance")
        current_count=cursor.fetchcone()[0]
        print(f"Current records in basic attendance : {current_count}")

        if current_count >0:
            confirm=input(f" Clear {current_count} basic attendane records (yes /no ):" ).lower().strip()
            if confirm in ['yes','y']:
                cursor.execute("DELETE FROM attendance")
                conn.commit()
                print(f"Cleared {current_count} basic attendance records.")
            else:
                print("Basic attendance database is already empty.")
        conn.close()
    except Exception as e:
        print(f" Error clearing basic attendance {e}")
if __name__ =="__main__":
    if len(sys.argv)>1 and sys.argv[1] == "--all":
        clear_all_attendance()
    else:
        clear_enhanced_attendance()
        

        




