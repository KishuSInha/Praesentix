import sqlite3
import os
from datetime import datetime
import csv
import io

# Database folder configuration
DATABASE_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Database')

def setup_period_attendance_database(database_file=None):
    """Create the SQLite database and table for period-based attendance records."""
    if database_file is None:
        database_file = os.path.join(DATABASE_FOLDER, "period_attendance.db")
    
    conn = sqlite3.connect(database_file)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS period_attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            name TEXT NOT NULL,
            date TEXT NOT NULL,
            period TEXT NOT NULL,
            time TEXT NOT NULL,
            emotion TEXT DEFAULT 'Neutral',
            spoofing_status TEXT DEFAULT 'LIVE',
            liveliness_confidence REAL DEFAULT 75.0,
            recognition_confidence REAL DEFAULT 85.0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, date, period)
        )
    ''')
    
    conn.commit()
    return conn

def mark_period_attendance(student_id, name, date_str, period, emotion="Neutral", 
                          liveness_confidence=75.0, recognition_confidence=85.0, is_live=True):
    """Mark attendance for a specific period."""
    try:
        conn = setup_period_attendance_database()
        cursor = conn.cursor()
        
        time_str = datetime.now().strftime("%H:%M:%S")
        spoofing_status = "LIVE" if is_live else "SPOOFED"
        
        # Check for duplicate
        cursor.execute('''
            SELECT COUNT(*) FROM period_attendance 
            WHERE student_id = ? AND date = ? AND period = ?
        ''', (student_id, date_str, period))
        
        if cursor.fetchone()[0] > 0:
            conn.close()
            return False, "Attendance already marked for this period"
        
        # Insert new record
        cursor.execute('''
            INSERT INTO period_attendance 
            (student_id, name, date, period, time, emotion, spoofing_status, 
             liveliness_confidence, recognition_confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (student_id, name, date_str, period, time_str, emotion, 
              spoofing_status, liveness_confidence, recognition_confidence))
        
        conn.commit()
        conn.close()
        return True, "Attendance marked successfully"
        
    except Exception as e:
        return False, f"Database error: {str(e)}"

def get_period_attendance(date_str=None, period=None, class_filter=None):
    """Get period attendance records with optional filtering."""
    try:
        conn = setup_period_attendance_database()
        cursor = conn.cursor()
        
        query = '''
            SELECT id, student_id, name, date, period, time, emotion, 
                   spoofing_status, liveliness_confidence, recognition_confidence, timestamp
            FROM period_attendance
        '''
        
        params = []
        where_clauses = []
        
        if date_str:
            where_clauses.append("date = ?")
            params.append(date_str)
        
        if period:
            where_clauses.append("period = ?")
            params.append(period)
        
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        
        query += " ORDER BY date DESC, period, time DESC"
        
        cursor.execute(query, params)
        records = cursor.fetchall()
        conn.close()
        
        return records
        
    except Exception as e:
        print(f"Error getting period attendance: {e}")
        return []

def export_period_attendance_csv(date_str=None, period=None):
    """Export period attendance to CSV format with enhanced readability."""
    try:
        records = get_period_attendance(date_str, period)
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header with better formatting
        writer.writerow([
            'Serial No', 'Student ID', 'Student Name', 'Date', 'Period', 
            'Attendance Time', 'Emotion Detected', 'Live/Spoofed', 
            'Liveness Score (%)', 'Recognition Score (%)', 'Recorded At'
        ])
        
        # Write data with formatting
        for record in records:
            formatted_record = [
                record[0],  # ID
                record[1],  # Student ID
                record[2],  # Name
                record[3],  # Date
                record[4],  # Period
                record[5],  # Time
                record[6],  # Emotion
                'Live' if record[7] == 'LIVE' else 'Spoofed',  # Status
                f"{record[8]:.1f}%",  # Liveness confidence
                f"{record[9]:.1f}%",  # Recognition confidence
                record[10]  # Timestamp
            ]
            writer.writerow(formatted_record)
        
        # Add summary at the end
        writer.writerow([])  # Empty row
        writer.writerow(['SUMMARY'])
        writer.writerow(['Total Students Present:', len(records)])
        
        if records:
            live_count = sum(1 for r in records if r[7] == 'LIVE')
            spoofed_count = len(records) - live_count
            writer.writerow(['Live Detections:', live_count])
            if spoofed_count > 0:
                writer.writerow(['Spoofed Detections:', spoofed_count])
            
            # Average confidence scores
            avg_recognition = sum(r[9] for r in records) / len(records)
            avg_liveness = sum(r[8] for r in records) / len(records)
            writer.writerow(['Average Recognition Confidence:', f"{avg_recognition:.1f}%"])
            writer.writerow(['Average Liveness Confidence:', f"{avg_liveness:.1f}%"])
        
        writer.writerow([])  # Empty row
        writer.writerow(['Generated on:', datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
        
        csv_content = output.getvalue()
        output.close()
        
        return csv_content
        
    except Exception as e:
        print(f"Error exporting CSV: {e}")
        return None

def get_attendance_summary(date_str=None):
    """Get attendance summary by period for a specific date."""
    try:
        conn = setup_period_attendance_database()
        cursor = conn.cursor()
        
        if date_str:
            cursor.execute('''
                SELECT period, COUNT(*) as total_present,
                       COUNT(CASE WHEN spoofing_status = 'LIVE' THEN 1 END) as live_count,
                       COUNT(CASE WHEN spoofing_status = 'SPOOFED' THEN 1 END) as spoofed_count
                FROM period_attendance 
                WHERE date = ?
                GROUP BY period
                ORDER BY period
            ''', (date_str,))
        else:
            cursor.execute('''
                SELECT period, COUNT(*) as total_present,
                       COUNT(CASE WHEN spoofing_status = 'LIVE' THEN 1 END) as live_count,
                       COUNT(CASE WHEN spoofing_status = 'SPOOFED' THEN 1 END) as spoofed_count
                FROM period_attendance 
                WHERE date = date('now')
                GROUP BY period
                ORDER BY period
            ''')
        
        records = cursor.fetchall()
        conn.close()
        
        return records
        
    except Exception as e:
        print(f"Error getting attendance summary: {e}")
        return []