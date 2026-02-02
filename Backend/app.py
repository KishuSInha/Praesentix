import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

# Disable oneDNN optimizations and FORCE CPU-ONLY for Render
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["XLA_FLAGS"] = "--xla_gpu_cuda_data_dir="

import json
import base64
import gc
import sys
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
# from flask_sqlalchemy import SQLAlchemy # Removed
from neon_db import get_db
from models import FaceEncoding, Attendance, Notification, User
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, text, case
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt
from pgvector.sqlalchemy import Vector
from pydantic import ValidationError
from schemas import LoginRequest, RecognizeRequest, MarkAttendanceRequest
from logging_config import logger
from redis_cache import cache_response, invalidate_cache
import cv2
import numpy as np
from deepface import DeepFace

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import period_attendance as period_db

def normalize_date(date_str):
    """Normalize date from DD/MM/YYYY to YYYY-MM-DD if needed."""
    if not date_str:
        return datetime.now().strftime('%Y-%m-%d')
    if '/' in date_str:
        try:
            parts = date_str.split('/')
            if len(parts) == 3:
                # DD/MM/YYYY -> YYYY-MM-DD
                return f"{parts[2]}-{parts[1]}-{parts[0]}"
        except:
            pass
    return date_str

# Face recognition settings for DeepFace (Facenet is lighter for 512MB RAM)
FACE_RECOGNITION_THRESHOLD = 0.40 # Threshold for Facenet (Cosine) is usually around 0.40
MODEL_NAME = 'Facenet'

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
jwt = JWTManager(app)

# ✅ GLOBAL CORS — Allow Vercel and Local Development
CORS(
    app,
    # Standard Flask-CORS only allows one origin string by default or a list
    resources={r"/api/*": {"origins": ["https://praesentix-ty5d.vercel.app", "http://localhost:5173", "http://localhost:8080"]}},
    supports_credentials=True
)

# JWT Error Handlers for Debugging
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    logger.warning(f"JWT Token expired: {jwt_payload}")
    return jsonify({
        'success': False,
        'message': 'The token has expired',
        'error': 'token_expired'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    logger.warning(f"JWT Token invalid: {error}")
    return jsonify({
        'success': False,
        'message': 'Your session is invalid or has expired. Please login again.',
        'error': 'invalid_token'
    }), 401 # Changed from 422 to 401 to trigger frontend re-login logic if any

@jwt.unauthorized_loader
def missing_token_callback(error):
    logger.warning(f"JWT Token missing: {error}")
    return jsonify({
        'success': False,
        'message': 'Request does not contain an access token',
        'error': 'authorization_required'
    }), 401

@app.before_request
def handle_pre_request():
    """Log details and handle OPTIONS preflight."""
    if request.path == '/health': return
    
    # Log the request
    print(f"[DEBUG] Request: {request.method} {request.path}", flush=True)
    if request.method != 'OPTIONS':
        auth_header = request.headers.get('Authorization', '')
        important_headers = {
            'Origin': request.headers.get('Origin'),
            'Content-Type': request.headers.get('Content-Type'),
            'Authorization': f"{auth_header[:15]}..." if auth_header else 'None'
        }
        print(f"[DEBUG] Headers: {important_headers}", flush=True)

    # ✅ Handle OPTIONS preflight centrally
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        return response

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    # ✅ STRICT CORS — Restricted to specific production and local origins
    ALLOWED_ORIGINS = {
        "https://praesentix-ty5d.vercel.app",
        "http://localhost:5173",
        "http://localhost:8080"
    }
    
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        # Default to production if unauthorized or missing
        response.headers["Access-Control-Allow-Origin"] = "https://praesentix-ty5d.vercel.app"
        
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Requested-With"
    # Note: Access-Control-Allow-Methods should NOT be manual if CORS(app) is used, 
    # but keeping it for Gunicorn compatibility if it strips them
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

@app.route('/')
def index():
    return jsonify({"status": "Server running", "info": "Use /api/warmup to pre-load models"})

@app.route('/health')
def health_check():
    return "OK", 200

@app.route('/api/warmup', methods=['GET', 'OPTIONS'])
def warmup():
    """Trigger DeepFace model loading to avoid timeout on first real request."""
    print("[DEBUG] Warmup started: Pre-loading DeepFace components...", flush=True)
    try:
        # Create a dummy image to trigger internal lazy loading
        dummy_img = np.zeros((224, 224, 3), dtype=np.uint8)
        # Just call represent with enforce_detection=False
        DeepFace.represent(dummy_img, model_name=MODEL_NAME, enforce_detection=False, detector_backend='opencv')
        print("[DEBUG] Warmup successful!", flush=True)
        return jsonify({'success': True, 'message': 'Models warmed up and ready'})
    except Exception as e:
        print(f"[ERROR] Warmup failed: {str(e)}", flush=True)
        return jsonify({'success': False, 'message': str(e)}), 500

# ✅ Startup warmup DISABLED for Render Free Tier to avoid OOM
# DeepFace will load the model on the first request.
# Initial requests might be slower, but this prevents startup crashes.

# Database configuration
# Removed Flask-SQLAlchemy config

# Removed Database/Enhanced DB legacy paths (unless needed for analytics, but assuming we migrate all)
# Keeping analytics endpoints as is (Legacy) vs refactoring them is a choice.
# The user asked to integrate "Use Neon DB in your existing APIs".
# For now, I will focus on the parts that were touched in step 2 (Face/Attendance).
# Analytics endpoints connect to 'enhanced_attendance.db' via sqlite3. Ideally these should move too, but might be out of scope for "integrate it" (which looked like step 7 example).
# However, purely removing SQLAlchemy config might break things if I don't replace logic.
# But 'db = SQLAlchemy(app)' was only used for FaceEncoding/Attendance *Models* I created.
# So removing it is fine as long as I replace its usage.

# Helper for getting DB session
def get_db_session():
    return next(get_db())

# ===== Face Recognition Helper Functions (DeepFace + pgvector + Liveness) =====

def calculate_motion_score(frames):
    """
    Calculate motion score between consecutive frames using absdiff.
    Expects list of decoded OpenCV images (BGR).
    """
    if len(frames) < 2:
        return 100.0 # Can't determine from 1 frame, assume live for backward/single-frame compatibility
    
    diffs = []
    for i in range(len(frames) - 1):
        # Calculate mean absolute difference
        diff = cv2.absdiff(frames[i], frames[i+1])
        diff_score = np.mean(diff)
        diffs.append(diff_score)
    
    return np.mean(diffs)

def get_face_encodings_from_image(image):
    """
    Extract face encodings from an image using DeepFace.
    Returns a list of encodings (one per detected face).
    """
    try:
        print(f"[DEBUG] Starting DeepFace.represent with image shape: {image.shape}", flush=True)
        
        results = DeepFace.represent(
            img_path=image,
            model_name=MODEL_NAME,
            enforce_detection=True,
            detector_backend='opencv'
        )
        
        print(f"[DEBUG] DeepFace.represent completed successfully", flush=True)
        encodings = [np.array(res['embedding']) for res in results]
        return encodings
        
    except ValueError as ve:
        # No face detected
        print(f"[DEBUG] No face detected: {str(ve)}", flush=True)
        return []
    except Exception as e:
        print(f"[ERROR] DeepFace encoding error: {str(e)}", flush=True)
        return []

def find_matching_face_vector(encoding, db, threshold=FACE_RECOGNITION_THRESHOLD):
    """
    Find the best matching face in the database using pgvector Cosine Distance.
    Returns (person_id, confidence_percent)
    """
    try:
        # Convert NumPy array to list for pgvector
        query_embedding = encoding.tolist()
        
        # SQL for Cosine similarity search
        # <=> is the operator for cosine distance in pgvector
        # 1 - distance = similarity (confidence)
        sql = text("""
            SELECT person_id, 1 - (embedding <=> :query_embedding) AS confidence
            FROM face_encodings
            ORDER BY embedding <=> :query_embedding
            LIMIT 1
        """)
        
        result = db.execute(sql, {"query_embedding": str(query_embedding)}).fetchone()
        
        if result:
            person_id, confidence = result
            # Convert distance-based confidence to percentage
            # Cosine distance 0 -> 100%, threshold 0.4 -> (1-0.4)*100 = 60%
            confidence_percent = confidence * 100
            
            # Check if distance (1 - confidence) is within threshold
            if (1 - confidence) <= threshold:
                return person_id, confidence_percent
            
            return None, confidence_percent
            
    except Exception as e:
        print(f"[ERROR] Vector search error: {str(e)}", flush=True)
        
    return None, 0

def parse_person_id(person_id):
    """
    Parse person_id format: 'ID-{studentId} - {name}' or just a name.
    Returns (name, roll_number).
    """
    if person_id and person_id.startswith('ID-') and ' - ' in person_id:
        # Format: "ID-123 - John Doe"
        parts = person_id.split(' - ', 1)
        roll_number = parts[0].replace('ID-', '')
        name = parts[1] if len(parts) > 1 else 'Unknown'
        return name, roll_number
    else:
        # Fallback: use person_id as name
        return person_id or 'Unknown', 'Unknown'

# ===== End Face Recognition Helper Functions =====


@app.route('/api/student/<student_id>/attendance', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_student_attendance(student_id):
    db = get_db_session()
    try:
        # Get student attendance records (limit 100)
        records = db.query(Attendance)\
            .filter(Attendance.student_id == student_id)\
            .order_by(desc(Attendance.date), desc(Attendance.time))\
            .limit(100)\
            .all()
        
        # Calculate statistics
        total_days = db.query(Attendance).filter(Attendance.student_id == student_id).count()
        present_days = db.query(Attendance).filter(
            Attendance.student_id == student_id, 
            Attendance.spoof_status == 'LIVE'
        ).count()
        
        if total_days == 0: total_days = 1
        absent_days = total_days - present_days
        attendance_percentage = round((present_days / total_days) * 100, 1) if total_days > 0 else 0
        
        # Get recent 7 days attendance for trend
        # SQLite: date('now', '-7 days')
        # Postgres: current_date - interval '7 days'
        # Using pure SQLAlchemy to be generic-ish or raw SQL compatible with Postgres
        
        # Raw SQL for trend since aggregation is easier
        recent_trend_sql = text("""
            SELECT date, COUNT(*) as present_count
            FROM attendance 
            WHERE student_id = :student_id AND spoof_status = 'LIVE'
            AND to_date(date, 'YYYY-MM-DD') >= current_date - interval '7 days'
            GROUP BY date
            ORDER BY date DESC
        """)
        # Note: 'date' column in Attendance model is String, we might need casting if it's stored as YYYY-MM-DD
        
        recent_attendance = db.execute(recent_trend_sql, {'student_id': student_id}).fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'attendancePercentage': attendance_percentage,
                'totalDays': total_days,
                'presentDays': present_days,
                'absentDays': absent_days,
                'rank': 5,  # Mock rank
                'records': [{
                    'date': r.date,
                    'time': r.time,
                    'emotion': r.emotion,
                    'confidence': r.recognition_confidence, 
                    'spoof_status': r.spoof_status,
                    'timestamp': r.timestamp
                } for r in records],
                'recentTrend': [{'date': r[0], 'present_count': r[1]} for r in recent_attendance]
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/student/<student_id>/calendar', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_student_calendar(student_id):
    db = get_db_session()
    try:
        # Get attendance records for calendar view
        records = db.query(Attendance)\
            .filter(Attendance.student_id == student_id)\
            .order_by(desc(Attendance.date))\
            .all()
        
        calendar_data = []
        for record in records:
            status = 'present' if record.spoof_status == 'LIVE' else 'absent'
            calendar_data.append({
                'date': record.date,
                'status': status,
                'emotion': record.emotion,
                'time': record.time
            })
        
        return jsonify({
            'success': True,
            'data': calendar_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/student/<student_id>/analytics', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_student_analytics(student_id):
    db = get_db_session()
    try:
        # Weekly attendance data
        # SQLite: strftime('%w', date) -> 0..6
        # Postgres: to_char(date::date, 'D') -> 1..7 (Sunday=1) OR extract(dow from ...)
        # Postgres to_char(..., 'Day') gives name.
        # Let's use generic approach or Postgres specific.
        
        # We assume 'date' column is stored as 'YYYY-MM-DD' string based on previous schema.
        
        weekly_sql = text("""
            SELECT 
                to_char(to_date(date, 'YYYY-MM-DD'), 'Day') as day_name,
                COUNT(CASE WHEN spoof_status = 'LIVE' THEN 1 END) as present_count,
                COUNT(*) as total_count,
                extract(dow from to_date(date, 'YYYY-MM-DD')) as dow
            FROM attendance 
            WHERE student_id = :student_id 
            AND to_date(date, 'YYYY-MM-DD') >= current_date - interval '7 days'
            GROUP BY day_name, dow
            ORDER BY dow
        """)
        
        weekly_results = db.execute(weekly_sql, {'student_id': student_id}).fetchall()
        
        # Monthly trend
        monthly_sql = text("""
            SELECT 
                to_char(to_date(date, 'YYYY-MM-DD'), 'YYYY-MM') as month,
                COUNT(CASE WHEN spoof_status = 'LIVE' THEN 1 END) as present_count,
                COUNT(*) as total_count
            FROM attendance 
            WHERE student_id = :student_id
            GROUP BY month
            ORDER BY month DESC
            LIMIT 6
        """)
        
        monthly_results = db.execute(monthly_sql, {'student_id': student_id}).fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'weeklyData': [{
                    'day_name': r[0].strip(), # Postgres pads with spaces
                    'present_count': r[1],
                    'total_count': r[2]
                } for r in weekly_results],
                'monthlyData': [{
                    'month': r[0],
                    'present_count': r[1],
                    'total_count': r[2]
                } for r in monthly_results]
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/notifications', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_notifications():
    db = get_db_session()
    try:
        notifications = db.query(Notification).order_by(desc(Notification.timestamp)).limit(50).all()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': n.id,
                'type': n.type,
                'title': n.title,
                'message': n.message,
                'timestamp': n.timestamp,
                'read': n.read
            } for n in notifications]
        })
        
    except Exception as e:
        print(f"[ERROR] Error fetching notifications: {str(e)}", flush=True)
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT', 'OPTIONS'])
@jwt_required()
def mark_notification_read(notification_id):
    db = get_db_session()
    try:
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
        if notification:
            notification.read = 1
            db.commit()
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Notification not found'}), 404
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/recognize', methods=['POST', 'OPTIONS'])
@jwt_required()
def recognize_face():
    
    try:
        data_raw = request.get_json()
        try:
            req = RecognizeRequest(**data_raw)
        except ValidationError as ve:
            return jsonify({'success': False, 'message': 'Validation failed', 'errors': ve.errors()}), 400

        period = req.period
        raw_date = req.date or datetime.now().strftime('%Y-%m-%d')
        date = normalize_date(raw_date)
        
        # Decode image(s)
        decoded_frames = []
        images_to_process = req.images or ([req.image] if req.image else [])
        
        if not images_to_process:
            return jsonify({'success': False, 'message': 'No image provided'}), 400

        try:
            for img_b64 in images_to_process:
                if not img_b64: continue
                image_data = base64.b64decode(img_b64)
                nparr = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if frame is not None:
                    # Downscale for memory
                    max_dim = 800
                    h, w = frame.shape[:2]
                    if max(h, w) > max_dim:
                        scale = max_dim / max(h, w)
                        frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
                    decoded_frames.append(frame)
            
            if not decoded_frames:
                return jsonify({'success': False, 'message': 'Failed to decode any images'}), 400
                
            # Primary image for recognition is the FIRST frame
            image = decoded_frames[0]
            
            # Calculate motion score for liveness
            motion_score = calculate_motion_score(decoded_frames)
            is_live_motion = motion_score > 0.2 if len(decoded_frames) > 1 else True
            liveness_confidence = min(99.0, 70.0 + (motion_score * 10)) if is_live_motion else 30.0
            
            logger.info(f"Face recognition request: {len(decoded_frames)} frames, motion: {motion_score:.4f}, live: {is_live_motion}")

        except Exception as e:
            logger.error(f"Image decode error: {str(e)}")
            return jsonify({'success': False, 'message': f'Image decode error: {str(e)}'}), 400
        
        db = get_db_session()
        try:
            # Get face encodings from the primary image using DeepFace
            try:
                face_encodings = get_face_encodings_from_image(image)
            except Exception as deepface_error:
                logger.error(f"DeepFace failed: {str(deepface_error)}")
                return jsonify({'success': False, 'message': 'Face recognition service error'}), 500
            
            gc.collect()
            
            if not face_encodings:
                return jsonify({
                    'success': True,
                    'message': 'No faces detected',
                    'detectedFaces': []
                })
            
            detected_faces = []
            
            for i, encoding in enumerate(face_encodings):
                # Find matching face in database using pgvector
                person_id, confidence = find_matching_face_vector(encoding, db)
                
                if person_id:
                    name, roll_number = parse_person_id(person_id)
                    detected_face = {
                        'name': name,
                        'rollNumber': roll_number,
                        'spoofed': not is_live_motion,
                        'emotion': 'Neutral',
                        'recognitionConfidence': float(round(confidence, 1)),
                        'livenessConfidence': float(round(liveness_confidence, 1)),
                        'isLive': is_live_motion
                    }
                    
                    # Only mark attendance if LIVE
                    if is_live_motion:
                        success, message = period_db.mark_period_attendance(
                            student_id=roll_number,
                            name=name,
                            date_str=date,
                            period=period,
                            emotion=detected_face['emotion'],
                            liveness_confidence=detected_face['livenessConfidence'],
                            recognition_confidence=detected_face['recognitionConfidence'],
                            is_live=True,
                            db=db
                        )
                        detected_face['attendanceMarked'] = success
                        detected_face['attendanceAlreadyMarked'] = not success and 'already marked' in message.lower()
                        if success:
                            invalidate_cache() # Clear stats cache on new attendance
                    else:
                        detected_face['attendanceMarked'] = False
                        detected_face['attendanceAlreadyMarked'] = False
                else:
                    # Unknown face
                    detected_face = {
                        'name': 'Unknown',
                        'rollNumber': 'N/A',
                        'spoofed': not is_live_motion,
                        'emotion': 'Neutral',
                        'recognitionConfidence': round(confidence, 1),
                        'livenessConfidence': round(liveness_confidence, 1),
                        'isLive': is_live_motion,
                        'attendanceMarked': False,
                        'attendanceAlreadyMarked': False
                    }
                
                detected_faces.append(detected_face)
            
            recognized_count = sum(1 for f in detected_faces if f['name'] != 'Unknown')
            logger.info(f"Recognition success: {len(detected_faces)} detected, {recognized_count} recognized")
            return jsonify({
                'success': True,
                'message': f'Detected {len(detected_faces)} face(s), recognized {recognized_count}',
                'detectedFaces': detected_faces
            })
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Recognition error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        gc.collect()

@app.route('/api/mark-attendance', methods=['POST', 'OPTIONS'])
@jwt_required()
def mark_attendance_endpoint():
    
    try:
        data_raw = request.get_json()
        try:
            req = MarkAttendanceRequest(**data_raw)
        except ValidationError as ve:
            return jsonify({'success': False, 'message': 'Validation failed', 'errors': ve.errors()}), 400
        
        date_str = normalize_date(req.date)
        success, message = period_db.mark_period_attendance(
            student_id=req.studentId,
            name=req.name,
            date_str=date_str,
            period=req.period,
            emotion=req.emotion,
            liveness_confidence=req.livenessConfidence,
            recognition_confidence=req.recognitionConfidence,
            is_live=req.isLive
        )
        
        if success:
            logger.info(f"Attendance marked manually for {req.name} ({req.studentId})")
            invalidate_cache() # Clear stats cache
        else:
            logger.warning(f"Manual attendance failed for {req.name}: {message}")

        return jsonify({
            'success': success,
            'message': message
        })
        
    except Exception as e:
        logger.error(f"Manual attendance error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/period-attendance', methods=['GET', 'OPTIONS'])
@jwt_required()
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

@app.route('/api/teacher/stats', methods=['GET', 'OPTIONS'])
@jwt_required()
@cache_response(timeout=600)
def get_teacher_stats():
    db = get_db_session()
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        
        # 1. Total Students (Distinct IDs in FaceEncoding or Attendance)
        total_students = db.query(FaceEncoding).count()
        
        # 2. Today's Presence Count
        today_present = db.query(Attendance).filter(
            Attendance.date == today,
            Attendance.spoof_status == 'LIVE'
        ).distinct(Attendance.student_id).count()
        
        # 3. Average Attendance % (based on today)
        avg_attendance = 0
        if total_students > 0:
            avg_attendance = round((today_present / total_students) * 100, 1)
            
        return jsonify({
            'success': True,
            'data': {
                'totalClasses': 6, # Mocked classes count for dashboard
                'studentsTotal': total_students,
                'averageAttendance': avg_attendance,
                'todayPresent': today_present
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    db = get_db_session()
    try:
        data_raw = request.get_json()
        try:
            req = LoginRequest(**data_raw)
        except ValidationError as ve:
            return jsonify({'success': False, 'message': 'Invalid request data', 'errors': ve.errors()}), 400

        username = req.username
        password = req.password
        role = req.role

        logger.info(f"Login attempt: username={username}, role={role}")

        user = db.query(User).filter(
            func.lower(User.username) == username.lower(),
            func.lower(User.role) == role.lower()
        ).first()

        if not user:
            logger.warning(f"User not found for username={username}, role={role}")
            return jsonify({'success': False, 'message': f'Account not found for {role}'}), 401
        
        logger.info(f"User found: {user.username}. Verifying password...")
        
        if bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
            # Using username string as identity to avoid 'Subject must be a string' errors
            access_token = create_access_token(identity=user.username)
            logger.info(f"User login successful: {username} ({role})")
            return jsonify({
                'success': True,
                'token': access_token,
                'user': {
                    'username': user.username,
                    'fullName': user.full_name,
                    'role': user.role,
                    'studentId': user.student_id
                }
            })
        else:
            logger.warning(f"Password mismatch for user: {username}")
            return jsonify({'success': False, 'message': 'Incorrect security key'}), 401
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/student/<student_id>/stats', methods=['GET', 'OPTIONS'])
@jwt_required()
@cache_response(timeout=600)
def get_student_stats(student_id):
    db = get_db_session()
    try:
        # Get attendance stats for student
        records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
        total_days = len(records)
        present_days = sum(1 for r in records if r.spoof_status == 'LIVE')
        
        attendance_percentage = 0
        if total_days > 0:
            attendance_percentage = round((present_days / total_days) * 100, 1)
            
        return jsonify({
            'success': True,
            'data': {
                'attendancePercentage': attendance_percentage,
                'totalDays': total_days,
                'presentDays': present_days,
                'absentDays': total_days - present_days,
                'rank': 5 # Mock rank for now
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/admin/stats', methods=['GET', 'OPTIONS'])
@jwt_required()
@cache_response(timeout=600)
def get_admin_stats():
    db = get_db_session()
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        
        total_students = db.query(FaceEncoding).count()
        total_teachers = db.query(User).filter(User.role == 'teacher').count()
        
        today_present = db.query(Attendance).filter(
            Attendance.date == today,
            Attendance.spoof_status == 'LIVE'
        ).distinct(Attendance.student_id).count()
        
        avg_attendance = 0
        if total_students > 0:
            avg_attendance = round((today_present / total_students) * 100, 1)
            
        active_users = db.query(User).count() # Simply total users for now
        
        return jsonify({
            'success': True,
            'data': {
                'totalStudents': total_students,
                'totalTeachers': total_teachers,
                'averageAttendance': avg_attendance,
                'activeUsers': active_users
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/period-attendance/export', methods=['GET', 'OPTIONS'])
@jwt_required()
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
@jwt_required()
def enroll_face():
    
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
        for i, image_file in enumerate(images):
            # Read image data
            image_bytes = image_file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                continue
            
            # Downscale for efficiency
            max_dim = 640
            h, w = image.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                image = cv2.resize(image, (int(w*scale), int(h*scale)), interpolation=cv2.INTER_AREA)
            
            # Get face encoding from image
            print(f"[DEBUG] Enrolling: Processing image {i+1}...", flush=True)
            encodings = get_face_encodings_from_image(image)
            if encodings:
                all_encodings.append(encodings[0])  # Take first face
        
        if not all_encodings:
            return jsonify({'success': False, 'message': 'No faces detected in any of the uploaded images. Please ensure your face is clearly visible.'}), 400
        
        # Calculate average encoding for more robust matching
        avg_encoding = np.mean(all_encodings, axis=0)
        face_encoding = avg_encoding.tolist()
        
        # Format person_id as "ID-{student_id} - {student_name}"
        # Format person_id as "ID-{student_id} - {student_name}"
        # Format person_id as "ID-{student_id} - {student_name}"
        person_id = f"ID-{student_id} - {student_name}"
        
        # Save to postgres via SQLAlchemy
        db = get_db_session()
        # Check if exists
        existing_face = db.query(FaceEncoding).filter(FaceEncoding.person_id == person_id).first()
        
        if existing_face:
            existing_face.encoding_data = json.dumps(face_encoding)
            existing_face.num_images = len(all_encodings)
            db.commit()
        else:
            new_face = FaceEncoding(
                person_id=person_id,
                encoding_data=json.dumps(face_encoding),
                num_images=len(all_encodings)
            )
            db.add(new_face)
            db.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully enrolled {student_name} (ID: {student_id}) with {len(all_encodings)} face encodings (Model: {MODEL_NAME})'
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Enrollment failed: {str(e)}'}), 500
    finally:
        # Manual garbage collection to prevent OOM
        gc.collect()

@app.route('/api/education/stats', methods=['GET', 'OPTIONS'])
@jwt_required()
@cache_response(timeout=600)
def get_education_stats():
    db = get_db_session()
    try:
        total_schools = 5 # Mocked for now
        total_students = db.query(FaceEncoding).count()
        total_teachers = db.query(User).filter(User.role == 'teacher').count()
        
        # Calculate district wide attendance
        records = db.query(Attendance).all()
        total_records = len(records)
        present_records = sum(1 for r in records if r.spoof_status == 'LIVE')
        
        avg_attendance = 0
        if total_records > 0:
            avg_attendance = round((present_records / total_records) * 100, 1)
            
        return jsonify({
            'success': True,
            'data': {
                'totalSchools': total_schools,
                'totalStudents': total_students,
                'totalTeachers': total_teachers,
                'averageAttendance': avg_attendance,
                'averageDropoutRate': 2.5 # Mocked
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

if __name__ == '__main__':
    # Use PORT environment variable if available (required for Render)
    port = int(os.environ.get('PORT', 5002))
    app.run(debug=False, port=port, host='0.0.0.0')