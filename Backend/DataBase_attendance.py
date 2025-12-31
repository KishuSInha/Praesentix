import sqlite3
import os
from datetime import datetime

# Database folder configuration - use root level Database folder
DATABASE_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Database')
if not os.path.exists(DATABASE_FOLDER):
    os.makedirs(DATABASE_FOLDER)

# ----------------------------
# 1. Connect & create tables
# ----------------------------
def init_db():
    db_path = os.path.join(DATABASE_FOLDER, "attendance_demo.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (  
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        reg_no TEXT UNIQUE,
        class TEXT,
        section TEXT,
        photo_path TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        date TEXT,
        time TEXT,
        status TEXT CHECK(status IN ('Present','Absent')) DEFAULT 'Present',
        FOREIGN KEY (student_id) REFERENCES students (id),
        UNIQUE(student_id, date)  -- prevents duplicate entries per student per day
    )
    """)
    conn.commit()
    conn.close()

# ----------------------------
# 2. Insert student
# ----------------------------
def add_student(name, reg_no=None, class_name=None, section=None, photo_path=None):
    db_path = os.path.join(DATABASE_FOLDER, "attendance_demo.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR IGNORE INTO students (name, reg_no, class, section, photo_path)
        VALUES (?, ?, ?, ?, ?)
    """, (name, reg_no, class_name, section, photo_path))
    conn.commit()
    conn.close()

# ----------------------------
# 3. View attendance
# ----------------------------
def view_attendance(date_str=None):
    db_path = os.path.join(DATABASE_FOLDER, "attendance_demo.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    if date_str:
        cursor.execute("""
        SELECT students.reg_no, students.name, students.class, attendance.date, attendance.time, attendance.status
        FROM attendance
        JOIN students ON students.id = attendance.student_id
        WHERE attendance.date=?
        ORDER BY students.reg_no
        """, (date_str,))
    else:
        cursor.execute("""
        SELECT students.reg_no, students.name, students.class, attendance.date, attendance.time, attendance.status
        FROM attendance
        JOIN students ON students.id = attendance.student_id
        ORDER BY attendance.date, students.reg_no
        """)

    rows = cursor.fetchall()
    conn.close()
    return rows

# ----------------------------
# Demo
# ----------------------------
if __name__ == "__main__":
    # Initialize database
    init_db()
    print("Database initialized successfully!")
