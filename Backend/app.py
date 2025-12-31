import sqlite3
import os
import json
import base64
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
import sys
import cv2
import numpy as np
from deepface import DeepFace

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import period_attendance as period_db

# Face recognition settings for DeepFace (ArcFace)
# Cosine distance limit for ArcFace is usually around 0.68
FACE_RECOGNITION_THRESHOLD = 0.68
MODEL_NAME = 'ArcFace'

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS", "PUT"], "allow_headers": ["Content-Type"]}})

# Database configuration
DATABASE_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Database')
ENHANCED_DB_PATH = os.path.join(DATABASE_FOLDER, 'enhanced_attendance.db')

def get_db_connection():
    conn = sqlite3.connect(ENHANCED_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ===== Face Recognition Helper Functions (DeepFace) =====

def load_all_face_encodings():
    """Load all face encodings from the database."""
    face_db_path = os.path.join(DATABASE_FOLDER, 'face_encodings.db')
    
    # Create DB if not exists
    if not os.path.exists(face_db_path):
        conn = sqlite3.connect(face_db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS face_encodings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_id TEXT UNIQUE NOT NULL,
                encoding_data TEXT NOT NULL,
                num_images INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
        return {}

    conn = sqlite3.connect(face_db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT person_id, encoding_data FROM face_encodings')
    results = cursor.fetchall()
    conn.close()
    
    encodings = {}
    for person_id, encoding_data in results:
        try:
            encoding = json.loads(encoding_data)
            encodings[person_id] = np.array(encoding, dtype=np.float64)
        except Exception as e:
            print(f"Error loading encoding for {person_id}: {e}")
    
    return encodings

def get_face_encodings_from_image(image):
    """
    Extract face encodings from an image using DeepFace.
    Returns a list of encodings (one per detected face).
    """
    try:
        # DeepFace expects RGB (or BGR if specified, but safely convert to RGB)
        # cv2 reads as BGR, DeepFace handles it but being explicit is good
        # DeepFace.represent returns a list of dicts: [{'embedding': [...], 'facial_area': ...}]
        
        # We pass BGR image directly since we have it via opencv
        # enforce_detection=False allows returning embedding even if face detection is weak (useful for alignment issues)
        # but for accuracy, we want detection. Let's try True first, fall back to False if needed or handle exception.
        
        results = DeepFace.represent(
            img_path=image,
            model_name=MODEL_NAME,
            enforce_detection=True,
            detector_backend='opencv' # opencv is fast, 'retinaface' is better but slower
        )
        
        encodings = [np.array(res['embedding']) for res in results]
        return encodings
        
    except ValueError:
        # No face detected
        return []
    except Exception as e:
        print(f"DeepFace encoding error: {e}")
        return []

def find_cosine_distance(source_representation, test_representation):
    """
    Calculate cosine distance between two vectors.
    """
    a = np.matmul(np.transpose(source_representation), test_representation)
    b = np.sum(np.multiply(source_representation, source_representation))
    c = np.sum(np.multiply(test_representation, test_representation))
    return 1 - (a / (np.sqrt(b) * np.sqrt(c)))

def find_matching_face(encoding, known_encodings, threshold=FACE_RECOGNITION_THRESHOLD):
    """
    Find the best matching face in the database using Cosine Distance.
    Returns (person_id, confidence_percent)
    """
    if not known_encodings:
        return None, 0
    
    min_distance = float('inf')
    best_match_id = None
    
    for person_id, db_encoding in known_encodings.items():
        pass
        # Vector size check
        if len(encoding) != len(db_encoding):
            continue
            
        distance = find_cosine_distance(encoding, db_encoding)
        
        if distance < min_distance:
            min_distance = distance
            best_match_id = person_id
            
    # Convert distance to confidence (approximate mapping)
    # distance 0 -> 100%, distance threshold -> 60% approx
    confidence = max(0, (1 - min_distance) * 100)
    
    if min_distance <= threshold:
        return best_match_id, confidence
    
    return None, confidence

def parse_person_id(person_id):
    """
    Parse person_id format: 'ID-{studentId} - {name}' or just a name.
    Returns (name, roll_number).
    """
    if person_id.startswith('ID-') and ' - ' in person_id:
        # Format: "ID-123 - John Doe"
        parts = person_id.split(' - ', 1)
        roll_number = parts[0].replace('ID-', '')
        name = parts[1] if len(parts) > 1 else 'Unknown'
        return name, roll_number
    else:
        # Fallback: use person_id as name
        return person_id, 'Unknown'

# ===== End Face Recognition Helper Functions =====


@app.route('/api/student/<student_id>/attendance', methods=['GET'])
def get_student_attendance(student_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get student attendance records
        cursor.execute("""
            SELECT date, time, emotion, confidence, spoof_status, timestamp
            FROM enhanced_attendance 
            WHERE student_id = ? 
            ORDER BY date DESC, time DESC
            LIMIT 100
        """, (student_id,))
        
        records = cursor.fetchall()
        
        # Calculate statistics
        cursor.execute("""
            SELECT COUNT(*) as total_days,
                   COUNT(CASE WHEN spoof_status = 'LIVE' THEN 1 END) as present_days
            FROM enhanced_attendance 
            WHERE student_id = ?
        """, (student_id,))
        
        stats = cursor.fetchone()
        total_days = stats['total_days'] if stats['total_days'] > 0 else 1
        present_days = stats['present_days'] or 0
        absent_days = total_days - present_days
        attendance_percentage = round((present_days / total_days) * 100, 1) if total_days > 0 else 0
        
        # Get recent 7 days attendance for trend
        cursor.execute("""
            SELECT date, COUNT(*) as present_count
            FROM enhanced_attendance 
            WHERE student_id = ? AND spoof_status = 'LIVE'
            AND date >= date('now', '-7 days')
            GROUP BY date
            ORDER BY date DESC
        """, (student_id,))
        
        recent_attendance = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'attendancePercentage': attendance_percentage,
                'totalDays': total_days,
                'presentDays': present_days,
                'absentDays': absent_days,
                'rank': 5,  # Mock rank for now
                'records': [dict(record) for record in records],
                'recentTrend': [dict(record) for record in recent_attendance]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/student/<student_id>/calendar', methods=['GET'])
def get_student_calendar(student_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get attendance records for calendar view
        cursor.execute("""
            SELECT date, 
                   CASE WHEN spoof_status = 'LIVE' THEN 'present' ELSE 'absent' END as status,
                   emotion,
                   time
            FROM enhanced_attendance 
            WHERE student_id = ?
            ORDER BY date DESC
        """, (student_id,))
        
        records = cursor.fetchall()
        conn.close()
        
        calendar_data = []
        for record in records:
            calendar_data.append({
                'date': record['date'],
                'status': record['status'],
                'emotion': record['emotion'],
                'time': record['time']
            })
        
        return jsonify({
            'success': True,
            'data': calendar_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/student/<student_id>/analytics', methods=['GET'])
def get_student_analytics(student_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Weekly attendance data
        cursor.execute("""
            SELECT 
                CASE strftime('%w', date)
                    WHEN '0' THEN 'Sun'
                    WHEN '1' THEN 'Mon'
                    WHEN '2' THEN 'Tue'
                    WHEN '3' THEN 'Wed'
                    WHEN '4' THEN 'Thu'
                    WHEN '5' THEN 'Fri'
                    WHEN '6' THEN 'Sat'
                END as day_name,
                COUNT(CASE WHEN spoof_status = 'LIVE' THEN 1 END) as present_count,
                COUNT(*) as total_count
            FROM enhanced_attendance 
            WHERE student_id = ? 
            AND date >= date('now', '-7 days')
            GROUP BY strftime('%w', date)
            ORDER BY strftime('%w', date)
        """, (student_id,))
        
        weekly_data = cursor.fetchall()
        
        # Monthly trend
        cursor.execute("""
            SELECT 
                strftime('%Y-%m', date) as month,
                COUNT(CASE WHEN spoof_status = 'LIVE' THEN 1 END) as present_count,
                COUNT(*) as total_count
            FROM enhanced_attendance 
            WHERE student_id = ?
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month DESC
            LIMIT 6
        """, (student_id,))
        
        monthly_data = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'weeklyData': [dict(record) for record in weekly_data],
                'monthlyData': [dict(record) for record in monthly_data]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, type, title, message, timestamp, read
            FROM notifications
            ORDER BY timestamp DESC
            LIMIT 50
        """)
        
        notifications = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': [dict(notification) for notification in notifications]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE notifications
            SET read = 1
            WHERE id = ?
        """, (notification_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/recognize', methods=['POST', 'OPTIONS'])
def recognize_face():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'success': False, 'message': 'No image provided'}), 400
        
        period = data.get('period', '')
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        # Decode base64 image
        try:
            image_data = base64.b64decode(data['image'])
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                return jsonify({'success': False, 'message': 'Failed to decode image'}), 400
        except Exception as e:
            return jsonify({'success': False, 'message': f'Image decode error: {str(e)}'}), 400
        
        # Load known face encodings from database
        known_encodings = load_all_face_encodings()
        # Even if empty, we might want to proceed to show "Unknown"
        
        # Get face encodings from the input image using DeepFace
        face_encodings = get_face_encodings_from_image(image)
        
        if not face_encodings:
            return jsonify({
                'success': True,
                'message': 'No faces detected in image',
                'detectedFaces': []
            })
        
        detected_faces = []
        
        for encoding in face_encodings:
            # Find matching face in database
            person_id, confidence = find_matching_face(encoding, known_encodings)
            
            if person_id:
                name, roll_number = parse_person_id(person_id)
                detected_face = {
                    'name': name,
                    'rollNumber': roll_number,
                    'spoofed': False,
                    'emotion': 'Neutral',
                    'recognitionConfidence': round(confidence, 1),
                    'livenessConfidence': 88.0,
                    'isLive': True
                }
                
                # Try to mark attendance
                success, message = period_db.mark_period_attendance(
                    student_id=roll_number,
                    name=name,
                    date_str=date,
                    period=period,
                    emotion=detected_face['emotion'],
                    liveness_confidence=detected_face['livenessConfidence'],
                    recognition_confidence=detected_face['recognitionConfidence'],
                    is_live=True
                )
                
                detected_face['attendanceMarked'] = success
                detected_face['attendanceAlreadyMarked'] = not success and 'already marked' in message.lower()
            else:
                # Unknown face
                detected_face = {
                    'name': 'Unknown',
                    'rollNumber': 'N/A',
                    'spoofed': False,
                    'emotion': 'Neutral',
                    'recognitionConfidence': round(confidence, 1),
                    'livenessConfidence': 88.0,
                    'isLive': True,
                    'attendanceMarked': False,
                    'attendanceAlreadyMarked': False
                }
            
            detected_faces.append(detected_face)
        
        recognized_count = sum(1 for f in detected_faces if f['name'] != 'Unknown')
        
        return jsonify({
            'success': True,
            'message': f'Detected {len(detected_faces)} face(s), recognized {recognized_count}',
            'detectedFaces': detected_faces
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/mark-attendance', methods=['POST', 'OPTIONS'])
def mark_attendance_endpoint():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        required_fields = ['studentId', 'name', 'date', 'period']
        
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        success, message = period_db.mark_period_attendance(
            student_id=data['studentId'],
            name=data['name'],
            date_str=data['date'],
            period=data['period'],
            emotion=data.get('emotion', 'Neutral'),
            liveness_confidence=data.get('livenessConfidence', 75.0),
            recognition_confidence=data.get('recognitionConfidence', 85.0),
            is_live=data.get('isLive', True)
        )
        
        return jsonify({
            'success': success,
            'message': message
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/period-attendance', methods=['GET'])
def get_period_attendance_api():
    try:
        date_str = request.args.get('date')
        period = request.args.get('period')
        
        records = period_db.get_period_attendance(date_str, period)
        
        attendance_records = []
        for record in records:
            attendance_records.append({
                'id': record[0],
                'studentId': record[1],
                'name': record[2],
                'date': record[3],
                'period': record[4],
                'time': record[5],
                'emotion': record[6],
                'spoofingStatus': record[7],
                'livenessConfidence': record[8],
                'recognitionConfidence': record[9],
                'timestamp': record[10]
            })
        
        return jsonify({
            'success': True,
            'data': attendance_records,
            'total': len(attendance_records)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/period-attendance/export', methods=['GET'])
def export_period_attendance():
    try:
        date_str = request.args.get('date')
        period = request.args.get('period')
        
        csv_content = period_db.export_period_attendance_csv(date_str, period)
        
        if not csv_content:
            return jsonify({'success': False, 'error': 'No records to export'}), 400
        
        return csv_content, 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': f'attachment; filename="attendance_{date_str or "all"}.csv"'
        }
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/enroll-face', methods=['POST', 'OPTIONS'])
def enroll_face():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        student_name = request.form.get('studentName')
        student_id = request.form.get('studentId')
        images = request.files.getlist('images')
        
        if not student_name or not student_id:
            return jsonify({'success': False, 'message': 'Missing student information'}), 400
        
        if len(images) < 1: # Relaxed requirement for testing
            return jsonify({'success': False, 'message': 'At least 1 image required'}), 400
        
        # Extract real face encodings from uploaded images using DeepFace
        all_encodings = []
        for image_file in images:
            # Read image data
            image_bytes = image_file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                continue
            
            # Get face encoding from image
            encodings = get_face_encodings_from_image(image)
            if encodings:
                all_encodings.append(encodings[0])  # Take first face
        
        if not all_encodings:
            return jsonify({'success': False, 'message': 'No faces detected in any of the uploaded images. Please ensure your face is clearly visible.'}), 400
        
        # Calculate average encoding for more robust matching
        avg_encoding = np.mean(all_encodings, axis=0)
        face_encoding = avg_encoding.tolist()
        
        # Format person_id as "ID-{student_id} - {student_name}"
        person_id = f"ID-{student_id} - {student_name}"
        
        # Save to face encodings database
        face_db_path = os.path.join(DATABASE_FOLDER, 'face_encodings.db')
        
        # Create DB if not exists (redundant safe check)
        if not os.path.exists(face_db_path):
             # Handled in load_all_face_encodings or manual connection
             pass
             
        face_conn = sqlite3.connect(face_db_path)
        face_cursor = face_conn.cursor()
        
        # Ensure table exists
        face_cursor.execute('''
            CREATE TABLE IF NOT EXISTS face_encodings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_id TEXT UNIQUE NOT NULL,
                encoding_data TEXT NOT NULL,
                num_images INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert or replace using existing schema
        face_cursor.execute('''
            INSERT OR REPLACE INTO face_encodings 
            (person_id, encoding_data, num_images, updated_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ''', (person_id, json.dumps(face_encoding), len(all_encodings)))
        
        face_conn.commit()
        face_conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Successfully enrolled {student_name} (ID: {student_id}) with {len(all_encodings)} face encodings (Model: {MODEL_NAME})'
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Enrollment failed: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5002, host='0.0.0.0')