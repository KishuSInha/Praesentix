import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

import json
import base64
import gc
import sys
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, Response
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
import insightface
from insightface.app import FaceAnalysis

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

        # Check face_encodings table for multi-descriptor support
        cursor.execute("PRAGMA table_info(face_encodings)")
        fe_columns = [column[1] for column in cursor.fetchall()]
        
        if 'descriptor_index' not in fe_columns:
            print("[SCHEMA] Adding descriptor_index to face_encodings table...", flush=True)
            cursor.execute("ALTER TABLE face_encodings ADD COLUMN descriptor_index INTEGER DEFAULT 0")

        # Fix the old unique constraint on person_id
        try:
            cursor.execute("DROP INDEX IF EXISTS ix_face_encodings_person_id")
            cursor.execute("CREATE INDEX ix_face_encodings_person_id ON face_encodings (person_id)")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS unique_person_descriptor ON face_encodings (person_id, descriptor_index)")
        except Exception as idx_err:
            print(f"[SCHEMA WARNING] Could not modify indexes: {str(idx_err)}", flush=True)

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
                return f"{parts[2]}-{parts[1]}-{parts[0]}"
        except:
            pass
    return date_str

# ───── InsightFace Pipeline: SCRFD → ArcFace ─────────────────────────────────
# buffalo_l = SCRFD-10GF detector + ArcFace-R100 recogniser
# Trained on millions of faces; native ONNX inference (no TensorFlow needed)
PERFORMANCE_MODE = os.getenv('PERFORMANCE_MODE', 'QUALITY')

FACE_RECOGNITION_THRESHOLD = 0.45 if PERFORMANCE_MODE == 'QUALITY' else 0.38
MODEL_NAME = 'buffalo_l'  # InsightFace model pack (SCRFD + ArcFace)

# Classroom Recognition Tuning
MIN_FACE_PX = 64             # Min face size in pixels (increased for ArcFace quality)
MIN_DETECT_CONF = 0.22       # SCRFD detection confidence threshold
SHADOW_BOOST_ENABLED = True  # CLAHE for poorly lit classrooms
AMBIGUITY_GAP = 0.03         # Tighter gap for 70-student pool
MAX_DESCRIPTORS_PER_STUDENT = 5  # Multi-descriptor enrollment

# ── Init InsightFace (downloads buffalo_l on first run) ──────────────────────
logger.info("[INIT] Loading InsightFace SCRFD + ArcFace (buffalo_l)...")
_face_app = FaceAnalysis(name='buffalo_l', root=os.path.expanduser('~/.insightface'))
_face_app.prepare(ctx_id=0, det_size=(640, 640), det_thresh=0.4)
logger.info("[INIT] InsightFace models loaded successfully")

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'praesentix-super-secret-key-at-least-32-characters-long')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
jwt = JWTManager(app)

CORS(
    app,
    resources={r"/api/*": {"origins": ["https://praesentix-ty5d.vercel.app", "http://localhost:5173", "http://localhost:8080", "http://localhost:8081"]}},
    supports_credentials=True
)

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
    }), 401 

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
    
   
    print(f"[DEBUG] Request: {request.method} {request.path}", flush=True)
    if request.method != 'OPTIONS':
        auth_header = request.headers.get('Authorization', '')
        important_headers = {
            'Origin': request.headers.get('Origin'),
            'Content-Type': request.headers.get('Content-Type'),
            'Authorization': f"{auth_header[:15]}..." if auth_header else 'None'
        }
        print(f"[DEBUG] Headers: {important_headers}", flush=True)

    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        return response

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    # ✅ Permissive CORS for local development and specific production origins
    if origin:
        if 'localhost' in origin or '127.0.0.1' in origin or origin == "https://praesentix-ty5d.vercel.app":
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            response.headers["Access-Control-Allow-Origin"] = "https://praesentix-ty5d.vercel.app"
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
        
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Requested-With"
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
    """Trigger InsightFace model loading to avoid timeout on first real request."""
    print("[DEBUG] Warmup started: Pre-loading InsightFace SCRFD + ArcFace...", flush=True)
    try:
        # Trigger model loading via a dummy 640x640 BGR image
        dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
        _face_app.get(dummy_img)
        print("[DEBUG] Warmup successful! Model: InsightFace buffalo_l (SCRFD + ArcFace)", flush=True)
        return jsonify({'success': True, 'message': f'Models warmed up: InsightFace {MODEL_NAME}'})
    except Exception as e:
        print(f"[ERROR] Warmup failed: {str(e)}", flush=True)
        return jsonify({'success': False, 'message': str(e)}), 500
def get_db_session():
    return next(get_db())

# ===== Face Recognition Helper Functions (InsightFace: SCRFD + ArcFace) =====

def calculate_motion_score(frames):
    """Calculate motion score between consecutive frames using absdiff.
    Optimized: grayscale + blur to reduce noise.
    """
    if len(frames) < 2:
        return 100.0

    diffs = []
    for i in range(len(frames) - 1):
        gray1 = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frames[i+1], cv2.COLOR_BGR2GRAY)
        blur1 = cv2.GaussianBlur(gray1, (5, 5), 0)
        blur2 = cv2.GaussianBlur(gray2, (5, 5), 0)
        diff = cv2.absdiff(blur1, blur2)
        diff_score = float(np.mean(diff))
        diffs.append(diff_score)
        logger.info(f"[MOTION] Frame {i}->{i+1} score: {diff_score:.4f}")

    avg_score = float(np.mean(diffs))
    logger.info(f"[MOTION] Final Score: {avg_score:.4f}")
    return avg_score


# ===== Accuracy Enhancement Helpers =====

def _is_frame_sharp(image_bgr, min_variance: float = 15.0) -> bool:
    """
    Reject blurry frames using Laplacian variance.
    Lowered from 25.0 to 15.0 for RTSP stability (less frame rejection).
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    logger.info(f"[SHARP] Frame Laplacian variance: {variance:.1f} (min={min_variance})")
    return variance >= min_variance


def _apply_shadow_boost(image_bgr):
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to
    enhance visibility in shadows/dark areas without over-brightening light areas.
    """
    try:
        lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    except Exception as e:
        logger.warning(f"[BOOST] Shadow boost failed: {e}")
        return image_bgr


def get_face_encodings_from_image(image):
    """
    Detect faces with InsightFace SCRFD, get ArcFace embeddings.
    Returns a list of 512-d numpy float32 arrays (one per detected face).

    Pipeline:
        1. SCRFD face detector → bounding boxes + landmarks
        2. InsightFace internal alignment → 112×112 aligned crop
        3. ArcFace recognizer → 512-d embedding vector
    """
    try:
        img_h, img_w = image.shape[:2]
        logger.info(f"[ENCODE] Input image shape: {image.shape}")

        # InsightFace expects BGR input (OpenCV default)
        faces = _face_app.get(image)

        if not faces:
            logger.warning("[ENCODE] InsightFace: no faces detected")
            return []

        logger.info(f"[ENCODE] InsightFace detected {len(faces)} face(s)")
        encodings = []

        for idx, face in enumerate(faces):
            # ── Quality Gate 1: Detection confidence ────────────────────────────────
            det_score = face.det_score
            if det_score < MIN_DETECT_CONF:
                logger.warning(f"[ENCODE] Face {idx}: low detection confidence {det_score:.2f} < {MIN_DETECT_CONF}, skipping")
                continue

            # ── Quality Gate 2: Minimum face size ──────────────────────────────────
            bbox = face.bbox.astype(int)
            face_w = bbox[2] - bbox[0]
            face_h = bbox[3] - bbox[1]
            if face_w < MIN_FACE_PX or face_h < MIN_FACE_PX:
                logger.warning(f"[ENCODE] Face {idx}: too small ({face_w}x{face_h}px < {MIN_FACE_PX}px), skipping")
                continue

            # ── Quality Gate 3: Face area ratio ────────────────────────────────────
            face_area_ratio = (face_w * face_h) / (img_h * img_w)
            if face_area_ratio < 0.004:
                logger.warning(f"[ENCODE] Face {idx}: area ratio {face_area_ratio:.4f} < 0.004, skipping")
                continue

            # ── Quality Gate 4: Head Pose Coarse Filter ────────────────────────────
            # InsightFace provides pose estimation (yaw, pitch, roll)
            if hasattr(face, 'pose') and face.pose is not None:
                yaw, pitch, roll = face.pose
                logger.debug(f"[ENCODE] Face {idx}: Pose yaw={yaw:.1f}, pitch={pitch:.1f}, roll={roll:.1f}")
                if abs(yaw) > 60 or abs(pitch) > 45 or abs(roll) > 30:
                    logger.warning(f"[ENCODE] Face {idx}: extreme pose skipped")
                    continue

            # ── Quality Gate 5: Brightness check on face crop ─────────────────────
            x1, y1 = max(0, bbox[0]), max(0, bbox[1])
            x2, y2 = min(img_w, bbox[2]), min(img_h, bbox[3])
            face_crop = image[y1:y2, x1:x2]
            if face_crop.size > 0:
                face_brightness = float(np.mean(face_crop))
                logger.debug(f"[ENCODE] Face {idx}: Brightness {face_brightness:.1f}")
                if face_brightness < 40.0:
                    logger.warning(f"[ENCODE] Face {idx}: too dark, skipping")
                    continue

            # InsightFace already provides normalized embedding via .normed_embedding
            emb = face.normed_embedding
            if emb is not None:
                encodings.append(emb.astype(np.float32))
                logger.info(f"[ENCODE] Face {idx}: ArcFace embedding dim={len(emb)}, score={det_score:.2f}, pose_y={face.pose[0]:.1f}")
            else:
                logger.warning(f"[ENCODE] Face {idx}: no embedding returned")

        return encodings

    except Exception as e:
        logger.error(f"[ERROR] get_face_encodings_from_image: {e}", exc_info=True)
        return []

def find_matching_faces_batch(encodings, db, threshold=None):
    """
    Multi-descriptor batch recognition using NumPy broadcasting.
    Each student can have up to MAX_DESCRIPTORS_PER_STUDENT stored embeddings.
    For each query face, we find the highest similarity across ALL descriptors
    of ALL students, then pick the best student.
    """
    try:
        if threshold is None:
            threshold = FACE_RECOGNITION_THRESHOLD
        if not encodings:
            logger.info("Batch match: No input encodings")
            return []

        stored_faces = db.query(FaceEncoding).all()
        logger.info(f"Batch match: {len(stored_faces)} stored descriptors found in DB")
        if not stored_faces:
            return [(None, 0)] * len(encodings)

        # 1. Prepare stored embeddings matrix (N x D) and track which person each belongs to
        stored_person_ids = []   # person_id for each row
        stored_matrix = []
        EXPECTED_DIM = 512
        for face in stored_faces:
            if not face.embedding:
                continue
            emb = np.array(json.loads(face.embedding)) if isinstance(face.embedding, str) else np.array(face.embedding)
            if emb.ndim != 1 or len(emb) != EXPECTED_DIM:
                logger.warning(f"[MATCH] Skipping {face.person_id}: bad embedding shape {emb.shape}")
                continue
            norm = np.linalg.norm(emb)
            if norm > 0:
                stored_matrix.append(emb / norm)
                stored_person_ids.append(face.person_id)

        if not stored_matrix:
            return [(None, 0)] * len(encodings)

        stored_matrix = np.array(stored_matrix, dtype=np.float32)  # (N, 512)

        # 2. Prepare detected embeddings matrix (M x D)
        detected_matrix = []
        for enc in encodings:
            emb = np.array(enc)
            norm = np.linalg.norm(emb)
            detected_matrix.append(emb / norm if norm > 0 else emb)
        detected_matrix = np.array(detected_matrix, dtype=np.float32)  # (M, 512)

        # 3. Compute Cosine Similarity Matrix (M, N)
        similarity_matrix = np.dot(detected_matrix, stored_matrix.T)

        # 4. For each query face, find best student (across all their descriptors)
        # Build unique person list and find best similarity per person
        unique_persons = list(dict.fromkeys(stored_person_ids))  # preserves order

        results = []
        for i in range(len(encodings)):
            # For each unique person, find their best matching descriptor
            person_best_sim = {}
            for j, pid in enumerate(stored_person_ids):
                sim = similarity_matrix[i][j]
                if pid not in person_best_sim or sim > person_best_sim[pid]:
                    person_best_sim[pid] = sim

            # Sort persons by their best similarity (descending)
            sorted_persons = sorted(person_best_sim.items(), key=lambda x: x[1], reverse=True)

            best_person, best_similarity = sorted_persons[0]
            best_distance = 1 - best_similarity

            second_person = sorted_persons[1][0] if len(sorted_persons) > 1 else "None"
            second_similarity = sorted_persons[1][1] if len(sorted_persons) > 1 else 0.0
            second_distance = 1 - second_similarity

            confidence = float(best_similarity * 100)

            # Log top 3 for debugging
            top_n = min(3, len(sorted_persons))
            msg = f"[MATCH] Face {i} top matches:\n"
            for j in range(top_n):
                pid, sim = sorted_persons[j]
                msg += f"  {j+1}. {pid} (sim: {sim:.4f}, dist: {1-sim:.4f})\n"
            logger.info(msg.strip())

            # ── Adaptive Threshold ────────────────────────────────────────
            if best_similarity >= 0.80:
                adaptive_threshold = threshold + 0.07
            elif best_similarity >= 0.65:
                adaptive_threshold = threshold
            else:
                adaptive_threshold = threshold - 0.05
            logger.info(f"[MATCH] Face {i}: best_sim={best_similarity:.3f} → adaptive_threshold={adaptive_threshold:.3f}")

            # ── Ambiguity Check ───────────────────────────────────────────
            is_ambiguous = (len(sorted_persons) > 1 and (second_distance - best_distance) < AMBIGUITY_GAP)

            if is_ambiguous and best_distance <= adaptive_threshold:
                logger.warning(f"[AMBIGUOUS] {best_person} vs {second_person} too close (gap: {second_distance - best_distance:.4f} < {AMBIGUITY_GAP}). Rejecting.")
                results.append((None, confidence))
            elif best_distance <= adaptive_threshold:
                results.append((best_person, confidence))
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

# ===== IoU-Based Multi-Frame Face Tracking =====

def _get_face_data_from_image(image):
    """
    Like get_face_encodings_from_image but also returns bounding boxes for IoU tracking.
    Returns list of (embedding_np, (x1, y1, x2, y2)) tuples.
    Uses InsightFace SCRFD + ArcFace.
    """
    try:
        img_h, img_w = image.shape[:2]
        faces = _face_app.get(image)

        if not faces:
            return []

        results_out = []
        for face in faces:
            if face.det_score < MIN_DETECT_CONF:
                continue
            bbox = face.bbox.astype(int)
            face_w = bbox[2] - bbox[0]
            face_h = bbox[3] - bbox[1]
            if face_w < MIN_FACE_PX or face_h < MIN_FACE_PX:
                continue
            face_area_ratio = (face_w * face_h) / (img_h * img_w)
            if face_area_ratio < 0.004:
                continue
            # Head pose filter
            if hasattr(face, 'pose') and face.pose is not None:
                yaw, pitch, roll = face.pose
                if abs(yaw) > 60 or abs(pitch) > 45 or abs(roll) > 30:
                    continue

            emb = face.normed_embedding
            if emb is not None:
                box = (bbox[0], bbox[1], bbox[2], bbox[3])
                results_out.append((emb.astype(np.float32), box))
        return results_out
    except Exception as e:
        logger.error(f"[TRACK] _get_face_data_from_image error: {e}")
        return []


def _compute_iou(boxA, boxB):
    """Compute Intersection over Union of two (x1,y1,x2,y2) boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    inter = max(0, xB - xA) * max(0, yB - yA)
    areaA = (boxA[2]-boxA[0]) * (boxA[3]-boxA[1])
    areaB = (boxB[2]-boxB[0]) * (boxB[3]-boxB[1])
    union = areaA + areaB - inter
    return inter / union if union > 0 else 0.0


def _average_embeddings_across_frames(frames):
    """
    IoU-based multi-frame embedding averaging:
    - Detects faces in each frame with bounding boxes + embeddings.
    - Matches faces across frames using IoU (overlap), not dangerous index order.
    - Averages matched embeddings per tracked face for stability.
    
    Safe for classrooms where students may shift slightly between frames.
    """
    IOU_MATCH_THRESHOLD = 0.40  # Overlap required to consider same person

    # --- Step 1: collect per-frame face data ---
    per_frame_data = []  # list of lists of (emb, box)
    for i, frame in enumerate(frames):
        if not _is_frame_sharp(frame):
            logger.warning(f"[TRACK] Frame {i}: blurry, skipping")
            continue
        face_data = _get_face_data_from_image(frame)
        if face_data:
            per_frame_data.append(face_data)
            logger.info(f"[TRACK] Frame {i}: {len(face_data)} face(s) detected")

    if not per_frame_data:
        return []

    if len(per_frame_data) == 1:
        # Only one good frame — return its embeddings directly
        return [fd[0] for fd in per_frame_data[0]]

    # --- Step 2: Use Frame 0 as anchor, match all subsequent frames by IoU ---
    # tracks: list of {'boxes': [box0, box1, ...], 'embs': [emb0, emb1, ...]}
    tracks = [{'boxes': [fd[1]], 'embs': [fd[0]]} for fd in per_frame_data[0]]

    for frame_idx in range(1, len(per_frame_data)):
        curr_faces = per_frame_data[frame_idx]  # list of (emb, box)
        matched_curr = set()

        for track in tracks:
            # Use the latest known box of this track as reference
            last_box = track['boxes'][-1]
            best_iou = 0.0
            best_ci = -1
            for ci, (emb, box) in enumerate(curr_faces):
                if ci in matched_curr:
                    continue
                iou = _compute_iou(last_box, box)
                if iou > best_iou:
                    best_iou = iou
                    best_ci = ci
            if best_ci >= 0 and best_iou >= IOU_MATCH_THRESHOLD:
                emb, box = curr_faces[best_ci]
                track['boxes'].append(box)
                track['embs'].append(emb)
                matched_curr.add(best_ci)

        # New faces (not matched to existing tracks) → start new tracks
        for ci, (emb, box) in enumerate(curr_faces):
            if ci not in matched_curr:
                tracks.append({'boxes': [box], 'embs': [emb]})

    # --- Step 3: Average embeddings per track ---
    averaged = []
    for ti, track in enumerate(tracks):
        face_embs = track['embs']
        if PERFORMANCE_MODE == 'SPEED' and len(face_embs) > 1:
            avg_emb = face_embs[len(face_embs)//2]
        else:
            avg_emb = np.mean(face_embs, axis=0).astype(np.float32)
        averaged.append(avg_emb)
        logger.info(f"[TRACK] Face track {ti}: averaged {len(face_embs)} embeddings")

    return averaged



def process_face_recognition(frames, period, date, db, is_rtsp=False, skip_db=False):
    """
    Core logic to process frames for face recognition.
    Args:
        frames: List of decoded OpenCV images (BGR).
        period: Class period string.
        date: Date string YYYY-MM-DD.
        db: Database session.
        is_rtsp: If True, bypasses motion-based liveness/anti-spoofing checks.
        skip_db: If True, only returns detected faces without marking attendance.
    Returns:
        JSON compatible dictionary with results.
    """
    if not frames:
        return {'success': False, 'message': 'No frames provided'}

    # For RTSP, we strictly bypass motion scoring and assume LIVE
    # Device cameras will still use motion scoring
    if is_rtsp:
        is_live_motion = True
        liveness_confidence = 99.0
        motion_score = 1.0
    else:
        motion_score = calculate_motion_score(frames)
        is_live_motion = True if (len(frames) > 1 and motion_score > 0.4) else False
        liveness_confidence = min(99.0, 70.0 + (motion_score * 10)) if is_live_motion else 30.0

    logger.info(f"Recognition: {len(frames)} frame(s), motion_score: {motion_score:.4f}, is_live: {is_live_motion}")

    try:
        # ── Multi-frame embedding averaging (3 frames → 1 averaged embedding per face) ──
        try:
            if len(frames) > 1:
                logger.info("[RECOGNITION] Using multi-frame embedding averaging")
                face_encodings = _average_embeddings_across_frames(frames)
            else:
                logger.info("[RECOGNITION] Single frame — direct encoding")
                face_encodings = get_face_encodings_from_image(frames[0])
        except Exception as encoding_error:
            logger.error(f"Encoding failed: {str(encoding_error)}")
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
            student_user = None
            person_id, confidence = match_results[i]
            
            if person_id:
                name, roll_number = parse_person_id(person_id)
                student_user = db.query(User).filter(User.student_id == roll_number).first()
                
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

                # Only mark attendance if LIVE and not skipping DB
                if is_live_motion and not skip_db:
                    # Update User Trust Score
                    if student_user:
                        student_user.trust_score = max(0.0, min(100.0, student_user.trust_score + trust_impact))
                    
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
                    
                    t_score = student_user.trust_score if student_user else 100.0
                    if t_score is None: t_score = 100.0
                    detected_face['currentTrustScore'] = float(round(t_score, 1))
                    logger.info(f"User {roll_number} trust score: {detected_face['currentTrustScore']} (User found: {student_user is not None})")
                elif is_live_motion and skip_db:
                    # We are in recognition-only mode (e.g. background worker)
                    detected_face['attendanceMarked'] = False
                    detected_face['attendanceAlreadyMarked'] = False
                    t_score = student_user.trust_score if student_user else 100.0
                    detected_face['currentTrustScore'] = float(round(t_score if t_score is not None else 100.0, 1))
                else:
                    # Even if spoofed, we penalize the suspected user if found
                    if student_user and not skip_db:
                        student_user.trust_score = max(0.0, min(100.0, student_user.trust_score + trust_impact))
                    
                    detected_face['attendanceMarked'] = False
                    detected_face['attendanceAlreadyMarked'] = False
                    
                    t_score = student_user.trust_score if student_user else 100.0
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
                    # Do NOT downscale 720p (1280×720) — keep full resolution for detection.
                    # ArcFace input is always 112×112 regardless; more source pixels = better crop.
                    # Only cap extreme resolutions (>1920) to prevent OOM.
                    h, w = frame.shape[:2]
                    if max(h, w) > 1920:
                        scale = 1920 / max(h, w)
                        frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
                    decoded_frames.append(frame)
            
            if not decoded_frames:
                return jsonify({'success': False, 'message': 'Failed to decode any images'}), 400
                
        except Exception as e:
            logger.error(f"Image decode error: {str(e)}")
            return jsonify({'success': False, 'message': f'Image decode error: {str(e)}'}), 400
        
        db = get_db_session()
        try:
            result = process_face_recognition(decoded_frames, period, date, db, is_rtsp=False)
            status_code = 200 if result.get('success', False) else 500
            if 'validation failed' in str(result.get('message', '')).lower(): status_code = 400
            return jsonify(result), status_code
        finally:
            db.close()
            # Explicitly clear large objects and trigger GC
            if 'decoded_frames' in locals(): del decoded_frames
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
        
        import re

        # ── Extract IP — support rtsp://IP:port, rtsp://:@IP:port, rtsp://user:pass@IP:port ──
        # NOTE: Do NOT strip empty credentials — some cameras accept rtsp://:@IP but reject rtsp://IP
        ip_pattern = r'(?:@|rtsp://)[^@]*?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):'
        ip_match = re.search(ip_pattern, rtsp_url)
        # Fallback: plain rtsp://IP:port without any credentials
        if not ip_match:
            ip_pattern2 = r'rtsp://(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):'
            ip_match = re.search(ip_pattern2, rtsp_url)
        
        if not ip_match:
            return jsonify({
                'success': False, 
                'message': 'Invalid RTSP URL format. Use: rtsp://IP:port/path  or  rtsp://user:pass@IP:port/path'
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
        
        # Configure OpenCV for RTSP — TCP transport is more reliable than UDP
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

        # Quick socket check — distinguish offline vs wrong credentials (401)
        import socket as _socket, re as _re2
        _p_match = _re2.search(r':(\d{2,5})/', rtsp_url)
        _p = int(_p_match.group(1)) if _p_match else 554
        try:
            _s = _socket.create_connection((ip_address, _p), timeout=3)
            _s.close()
        except (TimeoutError, ConnectionRefusedError, OSError):
            return jsonify({'success': False,
                'message': f'Camera at {ip_address}:{_p} is unreachable. '
                           f'Ensure it is powered on and on the same network.'}), 400

        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 8000)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not cap.isOpened():
             logger.error(f"[RTSP] Failed to open stream: {rtsp_url}")
             return jsonify({'success': False,
                 'message': f'Camera at {ip_address} is online but rejected the stream. '
                            f'This usually means wrong username/password. '
                            f'Try: rtsp://admin:YOUR_PASSWORD@{ip_address}:554/stream1  '
                            f'Check the sticker on your camera for the default password.'}), 400
             
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
            
        # Encode as JPEG
        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
        b64_image = base64.b64encode(buffer).decode('utf-8')
        
        logger.info(f"[RTSP] Successfully captured frame from {ip_address}")
        return jsonify({
            'success': True,
            'image': b64_image
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'RTSP Error: {str(e)}'}), 500

# Global state for RTSP stream to allow recognition without opening a second connection
import threading
import time

rtsp_global_state = {
    'url': None,
    'frame': None,
    'cap': None,
    'lock': threading.Lock(),
    'last_accessed': 0,
    'thread': None,
    'running': False,
    # New fields for background recognition
    'recognition_running': False,
    'recognition_period': None,
    'recognition_thread': None,
    'last_marked': {},  # student_id -> last_marked_timestamp
    'confirmation_hits': {}, # student_id -> count of hits in current session
    'latest_detections': [] # BUF: most recent faces seen
}

def _rtsp_recognition_worker():
    """Background thread that periodically takes the latest RTSP frame and runs recognition."""
    logger.info("[RTSP Worker] Background recognition worker started")
    
    while rtsp_global_state['recognition_running']:
        try:
            current_frame = None
            with rtsp_global_state['lock']:
                if rtsp_global_state['frame'] is not None:
                    current_frame = rtsp_global_state['frame'].copy()
            
            if current_frame is not None:
                db = get_db_session()
                try:
                    period = rtsp_global_state['recognition_period'] or "1st Period"
                    date_str = datetime.now().strftime('%Y-%m-%d')
                    
                    # Run recognition on the single frame (skip_db=True so we can filter by confidence here)
                    result = process_face_recognition(
                        frames=[current_frame],
                        period=period,
                        date=date_str,
                        db=db,
                        is_rtsp=True,
                        skip_db=True
                    )
                    
                    detected = result.get("detectedFaces", [])
                    
                    # Update live buffer for frontend "Continuous" view
                    with rtsp_global_state['lock']:
                        rtsp_global_state['latest_detections'] = detected
                    
                    if not detected:
                        logger.debug("[RTSP Worker] Scanning... No faces detected.")
                    else:
                        logger.info(f"[RTSP Worker] Detected {len(detected)} potential face(s)")
                    
                    # Track students seen in THIS frame with sufficient confidence
                    current_frame_students = []
                    for face in detected:
                        if face["name"] != "Unknown" and face.get("recognitionConfidence", 0) >= 70:
                            current_frame_students.append(face)
                    
                    for face in current_frame_students:
                        student_id = face["rollNumber"]
                        now = time.time()
                        last_time = rtsp_global_state['last_marked'].get(student_id, 0)
                        
                        # Only process if not marked in the last 5 minutes
                        if now - last_time > 300:
                            # ── Temporal Confirmation Logic ───────────────────────
                            hits = rtsp_global_state['confirmation_hits'].get(student_id, 0) + 1
                            rtsp_global_state['confirmation_hits'][student_id] = hits
                            
                            if hits >= 2:
                                logger.info(f"[RTSP Worker] {face['name']} confirmed {hits}/2. Marking attendance.")
                                
                                # Perform actual marking
                                period_db.mark_period_attendance(
                                    student_id=student_id,
                                    name=face["name"],
                                    date_str=date_str,
                                    period=period,
                                    emotion=face['emotion'],
                                    liveness_confidence=face['livenessConfidence'],
                                    recognition_confidence=face['recognitionConfidence'],
                                    is_live=True,
                                    db=db
                                )
                                rtsp_global_state['last_marked'][student_id] = now
                                rtsp_global_state['confirmation_hits'][student_id] = 0 # Reset hit count
                            else:
                                logger.info(f"[RTSP Worker] {face['name']} detected (conf={face['recognitionConfidence']}%). Confirmation {hits}/2...")
                        else:
                            # Re-verify if we should clear hit count for recently marked students
                            rtsp_global_state['confirmation_hits'][student_id] = 0
                            
                    # Optional: reset hits for students NOT seen in this frame
                    # To prevent "stale" hits from confirming much later
                    all_ids = list(rtsp_global_state['confirmation_hits'].keys())
                    current_ids = {f["rollNumber"] for f in current_frame_students}
                    for sid in all_ids:
                        if sid not in current_ids and rtsp_global_state['confirmation_hits'].get(sid, 0) > 0:
                            # Simple decay: if not seen in this frame, reset hits
                            # This ensures they must be seen back-to-back or in very close succession
                            # Actually reset is safer for RTSP to prevent noise
                            rtsp_global_state['confirmation_hits'][sid] = 0
                            
                except Exception as e:
                    logger.error(f"[RTSP Worker] Recognition error: {e}")
                finally:
                    db.close()
            
            # Recognition interval: 1 second
            time.sleep(1)
            
        except Exception as outer_e:
            logger.error(f"[RTSP Worker] Fatal worker error: {outer_e}")
            time.sleep(2)
            
    logger.info("[RTSP Worker] Background recognition worker stopped")

def _rtsp_reader_thread():
    logger.info("[RTSP] Background reader thread started")
    while rtsp_global_state['running']:
        # Auto-shutdown if not accessed for 30 seconds
        if time.time() - rtsp_global_state['last_accessed'] > 30:
            logger.info("[RTSP] Stream timeout, shutting down background reader")
            break
            
        with rtsp_global_state['lock']:
            cap = rtsp_global_state['cap']
            if cap is None or not cap.isOpened():
                time.sleep(1)
                continue
                
            ret, frame = cap.read()
            if ret and frame is not None:
                rtsp_global_state['frame'] = frame.copy()
            else:
                # Reconnect logic could go here
                time.sleep(0.5)
                
        time.sleep(0.03) # Limit to ~30fps reading
        
    with rtsp_global_state['lock']:
        if rtsp_global_state['cap']:
            rtsp_global_state['cap'].release()
            rtsp_global_state['cap'] = None
        rtsp_global_state['running'] = False
        rtsp_global_state['frame'] = None
    logger.info("[RTSP] Background reader thread stopped")

def _ensure_rtsp_stream(rtsp_url):
    """Ensure the background RTSP reader is running for this URL."""
    with rtsp_global_state['lock']:
        rtsp_global_state['last_accessed'] = time.time()
        
        # If already running for this URL, just return
        if rtsp_global_state['running'] and rtsp_global_state['url'] == rtsp_url:
            return True
            
        # Stop existing stream if different URL
        if rtsp_global_state['running']:
            rtsp_global_state['running'] = False
            if rtsp_global_state['thread']:
                rtsp_global_state['thread'].join(timeout=2)
                
        # Start new stream
        import os
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)
        
        if not cap.isOpened():
            logger.error(f"[RTSP] Failed to open global stream: {rtsp_url}")
            return False
            
        rtsp_global_state['url'] = rtsp_url
        rtsp_global_state['cap'] = cap
        rtsp_global_state['running'] = True
        rtsp_global_state['frame'] = None
        
        thread = threading.Thread(target=_rtsp_reader_thread, daemon=True)
        rtsp_global_state['thread'] = thread
        thread.start()
        
        # Wait slightly for the thread to start, but don't fail the request if the
        # first frame takes a few seconds (some IP cameras are slow to decode keyframes)
        start_wait = time.time()
        while rtsp_global_state['frame'] is None and time.time() - start_wait < 1.0:
            time.sleep(0.1)
            
        return True


@app.route('/api/rtsp/stream', methods=['GET'])
def rtsp_stream():
    """Stream RTSP as MJPEG."""
    rtsp_url = request.args.get('url')
    
    if not rtsp_url:
        return jsonify({'success': False, 'message': 'RTSP URL is required'}), 400

    if not _ensure_rtsp_stream(rtsp_url):
        return jsonify({'success': False, 'message': 'Failed to connect to RTSP stream'}), 400

    def generate():
        while True:
            # Keep stream alive
            rtsp_global_state['last_accessed'] = time.time()
            
            if not rtsp_global_state['running']:
                break
                
            frame = None
            with rtsp_global_state['lock']:
                if rtsp_global_state['frame'] is not None:
                    frame = rtsp_global_state['frame'].copy()
                    
            if frame is None:
                time.sleep(0.1)
                continue
                
            h, w = frame.shape[:2]
            max_dim = 1280 # Full HD Preview
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
                
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            time.sleep(0.05) # ~20 FPS for MJPEG to save bandwidth
                           
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

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
        
        import re

        # ── Extract IP — support rtsp://IP:port, rtsp://:@IP:port, rtsp://user:pass@IP:port ──
        # NOTE: Do NOT strip empty credentials — some cameras accept rtsp://:@IP but reject rtsp://IP
        ip_pattern = r'(?:@|rtsp://)[^@]*?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):'
        ip_match = re.search(ip_pattern, rtsp_url)
        if not ip_match:
            ip_pattern2 = r'rtsp://(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):'
            ip_match = re.search(ip_pattern2, rtsp_url)
        
        if not ip_match:
            return jsonify({
                'success': False, 
                'message': 'Invalid RTSP URL. Use: rtsp://IP:port/path  or  rtsp://user:pass@IP:port/path'
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
        
        # Configure OpenCV for RTSP — try TCP transport first (more reliable than UDP)
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

        # ── Quick auth pre-check via RTSP DESCRIBE ─────────────────────────────
        # cv2.VideoCapture swallows the 401 and just reports isOpened()=False.
        # We ping the camera with a raw socket first to distinguish:
        #   Connection refused → camera offline / wrong port
        #   401 Unauthorized  → camera online but credentials wrong
        import socket, re as _re
        _host = ip_address
        _port = 554
        _port_match = _re.search(r':(\d{2,5})/', rtsp_url)
        if _port_match:
            _port = int(_port_match.group(1))
        try:
            _sock = socket.create_connection((_host, _port), timeout=3)
            _sock.close()
        except (socket.timeout, ConnectionRefusedError, OSError):
            return jsonify({'success': False,
                'message': f'Camera at {ip_address}:{_port} is not reachable. '
                           f'Check: 1) Camera is powered on, 2) It is on the same network, '
                           f'3) Port {_port} is open.'}), 400

        # Ensure global stream is running
        if not _ensure_rtsp_stream(rtsp_url):
            return jsonify({'success': False, 'message': 'Failed to connect to background RTSP stream.'}), 400

        frames = []
        import time
        
        # Keep stream alive
        rtsp_global_state['last_accessed'] = time.time()
        
        NUM_CAPTURE_FRAMES = 3 # Reduced from 5 to 3 for faster continuous polling
        for i in range(NUM_CAPTURE_FRAMES):
            frame_grabbed = False
            # Try up to 2 seconds to grab a fresh frame from the background thread
            for _attempt in range(20):
                with rtsp_global_state['lock']:
                    if rtsp_global_state['frame'] is not None:
                        frames.append(rtsp_global_state['frame'].copy())
                        frame_grabbed = True
                        break
                time.sleep(0.1)
                
            if frame_grabbed:
                logger.info(f"[RTSP Recognition] Captured cached frame {i+1}/{NUM_CAPTURE_FRAMES}")
            else:
                logger.warning(f"[RTSP Recognition] Frame {i+1}/{NUM_CAPTURE_FRAMES} read failed from cache (timeout)")
                
            time.sleep(0.3)  # 300ms gap between frames
        
        if not frames:
            logger.error(f"[RTSP Recognition] Failed to capture frames from: {rtsp_url}")
            return jsonify({'success': False, 'message': 'Failed to capture frames from stream. Camera may be offline.'}), 400
            
        logger.info(f"[RTSP Recognition] Captured {len(frames)} frames from {ip_address}")
            
        db = get_db_session()
        try:
            result = process_face_recognition(frames, period, date, db, is_rtsp=True, skip_db=False)
            status_code = 200 if result.get('success', False) else 500
            return jsonify(result), status_code
        finally:
            db.close()
            # Explicitly clear large objects and trigger GC
            if 'frames' in locals(): del frames
            gc.collect()

    except Exception as e:
        return jsonify({'success': False, 'message': f'RTSP Recognition Error: {str(e)}'}), 500

@app.route('/api/rtsp/start', methods=['POST', 'OPTIONS'])
@jwt_required()
def start_rtsp_recognition():
    """Start continuous background recognition for RTSP."""
    data = request.get_json()
    rtsp_url = data.get("rtspUrl")
    period = data.get("period")
    
    if not rtsp_url or not period:
        return jsonify({"success": False, "message": "RTSP URL and Period are required"}), 400

    # Ensure stream is running
    if not _ensure_rtsp_stream(rtsp_url):
         return jsonify({"success": False, "message": "Failed to connect to RTSP stream"}), 400

    with rtsp_global_state['lock']:
        if rtsp_global_state['recognition_running']:
            return jsonify({"success": True, "message": "Recognition already running"})

        rtsp_global_state['recognition_period'] = period
        rtsp_global_state['recognition_running'] = True
        rtsp_global_state['last_marked'] = {} # Reset session duplicates
        
        thread = threading.Thread(target=_rtsp_recognition_worker, daemon=True)
        rtsp_global_state['recognition_thread'] = thread
        thread.start()
    
    logger.info(f"[RTSP] Continuous recognition started for {period}")
    return jsonify({"success": True, "message": f"Continuous monitoring started for {period}"})

@app.route('/api/rtsp/stop', methods=['POST', 'OPTIONS'])
@jwt_required()
def stop_rtsp_recognition():
    """Stop continuous background recognition for RTSP."""
    rtsp_global_state['recognition_running'] = False
    logger.info("[RTSP] Continuous recognition stopped")
    return jsonify({"success": True, "message": "Continuous monitoring stopped"})

@app.route('/api/rtsp/detections', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_rtsp_detections():
    """Fetch the latest live detections from the background worker."""
    with rtsp_global_state['lock']:
        return jsonify({
            "success": True,
            "detectedFaces": rtsp_global_state['latest_detections']
        })

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
        today_present = db.query(func.count(Attendance.student_id.distinct())).filter(
            Attendance.date == today,
            Attendance.spoof_status == 'LIVE'
        ).scalar() or 0
        
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
        
        today_present = db.query(func.count(Attendance.student_id.distinct())).filter(
            Attendance.date == today,
            Attendance.spoof_status == 'LIVE'
        ).scalar() or 0
        
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
        
        if len(images) < 1:
            return jsonify({'success': False, 'message': 'At least 1 image required'}), 400
        
        # Extract ArcFace embeddings using InsightFace SCRFD + ArcFace pipeline
        all_encodings = []
        rejected_reasons = []
        for i, image_file in enumerate(images):
            image_bytes = image_file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                rejected_reasons.append(f"Image {i+1}: could not decode")
                continue

            # Cap extreme sizes (>1920) to prevent OOM
            h, w = image.shape[:2]
            if max(h, w) > 1920:
                scale = 1920 / max(h, w)
                image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

            # ── Enrollment Quality Gate: Sharpness ────────────────────────────
            if not _is_frame_sharp(image, min_variance=75.0):
                msg = f"Image {i+1}: rejected — too blurry (Laplacian < 75). Re-capture with better lighting."
                print(f"[ENROLL-QUALITY] {msg}", flush=True)
                rejected_reasons.append(msg)
                continue

            print(f"[ENROLL] Processing image {i+1}/{len(images)} with InsightFace SCRFD + ArcFace...", flush=True)
            encodings = get_face_encodings_from_image(image)
            if encodings:
                # Take first (largest / highest-confidence) face per enrollment image
                all_encodings.append(encodings[0])
                print(f"[ENROLL] Image {i+1}: embedding dim={len(encodings[0])}", flush=True)
            else:
                msg = f"Image {i+1}: no face detected (face too small or obscured)"
                print(f"[ENROLL-QUALITY] {msg}", flush=True)
                rejected_reasons.append(msg)

        if not all_encodings:
            reason_str = "; ".join(rejected_reasons) if rejected_reasons else "Face not detected"
            return jsonify({
                'success': False,
                'message': f'No usable face images found. Reasons: {reason_str}. Ensure: face is ≥48px wide, well-lit, sharp, and centred.'
            }), 400

        # ── Multi-Descriptor Storage ──────────────────────────────────────────
        # Store each enrollment image as a separate descriptor row (max 5).
        # This is more robust than averaging into one vector.
        person_id = f"ID-{student_id} - {student_name}"
        
        # Limit to MAX_DESCRIPTORS_PER_STUDENT
        encodings_to_store = all_encodings[:MAX_DESCRIPTORS_PER_STUDENT]
        
        db = get_db_session()
        try:
            # Delete ALL old descriptors for this person (clean re-enrollment)
            db.query(FaceEncoding).filter(FaceEncoding.person_id == person_id).delete()
            db.flush()
            
            # Insert one row per enrollment image
            for desc_idx, emb in enumerate(encodings_to_store):
                new_face = FaceEncoding(
                    person_id=person_id,
                    embedding=json.dumps(emb.tolist()),
                    descriptor_index=desc_idx,
                    num_images=len(encodings_to_store)
                )
                db.add(new_face)
            db.commit()
            
            return jsonify({
                'success': True,
                'message': f'Successfully enrolled {student_name} (ID: {student_id}) with {len(encodings_to_store)} descriptors (InsightFace ArcFace)'
            })
        except Exception as db_err:
            db.rollback()
            raise db_err
        finally:
            db.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Enrollment failed: {str(e)}'}), 500
    finally:
        # Manual garbage collection to prevent OOM
        if 'all_encodings' in locals(): del all_encodings
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