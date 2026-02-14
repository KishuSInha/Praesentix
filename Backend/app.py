import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

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
from database import get_db, engine
from models import FaceEncoding, Attendance, Notification, User, EngagementLog, Base
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, text, case
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt
from pydantic import ValidationError
from schemas import LoginRequest, RecognizeRequest, MarkAttendanceRequest
from logging_config import logger
from redis_cache import cache_response, invalidate_cache
import cv2
import numpy as np
from deepface import DeepFace

def ensure_db_schema():
    """Fail-safe to ensure all columns exist in SQLite since Base.metadata.create_all doesn't add missing columns to existing tables."""
    try:
        from database import DB_DIR
        db_path = os.path.join(DB_DIR, 'app.db')
        if not os.path.exists(db_path):
            return
            
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check attendance table
        cursor.execute("PRAGMA table_info(attendance)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_offline_sync' not in columns:
            print("[SCHEMA] Adding is_offline_sync to attendance table...", flush=True)
            cursor.execute("ALTER TABLE attendance ADD COLUMN is_offline_sync BOOLEAN DEFAULT 0")
            
        if 'trust_score_impact' not in columns:
            print("[SCHEMA] Adding trust_score_impact to attendance table...", flush=True)
            cursor.execute("ALTER TABLE attendance ADD COLUMN trust_score_impact FLOAT DEFAULT 0.0")

        # Check users table
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'trust_score' not in columns:
            print("[SCHEMA] Adding trust_score to users table...", flush=True)
            cursor.execute("ALTER TABLE users ADD COLUMN trust_score FLOAT DEFAULT 100.0")
            
        conn.commit()
        conn.close()
        print("[SCHEMA] Database schema check completed successfully.", flush=True)
    except Exception as e:
        print(f"[SCHEMA ERROR] Failed to ensure schema: {str(e)}", flush=True)

# Ensure schema before creating tables
ensure_db_schema()
Base.metadata.create_all(bind=engine)

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
FACE_RECOGNITION_THRESHOLD = 0.60 # Relaxed threshold for Facenet (0.40 was too strict)
MODEL_NAME = 'Facenet'

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
jwt = JWTManager(app)

# ✅ GLOBAL CORS — Allow Vercel and Local Development
CORS(
    app,
    # Standard Flask-CORS only allows one origin string by default or a list
    resources={r"/api/*": {"origins": ["https://praesentix-ty5d.vercel.app", "http://localhost:5173", "http://localhost:8080", "http://localhost:8081"]}},
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
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081"
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

@app.route('/api/seed_users_reset', methods=['GET', 'POST'])
def seed_users_endpoint():
    """Temporary endpoint to reset users when seed script fails."""
    db = get_db_session()
    try:
        # Clear existing users
        db.query(User).delete()
        
        raw_pass = "pass123"
        hashed = bcrypt.hashpw(raw_pass.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        users = [
            User(username="utkarsh123", password=hashed, role="student", full_name="Utkarsh Sinha", student_id="106"),
            User(username="teacher123", password=hashed, role="teacher", full_name="Mrs. Sunita Devi"),
            User(username="admin123", password=hashed, role="admin", full_name="System Administrator"),
            User(username="edu123", password=hashed, role="education", full_name="Education Board Admin")
        ]

        db.add_all(users)
        db.commit()
        
        return jsonify({
            'success': True, 
            'message': 'Users reset successfully. Password for all: pass123'
        })
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

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
        DeepFace.represent(dummy_img, model_name=MODEL_NAME, enforce_detection=False, detector_backend='retinaface')
        print("[DEBUG] Warmup successful!", flush=True)
        return jsonify({'success': True, 'message': 'Models warmed up and ready'})
    except Exception as e:
        print(f"[ERROR] Warmup failed: {str(e)}", flush=True)
        return jsonify({'success': False, 'message': str(e)}), 500
def get_db_session():
    return next(get_db())

# ===== Face Recognition Helper Functions (DeepFace + pgvector + Liveness) =====

def calculate_motion_score(frames):
    """
    Calculate motion score between consecutive frames using absdiff.
    Optimized: grayscale + blur to reduce noise.
    """
    if len(frames) < 2:
        return 100.0
    
    diffs = []
    for i in range(len(frames) - 1):
        # Pre-process for better diff consistency
        gray1 = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frames[i+1], cv2.COLOR_BGR2GRAY)
        
        # Blur to remove pixel noise/refresh line artifacts
        blur1 = cv2.GaussianBlur(gray1, (5, 5), 0)
        blur2 = cv2.GaussianBlur(gray2, (5, 5), 0)
        
        diff = cv2.absdiff(blur1, blur2)
        diff_score = float(np.mean(diff))
        diffs.append(diff_score)
        logger.info(f"[MOTION] Frame {i}->{i+1} score: {diff_score:.4f}")
    
    avg_score = float(np.mean(diffs))
    logger.info(f"[MOTION] Final Score: {avg_score:.4f}")
    return avg_score

def get_face_encodings_from_image(image):
    """
    Extract face encodings from an image using DeepFace.
    Returns a list of encodings (one per detected face).
    """
    try:
        logger.info(f"[DEBUG] Starting DeepFace.represent with image shape: {image.shape}")
        
        results = DeepFace.represent(
            img_path=image,
            model_name=MODEL_NAME,
            enforce_detection=True,
            detector_backend='retinaface'
        )
        
        logger.info(f"[DEBUG] DeepFace detected {len(results)} face(s)")
        encodings = [np.array(res['embedding']) for res in results]
        return encodings
    except ValueError as ve:
        logger.warning(f"[DEBUG] No face detected: {str(ve)}")
        return []
    except Exception as e:
        logger.error(f"[ERROR] DeepFace encoding error: {str(e)}", exc_info=True)
        return []

def find_matching_faces_batch(encodings, db, threshold=FACE_RECOGNITION_THRESHOLD):
    """
    Optimized batch recognition using NumPy broadcasting.
    Args:
        encodings: List of M encodings (each a 1D array/list).
        db: Database session.
    Returns:
        List of (person_id, confidence_percent) for each encoding.
    """
    try:
        if not encodings:
            logger.info("Batch match: No input encodings")
            return []
            
        stored_faces = db.query(FaceEncoding).all()
        logger.info(f"Batch match: {len(stored_faces)} stored faces found in DB")
        if not stored_faces:
            return [(None, 0)] * len(encodings)
            
        # 1. Prepare stored embeddings matrix (N x D)
        stored_ids = []
        stored_matrix = []
        for face in stored_faces:
            if not face.embedding: continue
            
            emb = np.array(json.loads(face.embedding)) if isinstance(face.embedding, str) else np.array(face.embedding)
            # Normalize for cosine similarity
            norm = np.linalg.norm(emb)
            if norm > 0:
                stored_matrix.append(emb / norm)
                stored_ids.append(face.person_id)
        
        if not stored_matrix:
            return [(None, 0)] * len(encodings)
            
        stored_matrix = np.array(stored_matrix) # (N, D)
        
        # 2. Prepare detected embeddings matrix (M x D)
        detected_matrix = []
        for enc in encodings:
            emb = np.array(enc)
            norm = np.linalg.norm(emb)
            detected_matrix.append(emb / norm if norm > 0 else emb)
        
        detected_matrix = np.array(detected_matrix) # (M, D)
        
        # 3. Compute Cosine Similarity Matrix (M, N) via matrix multiplication
        # Similarity = Dot Product of normalized vectors
        similarity_matrix = np.dot(detected_matrix, stored_matrix.T)
        
        results = []
        for i in range(len(encodings)):
            best_idx = np.argmax(similarity_matrix[i])
            best_similarity = similarity_matrix[i][best_idx]
            best_distance = 1 - best_similarity
            
            confidence = float(best_similarity * 100)
            logger.info(f"Encoding {i}: Best match {stored_ids[best_idx]} with distance {best_distance:.4f} (Threshold: {threshold})")
            
            if best_distance <= threshold:
                results.append((stored_ids[best_idx], confidence))
            else:
                results.append((None, confidence))
                
        return results
            
    except Exception as e:
        print(f"[ERROR] Batch vector search error: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        return [(None, 0)] * len(encodings)

def find_matching_face_vector(encoding, db, threshold=FACE_RECOGNITION_THRESHOLD):
    """Legacy wrapper for single face recognition."""
    results = find_matching_faces_batch([encoding], db, threshold)
    return results[0]

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
        return person_id or 'Unknown', 'Unknown'


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

# ===== Shared Face Recognition Processing Logic =====
def process_face_recognition(frames, period, date, db):
    """
    Core logic to process frames for face recognition.
    Args:
        frames: List of decoded OpenCV images (BGR).
        period: Class period string.
        date: Date string YYYY-MM-DD.
        db: Database session.
    Returns:
        JSON compatible dictionary with results.
    """
    if not frames:
        return {'success': False, 'message': 'No frames provided'}

    # Primary image for recognition is the FIRST frame
    image = frames[0]
    
    # Calculate motion score for liveness
    motion_score = calculate_motion_score(frames)
    # Increased threshold to 0.4 for burst mode to be more restrictive
    is_live_motion = bool(motion_score > 0.4) if len(frames) > 1 else True
    liveness_confidence = min(99.0, 70.0 + (motion_score * 10)) if is_live_motion else 30.0
    
    logger.info(f"Recognition: {len(frames)} frames, motion_score: {motion_score:.4f}, is_live: {is_live_motion}")

    try:
        # Get face encodings from the primary image using DeepFace
        try:
            face_encodings = get_face_encodings_from_image(image)
        except Exception as deepface_error:
            logger.error(f"DeepFace failed: {str(deepface_error)}")
            return {'success': False, 'message': 'Face recognition service error'}
        
        gc.collect()
        
        if not face_encodings:
            return {
                'success': True,
                'message': 'No faces detected',
                'detectedFaces': []
            }
        
        # 1. Batch recognize all faces at once (Optimized O(N+M))
        match_results = find_matching_faces_batch(face_encodings, db)
        
        detected_faces = []
        for i, encoding in enumerate(face_encodings):
            person_id, confidence = match_results[i]
            
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
                
                # Calculate Trust Score Impact
                trust_impact = 0.0
                if is_live_motion:
                    if confidence > 90: trust_impact = 1.0
                    elif confidence < 75: trust_impact = -1.0
                else:
                    trust_impact = -5.0 # Heavy penalty for spoofing

                # Only mark attendance if LIVE
                if is_live_motion:
                    # Update User Trust Score
                    user = db.query(User).filter(User.student_id == roll_number).first()
                    if user:
                        user.trust_score = max(0.0, min(100.0, user.trust_score + trust_impact))
                    
                    success, message = period_db.mark_period_attendance(
                        student_id=roll_number,
                        name=name,
                        date_str=date,
                        period=period,
                        emotion=detected_face['emotion'],
                        liveness_confidence=detected_face['livenessConfidence'],
                        recognition_confidence=detected_face['recognitionConfidence'],
                        is_live=True,
                        trust_score_impact=trust_impact,
                        db=db
                    )
                    detected_face['attendanceMarked'] = success
                    detected_face['attendanceAlreadyMarked'] = not success and 'already marked' in message.lower()
                    
                    t_score = user.trust_score if user else 100.0
                    if t_score is None: t_score = 100.0
                    detected_face['currentTrustScore'] = float(round(t_score, 1))
                    logger.info(f"User {roll_number} trust score: {detected_face['currentTrustScore']} (User found: {user is not None})")
                else:
                    # Even if spoofed, we penalize the suspected user if found
                    user = db.query(User).filter(User.student_id == roll_number).first()
                    if user:
                        user.trust_score = max(0.0, min(100.0, user.trust_score + trust_impact))
                    
                    detected_face['attendanceMarked'] = False
                    detected_face['attendanceAlreadyMarked'] = False
                    
                    t_score = user.trust_score if user else 100.0
                    if t_score is None: t_score = 100.0
                    detected_face['currentTrustScore'] = float(round(t_score, 1))
                    logger.info(f"User {roll_number} SPOOFED trust score: {detected_face['currentTrustScore']}")
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
        
        # Commit all trust score updates and attendance records (if not already committed by period_db)
        try:
            db.commit()
            invalidate_cache() 
        except:
            db.rollback()
            
        recognized_count = sum(1 for f in detected_faces if f['name'] != 'Unknown')
        logger.info(f"Recognition success: {len(detected_faces)} detected, {recognized_count} recognized")
        
        return {
            'success': True,
            'message': f'Detected {len(detected_faces)} face(s), recognized {recognized_count}',
            'detectedFaces': detected_faces
        }

    except Exception as e:
        logger.error(f"Processing error: {str(e)}", exc_info=True)
        return {'success': False, 'message': str(e)}

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
                    # Downscale for memory - Increased to 2560 (2.5K) for Crowd Mode
                    max_dim = 2560 
                    h, w = frame.shape[:2]
                    if max(h, w) > max_dim:
                        scale = max_dim / max(h, w)
                        frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
                    decoded_frames.append(frame)
            
            if not decoded_frames:
                return jsonify({'success': False, 'message': 'Failed to decode any images'}), 400
                
        except Exception as e:
            logger.error(f"Image decode error: {str(e)}")
            return jsonify({'success': False, 'message': f'Image decode error: {str(e)}'}), 400
        
        db = get_db_session()
        try:
            result = process_face_recognition(decoded_frames, period, date, db)
            status_code = 200 if result.get('success', False) else 500
            if 'validation failed' in str(result.get('message', '')).lower(): status_code = 400
            return jsonify(result), status_code
        finally:
            db.close()
            gc.collect()

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/rtsp/preview', methods=['POST', 'OPTIONS'])
@jwt_required()
def rtsp_preview():
    """Connect to RTSP stream and return a single frame for preview."""
    try:
        data = request.get_json()
        rtsp_url = data.get('rtspUrl')
        
        if not rtsp_url:
            return jsonify({'success': False, 'message': 'RTSP URL is required'}), 400
        
        logger.info(f"[RTSP] Attempting to connect to: {rtsp_url}")
        
        # Validate RTSP URL format and IP address
        import re
        ip_pattern = r'@(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):'
        ip_match = re.search(ip_pattern, rtsp_url)
        
        if not ip_match:
            return jsonify({
                'success': False, 
                'message': 'Invalid RTSP URL format. Expected format: rtsp://user:pass@IP:port/path'
            }), 400
        
        ip_address = ip_match.group(1)
        logger.info(f"[RTSP] Extracted IP: {ip_address}")
        
        # Validate each octet is 0-255
        octets = ip_address.split('.')
        for octet in octets:
            if not octet or int(octet) > 255:
                return jsonify({
                    'success': False,
                    'message': f'Invalid IP address: {ip_address}. Each number must be 0-255.'
                }), 400
        
        # Configure OpenCV for RTSP with timeout and transport settings
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        # Set timeout to 10 seconds instead of default 30
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)
        # Use TCP for more reliable connection
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not cap.isOpened():
             logger.error(f"[RTSP] Failed to open stream: {rtsp_url}")
             return jsonify({'success': False, 'message': f'Failed to connect to camera at {ip_address}. Check: 1) Camera is online, 2) Port 554 is accessible, 3) Credentials are correct.'}), 400
             
        ret, frame = cap.read()
        cap.release()
        
        if not ret or frame is None:
            logger.error(f"[RTSP] Connected but failed to read frame from: {rtsp_url}")
            return jsonify({'success': False, 'message': 'Connected but failed to grab frame. Camera may be offline or stream is unavailable.'}), 400
            
        # Resize for preview to reduce bandwidth
        h, w = frame.shape[:2]
        max_dim = 640
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
            
        # Encode
        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        b64_image = base64.b64encode(buffer).decode('utf-8')
        
        logger.info(f"[RTSP] Successfully captured frame from {ip_address}")
        return jsonify({
            'success': True,
            'image': b64_image
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'RTSP Error: {str(e)}'}), 500

@app.route('/api/rtsp/recognize', methods=['POST', 'OPTIONS'])
@jwt_required()
def rtsp_recognize():
    """Connect to RTSP stream, capture frames, and perform recognition."""
    try:
        data = request.get_json()
        rtsp_url = data.get('rtspUrl')
        period = data.get('period')
        raw_date = data.get('date') or datetime.now().strftime('%Y-%m-%d')
        date = normalize_date(raw_date)
        
        if not rtsp_url or not period:
            return jsonify({'success': False, 'message': 'RTSP URL and Period are required'}), 400
        
        logger.info(f"[RTSP Recognition] Attempting to connect to: {rtsp_url}")
        
        # Validate RTSP URL format and IP address
        import re
        ip_pattern = r'@(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):'
        ip_match = re.search(ip_pattern, rtsp_url)
        
        if not ip_match:
            return jsonify({
                'success': False, 
                'message': 'Invalid RTSP URL format. Expected format: rtsp://user:pass@IP:port/path'
            }), 400
        
        ip_address = ip_match.group(1)
        logger.info(f"[RTSP Recognition] Extracted IP: {ip_address}")
        
        # Validate each octet is 0-255
        octets = ip_address.split('.')
        for octet in octets:
            if not octet or int(octet) > 255:
                return jsonify({
                    'success': False,
                    'message': f'Invalid IP address: {ip_address}. Each number must be 0-255.'
                }), 400
        
        # Configure OpenCV for RTSP with timeout and transport settings
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not cap.isOpened():
             logger.error(f"[RTSP Recognition] Failed to open stream: {rtsp_url}")
             return jsonify({'success': False, 'message': f'Failed to connect to camera at {ip_address}. Check: 1) Camera is online, 2) Port 554 is accessible, 3) Credentials are correct.'}), 400
             
        frames = []
        # Capture 3 frames with small delay for liveness
        import time
        for i in range(3):
            ret, frame = cap.read()
            if ret and frame is not None:
                frames.append(frame)
            time.sleep(0.2) # 200ms delay
            
        cap.release()
        
        if not frames:
            logger.error(f"[RTSP Recognition] Failed to capture frames from: {rtsp_url}")
            return jsonify({'success': False, 'message': 'Failed to capture frames from stream. Camera may be offline.'}), 400
            
        logger.info(f"[RTSP Recognition] Captured {len(frames)} frames from {ip_address}")
            
        db = get_db_session()
        try:
            result = process_face_recognition(frames, period, date, db)
            status_code = 200 if result.get('success', False) else 500
            return jsonify(result), status_code
        finally:
            db.close()
            gc.collect()
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'RTSP Recognition Error: {str(e)}'}), 500

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
                'timestamp': record[10],
                'trustScoreImpact': record[11] if len(record) > 11 else 0.0
            })
        
        return jsonify({
            'success': True,
            'data': attendance_records,
            'total': len(attendance_records)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/period-attendance/summary', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_period_attendance_summary_api():
    try:
        date_str = request.args.get('date')
        summary_data = period_db.get_attendance_summary(date_str)
        
        # Convert to list of dicts
        data = []
        for row in summary_data:
            data.append({
                'period': row[0],
                'totalPresent': row[1],
                'liveCount': row[2] or 0,
                'spoofedCount': row[3] or 0
            })
            
        return jsonify({
            'success': True,
            'data': data
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
            
        # 4. Average Trust Score (Verification Score)
        avg_trust_sql = text("SELECT AVG(trust_score) FROM users WHERE role = 'student' AND trust_score IS NOT NULL")
        avg_trust = db.execute(avg_trust_sql).scalar() or 100.0
            
        return jsonify({
            'success': True,
            'data': {
                'totalClasses': 6,
                'studentsTotal': total_students,
                'averageAttendance': avg_attendance,
                'todayPresent': today_present,
                'verificationScore': round(float(avg_trust), 1)
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
        
        # 4. Average Trust Score (Verification Score)
        avg_trust_sql = text("SELECT AVG(trust_score) FROM users WHERE role = 'student' AND trust_score IS NOT NULL")
        avg_trust = db.execute(avg_trust_sql).scalar() or 100.0
        
        return jsonify({
            'success': True,
            'data': {
                'totalStudents': total_students,
                'totalTeachers': total_teachers,
                'averageAttendance': avg_attendance,
                'activeUsers': active_users,
                'verificationScore': round(float(avg_trust), 1)
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
        
        avg_encoding = np.mean(all_encodings, axis=0)
        face_encoding = avg_encoding.tolist()
        
        person_id = f"ID-{student_id} - {student_name}"
        
        # Save to postgres via SQLAlchemy
        db = get_db_session()
        # Check if exists
        existing_face = db.query(FaceEncoding).filter(FaceEncoding.person_id == person_id).first()
        
        if existing_face:
            existing_face.embedding = json.dumps(face_encoding)
            existing_face.num_images = len(all_encodings)
            db.commit()
        else:
            new_face = FaceEncoding(
                person_id=person_id,
                embedding=json.dumps(face_encoding),
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

@app.route('/api/sync/attendance', methods=['POST', 'OPTIONS'])
@jwt_required()
def sync_attendance():
    """Sync batch attendance from offline storage."""
    try:
        data = request.get_json()
        records = data.get('records', [])
        
        if not records:
            return jsonify({'success': True, 'syncedCount': 0})
            
        db = get_db_session()
        synced_count = 0
        try:
            for rec in records:
                success, _ = period_db.mark_period_attendance(
                    student_id=rec.get('studentId'),
                    name=rec.get('name'),
                    date_str=rec.get('date'),
                    period=rec.get('period'),
                    emotion=rec.get('emotion', 'Neutral'),
                    liveness_confidence=rec.get('livenessConfidence', 75.0),
                    recognition_confidence=rec.get('recognitionConfidence', 85.0),
                    is_live=True,
                    is_offline_sync=True,
                    db=db
                )
                if success:
                    synced_count += 1
            
            db.commit()
            if synced_count > 0:
                invalidate_cache()
            return jsonify({'success': True, 'syncedCount': synced_count})
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Sync error: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/engagement/heartbeat', methods=['POST', 'OPTIONS'])
@jwt_required()
def engagement_heartbeat():
    """Receive periodic engagement updates from the frontend."""
    try:
        data = request.get_json()
        student_id = data.get('studentId')
        session_id = data.get('sessionId')
        is_focused = data.get('isFocused', True)
        drowsiness = data.get('drowsinessDetected', False)
        
        if not student_id:
            return jsonify({'success': False, 'message': 'Student ID required'}), 400
            
        db = get_db_session()
        try:
            log = EngagementLog(
                student_id=student_id,
                session_id=session_id,
                is_focused=is_focused,
                drowsiness_detected=drowsiness,
                timestamp=datetime.utcnow()
            )
            db.add(log)
            db.commit()
            return jsonify({'success': True})
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/student/<student_id>/engagement', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_engagement_score(student_id):
    """Calculate and return engagement score for a student."""
    db = get_db_session()
    try:
        # Get logs from last 24 hours
        yesterday = datetime.utcnow() - timedelta(days=1)
        logs = db.query(EngagementLog).filter(
            EngagementLog.student_id == student_id,
            EngagementLog.timestamp >= yesterday
        ).all()
        
        if not logs:
            return jsonify({'success': True, 'score': 100, 'status': 'No data'})
            
        total = len(logs)
        focused = sum(1 for l in logs if l.is_focused)
        drowsy = sum(1 for l in logs if l.drowsiness_detected)
        
        # Simple formula: focused % - (drowsy penalty)
        score = (focused / total) * 100
        if drowsy > 0:
            score = max(0, score - (drowsy * 5))
            
        status = "Excellent"
        if score < 60: status = "Risk of academic decline"
        elif score < 80: status = "Needs attention"
        
        return jsonify({
            'success': True,
            'score': round(score, 1),
            'status': status,
            'logCount': total
        })
    finally:
        db.close()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    app.run(debug=False, port=port, host='0.0.0.0')