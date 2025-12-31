import os
from datetime import datetime
import csv
import io
from neon_db import get_db
from models import Attendance, Notification
from sqlalchemy import desc

def mark_period_attendance(student_id, name, date_str, period, emotion="Neutral", 
                          liveness_confidence=75.0, recognition_confidence=85.0, is_live=True, db=None):
    """Mark attendance for a specific period."""
    should_close = False
    if db is None:
        db = next(get_db())
        should_close = True
    
    try:
        print(f"[DEBUG] Attempting to mark attendance for {name} ({student_id}) on {date_str}, period {period}", flush=True)
        time_str = datetime.now().strftime("%H:%M:%S")
        spoofing_status = "LIVE" if is_live else "SPOOFED"
        
        # Check for duplicate
        existing = db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.date == date_str,
            Attendance.period == period
        ).first()
        
        if existing:
            print(f"[DEBUG] Duplicate attendance found for {student_id}", flush=True)
            return False, "Attendance already marked for this period"
        
        # Insert new record
        new_record = Attendance(
            student_id=student_id,
            name=name,
            date=date_str,
            period=period,
            time=time_str,
            emotion=emotion,
            spoof_status=spoofing_status,
            liveness_confidence=float(liveness_confidence),
            recognition_confidence=float(recognition_confidence),
            timestamp=datetime.utcnow()
        )
        
        db.add(new_record)
        
        # Create Notification
        new_notification = Notification(
            type="attendance",
            title="Attendance Marked",
            message=f"Attendance marked for {name} ({student_id})",
            timestamp=datetime.utcnow(),
            read=0
        )
        db.add(new_notification)
        
        db.commit()
        print(f"[DEBUG] Successfully marked attendance and created notification for {student_id}", flush=True)
        return True, "Attendance marked successfully"
        
    except Exception as e:
        print(f"[ERROR] Failed to mark attendance: {e}", flush=True)
        import traceback
        traceback.print_exc()
        if should_close:
            db.rollback()
        return False, f"Database error: {str(e)}"
    finally:
        if should_close:
            db.close()

def get_period_attendance(date_str=None, period=None, class_filter=None):
    """Get period attendance records with optional filtering."""
    db = next(get_db())
    try:
        query = db.query(Attendance)
        
        if date_str:
            query = query.filter(Attendance.date == date_str)
        
        if period:
            query = query.filter(Attendance.period == period)
            
        records = query.order_by(desc(Attendance.date), Attendance.period, desc(Attendance.time)).all()
        
        # Convert to list of tuples/dicts to match expected format of calling code (mostly tuple based in legacy)
        # However, calling code (app.py) expects records[0] etc.
        # Let's verify what app.py expects. It does `record[0]` etc. in `get_period_attendance_api`.
        # So we should convert models to tuples or dicts.
        
        results = []
        for r in records:
            results.append((
                r.id, r.student_id, r.name, r.date, r.period, r.time, 
                r.emotion, r.spoof_status, r.liveness_confidence, 
                r.recognition_confidence, r.timestamp
            ))
            
        return results
        
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
    db = next(get_db())
    try:
        # This is a complex aggregation. In SQLAlchemy:
        # SELECT period, COUNT(*), COUNT(case live), COUNT(case spoof) GROUP BY period
        
        # For simplicity and direct replacement, we can use raw SQL via session
        from sqlalchemy import text
        
        target_date = date_str if date_str else datetime.now().strftime('%Y-%m-%d')
        
        sql = text("""
            SELECT period, COUNT(*) as total_present,
                   SUM(CASE WHEN spoof_status = 'LIVE' THEN 1 ELSE 0 END) as live_count,
                   SUM(CASE WHEN spoof_status = 'SPOOFED' THEN 1 ELSE 0 END) as spoofed_count
            FROM attendance 
            WHERE date = :date
            GROUP BY period
            ORDER BY period
        """)
        
        result = db.execute(sql, {'date': target_date})
        records = result.fetchall()
        
        return records
        
    except Exception as e:
        print(f"Error getting attendance summary: {e}")
        return []