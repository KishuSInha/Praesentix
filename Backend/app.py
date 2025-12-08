import os
import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
from deepface import DeepFace
import DataBase_attendance as db
import period_attendance as period_db
from datetime import datetime
import csv
import sqlite3
import json
import math
from collections import Counter, deque
import threading
import time

# Initialize Flask app
app = Flask(__name__)
# Configure CORS to allow requests from the frontend
CORS(app, resources={r"/api/*": {
    "origins": ["*"],
    "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    "allow_headers": ["Content-Type", "Origin", "Accept", "Authorization"],
    "supports_credentials": False
}})# Database folder configuration - use root level Database folder
DATABASE_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Database')
if not os.path.exists(DATABASE_FOLDER):
    os.makedirs(DATABASE_FOLDER)
    print(f"✅ Created database folder at: {DATABASE_FOLDER}")
else:
    print(f"✅ Using existing database folder at: {DATABASE_FOLDER}")

# Directory to store known faces
KNOWN_FACES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'known_faces')

# Global variables for known faces and encodings
known_face_encodings = []
known_face_names = []
known_face_roll_numbers = []

# Enhanced face recognition variables
recognition_history = deque(maxlen=15)

# Enhanced emotion detection landmarks
EMOTION_LANDMARKS = {
    'mouth_outer': [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318],
    'mouth_inner': [78, 95, 88, 178, 87, 14, 317, 402, 318, 324],
    'left_eye': [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    'right_eye': [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
    'left_eyebrow': [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
    'right_eyebrow': [296, 334, 293, 300, 276, 283, 282, 295, 285, 336],
    'nose': [1, 2, 5, 4, 6, 168, 8, 9, 10, 151]
}

# --- Enhanced Database Setup ---
def setup_face_encodings_database(database_file=None):
    if database_file is None:
        database_file = os.path.join(DATABASE_FOLDER, "face_encodings.db")
    """Create the SQLite database and table for face encodings."""
    conn = sqlite3.connect(database_file)
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
    return conn

def setup_enhanced_attendance_database(database_file=None):
    """Create the SQLite database and table for enhanced attendance records."""
    if database_file is None:
        database_file = os.path.join(DATABASE_FOLDER, "enhanced_attendance.db")
    conn = sqlite3.connect(database_file)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS enhanced_attendance (
            serial_no INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            name TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            emotion TEXT NOT NULL,
            spoofing_status TEXT NOT NULL,
            liveliness_confidence REAL NOT NULL,
            recognition_confidence REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, date)
        )
    ''')
    
    conn.commit()
    return conn

def save_encoding_to_db(conn, person_id, encoding, num_images=1):
    """Save or update a face encoding in the database."""
    cursor = conn.cursor()
    encoding_json = json.dumps(encoding.tolist())
    
    cursor.execute('''
        INSERT OR REPLACE INTO face_encodings 
        (person_id, encoding_data, num_images, updated_at) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ''', (person_id, encoding_json, num_images))
    
    conn.commit()

def get_all_encodings_from_db(conn):
    """Get all face encodings from the database."""
    cursor = conn.cursor()
    cursor.execute('SELECT person_id, encoding_data FROM face_encodings')
    results = cursor.fetchall()
    
    encodings = {}
    for person_id, encoding_data in results:
        encoding = json.loads(encoding_data)
        encodings[person_id] = np.array(encoding, dtype=np.float32)
    
    return encodings

def load_known_faces():
    """
    Loads face encodings from the face_encodings database.
    """
    global known_face_encodings, known_face_names, known_face_roll_numbers
    
    print("Loading known faces from face_encodings database...")
    known_face_encodings = []
    known_face_names = []
    known_face_roll_numbers = []

    try:
        # Connect to face encodings database
        conn = setup_face_encodings_database()
        db_encodings = get_all_encodings_from_db(conn)
        conn.close()

        if not db_encodings:
            print("No face encodings found in the database.")
            return

        for person_id, encoding in db_encodings.items():
            known_face_encodings.append(encoding)
            # Parse person_id format: "ID-XXX - Name"
            parts = person_id.split(' - ')
            if len(parts) == 2:
                student_id = parts[0].replace('ID-', '')
                name = parts[1]
                known_face_roll_numbers.append(student_id)
                known_face_names.append(name)
            else:
                # Fallback for different formats
                if person_id.startswith('ID-'):
                    student_id = person_id.replace('ID-', '')
                    known_face_roll_numbers.append(student_id)
                    known_face_names.append(person_id)
                else:
                    known_face_roll_numbers.append(person_id)
                    known_face_names.append(person_id)
            
            print(f"Loaded: {person_id}")
        
        print(f"Successfully loaded {len(known_face_names)} known faces from database.")
        
    except Exception as e:
        print(f"Error loading faces from database: {e}")
        print("Falling back to empty face database.")

def update_known_faces():
    """
    Refreshes the known faces database by calling load_known_faces.
    """
    load_known_faces()

# --- Enhanced Face Recognition Functions ---
def get_enhanced_face_encoding(frame, face_landmarks):
    """Extract enhanced face encoding from landmarks."""
    if not face_landmarks:
        return None
    
    # Get all landmark coordinates
    landmark_points = []
    for landmark in face_landmarks.landmark:
        landmark_points.extend([landmark.x, landmark.y, landmark.z])
    
    # Calculate geometric features
    geometric_features = []
    h, w = frame.shape[:2]
    
    # Key facial distances for better recognition
    key_distances = [
        (1, 5),    # Nose bridge to forehead
        (33, 362), # Left to right eye
        (61, 291), # Mouth corners
        (10, 152), # Top to bottom face
        (234, 454) # Left to right cheek
    ]
    
    for p1_idx, p2_idx in key_distances:
        if p1_idx < len(face_landmarks.landmark) and p2_idx < len(face_landmarks.landmark):
            p1 = face_landmarks.landmark[p1_idx]
            p2 = face_landmarks.landmark[p2_idx]
            dist = math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)
            geometric_features.append(dist)
    
    # Face ratios for normalization
    face_width = abs(face_landmarks.landmark[234].x - face_landmarks.landmark[454].x)
    face_height = abs(face_landmarks.landmark[10].y - face_landmarks.landmark[152].y)
    
    if face_height > 0:
        face_ratio = face_width / face_height
        geometric_features.append(face_ratio)
    
    # Eye aspect ratios
    left_eye_points = [33, 160, 158, 133, 153, 144]
    right_eye_points = [362, 385, 387, 263, 373, 380]
    
    left_ear = calculate_eye_aspect_ratio(face_landmarks, left_eye_points)
    right_ear = calculate_eye_aspect_ratio(face_landmarks, right_eye_points)
    geometric_features.extend([left_ear, right_ear])
    
    # Combine features
    full_encoding = np.array(landmark_points + geometric_features, dtype=np.float32)
    return full_encoding

def calculate_eye_aspect_ratio(landmarks, eye_indices):
    """Calculate Eye Aspect Ratio."""
    if len(eye_indices) < 6:
        return 0.2
    
    points = np.array([[landmarks.landmark[i].x, landmarks.landmark[i].y] for i in eye_indices])
    
    # Vertical distances
    v1 = np.linalg.norm(points[1] - points[5])
    v2 = np.linalg.norm(points[2] - points[4])
    
    # Horizontal distance
    h = np.linalg.norm(points[0] - points[3])
    
    if h == 0:
        return 0.2
    
    ear = (v1 + v2) / (2.0 * h)
    return ear

def advanced_face_comparison(encoding1, encoding2, threshold=0.15):
    """Advanced face comparison with multiple distance metrics."""
    if encoding1 is None or encoding2 is None:
        return False, 0.0
    
    # Ensure same length
    min_len = min(len(encoding1), len(encoding2))
    enc1 = encoding1[:min_len]
    enc2 = encoding2[:min_len]
    
    # Multiple distance calculations
    euclidean_dist = np.linalg.norm(enc1 - enc2)
    cosine_sim = np.dot(enc1, enc2) / (np.linalg.norm(enc1) * np.linalg.norm(enc2) + 1e-8)
    
    # Normalize distances
    euclidean_normalized = euclidean_dist / np.sqrt(len(enc1))
    cosine_distance = 1 - cosine_sim
    
    # Combined distance
    final_distance = (euclidean_normalized * 0.7 + cosine_distance * 0.3)
    
    is_match = final_distance < threshold
    confidence = max(0.0, min(1.0, (1.0 - final_distance / threshold) * 100))
    
    return is_match, confidence

def detect_emotion_realtime(landmarks):
    """Real-time emotion detection from facial landmarks."""
    try:
        emotion_scores = {
            "Happy": 0,
            "Sad": 0,
            "Angry": 0,
            "Surprised": 0,
            "Neutral": 0,
            "Fear": 0
        }
        
        # Mouth analysis for emotions
        mouth_outer = EMOTION_LANDMARKS['mouth_outer']
        mouth_points = []
        
        for idx in mouth_outer:
            if idx < len(landmarks.landmark):
                point = landmarks.landmark[idx]
                mouth_points.append([point.x, point.y])
        
        if len(mouth_points) >= 8:
            mouth_points = np.array(mouth_points)
            
            # Calculate mouth curvature (smile/frown detection)
            left_corner = mouth_points[0]
            right_corner = mouth_points[6]
            top_lip = mouth_points[2]
            bottom_lip = mouth_points[8] if len(mouth_points) > 8 else mouth_points[4]
            
            # Mouth width and height
            mouth_width = np.linalg.norm(left_corner - right_corner)
            mouth_height = np.linalg.norm(top_lip - bottom_lip)
            
            # Mouth curvature (positive = smile, negative = frown)
            lip_center_y = (top_lip[1] + bottom_lip[1]) / 2
            corner_avg_y = (left_corner[1] + right_corner[1]) / 2
            mouth_curve = corner_avg_y - lip_center_y
            
            # Mouth openness ratio
            if mouth_width > 0:
                mouth_ratio = mouth_height / mouth_width
                
                # Emotion scoring based on mouth
                if mouth_ratio > 0.05:  # Open mouth
                    emotion_scores["Surprised"] += 3
                    if mouth_curve < -0.01:
                        emotion_scores["Happy"] += 2
                elif mouth_curve < -0.008:  # Strong upward curve (smile)
                    emotion_scores["Happy"] += 4
                elif mouth_curve > 0.008:  # Downward curve (frown)
                    emotion_scores["Sad"] += 3
                    emotion_scores["Angry"] += 1
        
        # Set default neutral if no strong emotion detected
        if max(emotion_scores.values()) < 2:
            emotion_scores["Neutral"] = 5
        
        # Return dominant emotion
        dominant_emotion = max(emotion_scores, key=emotion_scores.get)
        return dominant_emotion
        
    except Exception as e:
        print(f"Error in emotion detection: {str(e)}")
        return "Neutral"

def detect_liveness(frame, face_landmarks=None):
    """Enhanced liveness detection with multiple checks."""
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        
        # 1. Texture Analysis (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # 2. Color diversity check (photos/screens have less color variation)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        color_std = np.std(hsv[:, :, 1])  # Saturation channel
        
        # 3. Edge density (real faces have more natural edges)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / (h * w)
        
        # 4. Frequency analysis (detect screen patterns)
        dft = cv2.dft(np.float32(gray), flags=cv2.DFT_COMPLEX_OUTPUT)
        dft_shift = np.fft.fftshift(dft)
        magnitude = cv2.magnitude(dft_shift[:,:,0], dft_shift[:,:,1])
        freq_score = np.mean(magnitude[h//4:3*h//4, w//4:3*w//4])
        
        # 5. Depth analysis using Z-coordinates (if available)
        z_variance = 0
        z_range = 0
        if face_landmarks:
            z_coords = [landmark.z for landmark in face_landmarks.landmark]
            z_variance = np.var(z_coords)
            z_range = max(z_coords) - min(z_coords)
        
        # Scoring system (more lenient for real faces)
        liveness_score = 0.0
        
        # Texture score (0-30 points) - Real faces have texture
        if laplacian_var > 300:
            liveness_score += 30
        elif laplacian_var > 150:
            liveness_score += 25
        elif laplacian_var > 80:
            liveness_score += 20
        else:
            liveness_score += max(0, laplacian_var / 5)
        
        # Color diversity score (0-25 points) - Real faces have color variation
        if color_std > 20:
            liveness_score += 25
        elif color_std > 10:
            liveness_score += 20
        else:
            liveness_score += max(0, color_std * 1.5)
        
        # Edge density score (0-20 points) - Real faces have natural edges
        if 0.03 < edge_density < 0.35:
            liveness_score += 20
        elif 0.02 < edge_density < 0.4:
            liveness_score += 15
        else:
            liveness_score += 10
        
        # Frequency score (0-15 points) - Lower frequency = more natural
        if freq_score < 80:
            liveness_score += 15
        elif freq_score < 150:
            liveness_score += 10
        else:
            liveness_score += max(0, 15 - (freq_score - 150) / 30)
        
        # Depth score (0-10 points) - Optional, helps if available
        if z_variance > 0.0008:
            liveness_score += 7
        elif z_variance > 0.0003:
            liveness_score += 5
        
        if z_range > 0.025:
            liveness_score += 3
        elif z_range > 0.015:
            liveness_score += 2
        
        # Determine if live (threshold: 55/100 - more lenient)
        is_live = liveness_score >= 55
        
        # Debug logging
        print(f"Liveness Analysis: Texture={laplacian_var:.1f}, Color={color_std:.1f}, "
              f"Edge={edge_density:.3f}, Freq={freq_score:.1f}, Score={liveness_score:.1f}, Live={is_live}")
        
        return is_live, min(99.0, liveness_score)
        
    except Exception as e:
        print(f"Error in liveness detection: {str(e)}")
        return False, 40.0

def mark_enhanced_attendance(name, student_id, emotion, liveness_confidence, recognition_confidence, is_live):
    """Mark attendance in enhanced database."""
    if name == "Unknown" or not student_id:
        print(f"Cannot mark attendance - Invalid name or student_id: {name}, {student_id}")
        return False
    
    print(f"Connecting to enhanced attendance database...")
    
    try:
        conn = setup_enhanced_attendance_database()
        cursor = conn.cursor()
        
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M:%S")
        spoofing_status = "LIVE" if is_live else "SPOOFED"
        
        print(f"Checking for existing attendance for {student_id} on {date_str}")
        
        # Check for duplicate
        cursor.execute('SELECT COUNT(*) FROM enhanced_attendance WHERE student_id = ? AND date = ?', 
                      (student_id, date_str))
        
        existing_count = cursor.fetchone()[0]
        print(f"Existing attendance records for today: {existing_count}")
        
        if existing_count > 0:
            print(f"Attendance already marked for {name} (ID: {student_id}) today")
            conn.close()
            return False
        
        print(f"Inserting new attendance record...")
        
        # Insert new record
        cursor.execute('''
            INSERT INTO enhanced_attendance (student_id, name, date, time, emotion, spoofing_status, 
                                  liveliness_confidence, recognition_confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (student_id, name, date_str, time_str, emotion, spoofing_status, 
              liveness_confidence, recognition_confidence))
        
        conn.commit()
        print(f"✅ Enhanced attendance marked for {name} (ID: {student_id}) - "
              f"Recognition: {recognition_confidence:.1f}%, Emotion: {emotion}")
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error in mark_enhanced_attendance: {str(e)}")
        import traceback
        traceback.print_exc()
        try:
            conn.close()
        except:
            pass
        return False

# Initial load of known faces
load_known_faces()

# CSV functionality removed - using only database storage

def save_attendance_to_db(roll_number):
    """
    Saves attendance to the database using the student's roll number.
    This function will be called directly from recognize_face.
    """
    print(f"Attempting to save attendance for roll number: {roll_number}")
    
    try:
        # Connect to the database
        conn = db.sqlite3.connect(os.path.join(DATABASE_FOLDER, "attendance_demo.db"))
        cursor = conn.cursor()
        
        print(f"Connected to attendance database")

        # Find the student's ID and name using their roll number (reg_no)
        cursor.execute("SELECT id, name FROM students WHERE reg_no = ?", (roll_number,))
        result = cursor.fetchone()
        
        print(f"Student lookup result: {result}")

        if result:
            student_id, student_name = result
            date_str = datetime.now().strftime("%Y-%m-%d")
            time_str = datetime.now().strftime("%H:%M:%S")
            
            print(f"Found student: {student_name} (ID: {student_id})")

            # Check if attendance is already marked for today to avoid duplicates
            cursor.execute("""
                SELECT 1 FROM attendance WHERE student_id = ? AND date = ?
            """, (student_id, date_str))

            existing_record = cursor.fetchone()
            print(f"Existing attendance record for today: {existing_record}")

            if not existing_record:
                # Insert the new attendance record if it doesn't exist
                cursor.execute("""
                    INSERT INTO attendance (student_id, date, time, status)
                    VALUES (?, ?, ?, 'Present')
                """, (student_id, date_str, time_str))
                conn.commit()
                
                print(f"✅ Basic attendance marked for {student_name} ({roll_number})")
                
                conn.close()
                return True
            else:
                print(f"Attendance already marked for {student_name} ({roll_number}) today")
                conn.close()
                return False
        else:
            print(f"❌ Student with roll number {roll_number} not found in the database.")
            conn.close()
            return False
            
    except Exception as e:
        print(f"❌ Error saving attendance to DB: {e}")
        import traceback
        traceback.print_exc()
        try:
            conn.rollback()
            conn.close()
        except:
            pass
        return False


@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    """
    Optimized for multi-person recognition (50-60 people) with enhanced spoofing detection.
    """
    data = request.get_json()
    img_data = data.get('image', None)
    period = data.get('period', '')
    attendance_date = data.get('date', datetime.now().strftime("%Y-%m-%d"))

    if not img_data:
        return jsonify({"success": False, "message": "No image data provided."}), 400
    
    try:
        img_bytes = base64.b64decode(img_data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception as e:
        return jsonify({"success": False, "message": f"Invalid image data: {str(e)}"}), 400

    if img is None:
        return jsonify({"success": False, "message": "Could not decode image."}), 400

    # Resize for faster processing if image is too large
    max_dimension = 1920
    h, w = img.shape[:2]
    if max(h, w) > max_dimension:
        scale = max_dimension / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))
    
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Use faster face detection model for multiple faces
    face_locations = face_recognition.face_locations(rgb_img, model='hog', number_of_times_to_upsample=1)
    
    # Limit to 60 faces for performance
    if len(face_locations) > 60:
        face_locations = face_locations[:60]
    
    face_encodings = face_recognition.face_encodings(rgb_img, face_locations, num_jitters=1)

    recognized_faces = []

    for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
        name = "Unknown"
        roll_number = "N/A"
        recognition_confidence = 0.0
        attendance_marked = False
        
        if known_face_encodings:
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            
            if True in matches:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = known_face_names[best_match_index]
                    roll_number = known_face_roll_numbers[best_match_index]
                    recognition_confidence = (1.0 - face_distances[best_match_index]) * 100
                
        # Enhanced Spoofing Detection and Emotion Analysis
        spoofed = False
        emotion = "Neutral"
        liveness_confidence = 75.0
        is_live = True

        try:
            face_img = img[top:bottom, left:right]
            if face_img.size > 0 and face_img.shape[0] > 20 and face_img.shape[1] > 20:
                # Enhanced liveness detection
                is_live, liveness_confidence = detect_liveness(face_img)
                spoofed = not is_live
                
                # Emotion analysis (only for live faces to save processing time)
                if is_live:
                    try:
                        demography = DeepFace.analyze(face_img, actions=['emotion'], enforce_detection=False, silent=True)
                        if demography and 'emotion' in demography[0]:
                            emotion = max(demography[0]['emotion'], key=demography[0]['emotion'].get)
                    except:
                        emotion = "Neutral"
            else:
                is_live = False
                spoofed = True
                liveness_confidence = 20.0
            
        except Exception as e:
            print(f"Analysis failed: {e}")
            is_live = False
            spoofed = True
            liveness_confidence = 30.0
        
        # Mark attendance only for live faces with good confidence
        if name != "Unknown" and roll_number != "N/A" and recognition_confidence > 50.0 and is_live:
            print(f"✅ Face recognized: {name} (ID: {roll_number}) with confidence: {recognition_confidence:.1f}%")
            
            # First, ensure the student exists in the database
            try:
                conn = db.sqlite3.connect(os.path.join(DATABASE_FOLDER, "attendance_demo.db"))
                cursor = conn.cursor()
                
                # Check if student exists
                cursor.execute("SELECT id, name FROM students WHERE reg_no = ?", (roll_number,))
                student_result = cursor.fetchone()
                
                if not student_result:
                    # Add student if not exists
                    print(f"Student {roll_number} not found, adding to database...")
                    cursor.execute("""
                        INSERT INTO students (name, reg_no, class, section, photo_path)
                        VALUES (?, ?, 'Unknown', 'Unknown', '')
                    """, (name, roll_number))
                    conn.commit()
                    print(f"✅ Added student {name} ({roll_number}) to database")
                
                conn.close()
            except Exception as e:
                print(f"Error checking/adding student: {e}")
            
            # Mark in original database
            try:
                basic_attendance_marked = save_attendance_to_db(roll_number)
                print(f"Basic attendance marked: {basic_attendance_marked}")
            except Exception as e:
                print(f"Error marking basic attendance: {e}")
                basic_attendance_marked = False
            
            # Mark in enhanced database
            try:
                enhanced_attendance_marked = mark_enhanced_attendance(
                    name, roll_number, emotion, liveness_confidence, recognition_confidence, is_live
                )
                print(f"Enhanced attendance marked: {enhanced_attendance_marked}")
            except Exception as e:
                print(f"Error marking enhanced attendance: {e}")
                enhanced_attendance_marked = False
            
            # Mark in period-based database if period is provided
            period_attendance_marked = False
            if period:
                try:
                    period_success, period_message = period_db.mark_period_attendance(
                        roll_number, name, attendance_date, period, emotion, 
                        liveness_confidence, recognition_confidence, is_live
                    )
                    period_attendance_marked = period_success
                    print(f"Period attendance marked: {period_attendance_marked} - {period_message}")
                except Exception as e:
                    print(f"Error marking period attendance: {e}")
            
            attendance_marked = basic_attendance_marked or enhanced_attendance_marked or period_attendance_marked
            print(f"📊 Final attendance status: {attendance_marked}")
            
            # Return success if any attendance was marked
            if (enhanced_attendance_marked or period_attendance_marked) and not basic_attendance_marked:
                attendance_marked = True
        else:
            print(f"❌ Attendance not marked - Name: {name}, Roll: {roll_number}, Confidence: {recognition_confidence:.1f}%")
            if recognition_confidence > 0:
                print(f"   Confidence too low (needs > 50%)")
            
        # Check if attendance was already marked today
        attendance_already_marked = False
        if name != "Unknown" and roll_number != "N/A":
            try:
                # Check in enhanced database
                conn = setup_enhanced_attendance_database()
                cursor = conn.cursor()
                today = datetime.now().strftime("%Y-%m-%d")
                cursor.execute('SELECT COUNT(*) FROM enhanced_attendance WHERE student_id = ? AND date = ?', 
                              (roll_number, today))
                if cursor.fetchone()[0] > 0:
                    attendance_already_marked = True
                conn.close()
            except:
                pass
        
        recognized_faces.append({
            "name": name,
            "rollNumber": roll_number,
            "spoofed": bool(spoofed),
            "emotion": emotion,
            "recognitionConfidence": round(float(recognition_confidence), 1),
            "livenessConfidence": round(float(liveness_confidence), 1),
            "isLive": bool(is_live),
            "attendanceMarked": bool(attendance_marked),
            "attendanceAlreadyMarked": bool(attendance_already_marked)
        })
    
    if not recognized_faces:
        return jsonify({"success": True, "message": "No faces detected.", "detectedFaces": []})

    return jsonify({"success": True, "detectedFaces": recognized_faces})

# Student API endpoints
@app.route('/api/students', methods=['GET'])
def get_students():
    """
    Get all students with optional filtering by class and section
    """
    class_filter = request.args.get('class')
    section_filter = request.args.get('section')
    
    conn = db.sqlite3.connect(os.path.join(DATABASE_FOLDER, "attendance_demo.db"))
    cursor = conn.cursor()
    
    query = "SELECT id, name, reg_no, class, section, photo_path FROM students"
    params = []
    
    if class_filter or section_filter:
        query += " WHERE"
        
        if class_filter:
            query += " class = ?"
            params.append(class_filter)
            
        if class_filter and section_filter:
            query += " AND"
            
        if section_filter:
            query += " section = ?"
            params.append(section_filter)
    
    cursor.execute(query, params)
    students = [{
        "id": str(row[0]),
        "name": row[1],
        "rollNumber": row[2],
        "class": row[3],
        "section": row[4],
        "photoPath": row[5]
    } for row in cursor.fetchall()]
    
    conn.close()
    return jsonify(students)

@app.route('/api/students/search', methods=['GET'])
def search_students():
    """
    Search students by name or roll number
    """
    query = request.args.get('q', '')
    
    conn = db.sqlite3.connect(os.path.join(DATABASE_FOLDER, "attendance_demo.db"))
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, reg_no, class, section, photo_path 
        FROM students 
        WHERE name LIKE ? OR reg_no LIKE ?
    """, (f'%{query}%', f'%{query}%'))
    
    students = [{
        "id": str(row[0]),
        "name": row[1],
        "rollNumber": row[2],
        "class": row[3],
        "section": row[4],
        "photoPath": row[5]
    } for row in cursor.fetchall()]
    
    conn.close()
    return jsonify(students)

# Attendance API endpoints
@app.route('/api/attendance', methods=['POST'])
def mark_attendance():
    """
    Mark attendance for students
    """
    data = request.get_json()
    student_ids = data.get('studentIds', [])
    period = data.get('period', '')
    date_str = data.get('date', datetime.now().strftime("%d-%m-%Y"))
    
    conn = db.sqlite3.connect(os.path.join(DATABASE_FOLDER, "attendance_demo.db"))
    cursor = conn.cursor()
    
    success_count = 0
    for student_id in student_ids:
        try:
            time_str = datetime.now().strftime("%H:%M:%S")
            cursor.execute("""
                INSERT OR REPLACE INTO attendance (student_id, date, time, status)
                VALUES (?, ?, ?, 'Present')
            """, (student_id, date_str, time_str))
            success_count += 1
        except Exception as e:
            print(f"Error marking attendance for student {student_id}: {e}")
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "success": True,
        "message": f"Marked {success_count} students present"
    })

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    """
    Get attendance records with optional filtering
    """
    date_str = request.args.get('date')
    class_filter = request.args.get('class')
    section_filter = request.args.get('section')
    
    conn = db.sqlite3.connect(os.path.join(DATABASE_FOLDER, "attendance_demo.db"))
    cursor = conn.cursor()
    
    query = """
        SELECT students.id, students.name, students.reg_no, students.class, students.section,
               attendance.date, attendance.time, attendance.status
        FROM attendance
        JOIN students ON students.id = attendance.student_id
    """
    
    params = []
    where_clauses = []
    
    if date_str:
        where_clauses.append("attendance.date = ?")
        params.append(date_str)
    
    if class_filter:
        where_clauses.append("students.class = ?")
        params.append(class_filter)
    
    if section_filter:
        where_clauses.append("students.section = ?")
        params.append(section_filter)
    
    if where_clauses:
        query += " WHERE " + " AND ".join(where_clauses)
    
    query += " ORDER BY attendance.date DESC, students.name"
    
    cursor.execute(query, params)
    
    attendance_records = [{
        "studentId": str(row[0]),
        "name": row[1],
        "rollNumber": row[2],
        "class": row[3],
        "section": row[4],
        "date": row[5],
        "time": row[6],
        "status": row[7]
    } for row in cursor.fetchall()]
    
    conn.close()
    
    return jsonify({
        "success": True,
        "data": attendance_records
    })

# CSV export functionality removed - using only database storage

# --- Enhanced Face Recognition API Endpoints ---

@app.route('/api/enroll-face', methods=['POST'])
def enroll_face():
    """
    Enroll a new student face via file upload
    """
    print("\n=== New Enrollment Request ===")
    print("Headers:", request.headers)
    print("Form data:", request.form)
    print("Files received:", request.files)
    
    try:
        # Get form data
        student_name = request.form.get('studentName', '').strip()
        student_id = request.form.get('studentId', '').strip()
        
        if not student_name or not student_id:
            print("Error: Missing student name or ID")
            return jsonify({
                "success": False, 
                "message": "Student name and ID are required"
            }), 400
        
        if 'images' not in request.files:
            print("Error: No images in request.files")
            return jsonify({
                "success": False, 
                "message": "No images provided"
            }), 400

        # Process uploaded files
        files = request.files.getlist('images')
        print(f"Received {len(files)} images")
        
        if len(files) < 3:
            print("Error: Not enough images")
            return jsonify({
                "success": False, 
                "message": "At least 3 images are required for better accuracy"
            }), 400

        face_encodings = []
        
        for i, file in enumerate(files):
            if file.filename == '':
                print(f"Skipping empty file at index {i}")
                continue
                
            try:
                print(f"Processing image {i+1}/{len(files)}: {file.filename}")
                # Read image file
                img_bytes = file.read()
                np_arr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                
                if img is None:
                    print(f"Error: Could not decode image {i+1}")
                    continue
                
                # Convert to RGB for face_recognition
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                
                # Extract face encodings
                face_locations = face_recognition.face_locations(rgb_img)
                print(f"Found {len(face_locations)} faces in image {i+1}")
                
                if not face_locations:
                    print(f"Warning: No faces found in image {i+1}")
                    continue
                    
                encodings = face_recognition.face_encodings(rgb_img, face_locations)
                
                if encodings:
                    print(f"Successfully extracted encoding from image {i+1}")
                    face_encodings.append(encodings[0])
                else:
                    print(f"Warning: Could not extract encoding from image {i+1}")
                    
            except Exception as e:
                print(f"Error processing image {i+1}: {str(e)}")
                continue
        
        if not face_encodings:
            print("Error: No valid face encodings could be extracted")
            return jsonify({
                "success": False, 
                "message": "No valid face encodings could be extracted from the images"
            }), 400
        
        # Calculate average encoding
        avg_encoding = np.mean(face_encodings, axis=0)
        person_id = f"ID-{student_id} - {student_name}"
        
        print(f"Successfully processed {len(face_encodings)} face encodings")
        
        # Save to face encodings database
        conn = setup_face_encodings_database()
        save_encoding_to_db(conn, person_id, avg_encoding, len(face_encodings))
        conn.close()
        
        # Also add to the existing student database if not present
        db_conn = db.sqlite3.connect(os.path.join(DATABASE_FOLDER, "attendance_demo.db"))
        cursor = db_conn.cursor()
        
        # Check if student exists
        cursor.execute("SELECT id FROM students WHERE reg_no = ?", (student_id,))
        if not cursor.fetchone():
            print(f"Adding new student to database: {student_name} (ID: {student_id})")
            cursor.execute("""
                INSERT INTO students (name, reg_no, class, section, photo_path)
                VALUES (?, ?, 'Unknown', 'Unknown', '')
            """, (student_name, student_id))
            db_conn.commit()
        else:
            print(f"Student {student_id} already exists in database")
        
        db_conn.close()
        
        # Reload known faces to include the new enrollment
        load_known_faces()
        
        print(f"Successfully enrolled {student_name} (ID: {student_id})")
        return jsonify({
            "success": True,
            "message": f"Successfully enrolled {student_name} (ID: {student_id}) with {len(face_encodings)} face images"
        })
        
    except Exception as e:
        print(f"Error in face enrollment: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Face enrollment failed: {str(e)}"
        }), 500

@app.route('/api/enhanced-recognize', methods=['POST'])
def enhanced_recognize():
    """
    Enhanced face recognition optimized for 50-60 people with advanced spoofing detection
    """
    try:
        data = request.get_json()
        img_data = data.get('image', None)
        
        if not img_data:
            return jsonify({"success": False, "message": "No image data provided."}), 400
        
        # Decode image
        try:
            img_bytes = base64.b64decode(img_data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        except Exception as e:
            return jsonify({"success": False, "message": f"Invalid image data: {str(e)}"}), 400
        
        if img is None:
            return jsonify({"success": False, "message": "Could not decode image."}), 400
        
        # Resize for faster processing
        max_dimension = 1920
        h, w = img.shape[:2]
        if max(h, w) > max_dimension:
            scale = max_dimension / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))
        
        # Convert to RGB for face recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Optimized face detection for multiple people
        face_locations = face_recognition.face_locations(rgb_img, model='hog', number_of_times_to_upsample=1)
        
        # Limit to 60 faces
        if len(face_locations) > 60:
            face_locations = face_locations[:60]
        
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations, num_jitters=1)
        
        if not face_encodings:
            return jsonify({
                "success": True, 
                "message": "No faces detected.", 
                "detectedFaces": []
            })
        
        recognized_faces = []
        
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            name = "Unknown"
            roll_number = "N/A"
            recognition_confidence = 0.0
            
            # Face recognition
            if known_face_encodings:
                matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                
                if True in matches:
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index]:
                        name = known_face_names[best_match_index]
                        roll_number = known_face_roll_numbers[best_match_index]
                        recognition_confidence = (1.0 - face_distances[best_match_index]) * 100
            
            # Enhanced liveness detection
            is_live = True
            liveness_confidence = 75.0
            emotion = "Neutral"
            
            try:
                face_img = img[top:bottom, left:right]
                if face_img.size > 0 and face_img.shape[0] > 20 and face_img.shape[1] > 20:
                    # Enhanced spoofing detection
                    is_live, liveness_confidence = detect_liveness(face_img)
                    
                    # Emotion detection only for live faces
                    if is_live:
                        try:
                            demography = DeepFace.analyze(face_img, actions=['emotion'], enforce_detection=False, silent=True)
                            if demography and 'emotion' in demography[0]:
                                emotion = max(demography[0]['emotion'], key=demography[0]['emotion'].get)
                        except:
                            emotion = "Neutral"
                else:
                    is_live = False
                    liveness_confidence = 20.0
            except Exception as e:
                print(f"Analysis failed: {e}")
                is_live = False
                liveness_confidence = 30.0
            
            # Mark attendance only for live faces with high confidence
            attendance_marked = False
            if name != "Unknown" and recognition_confidence > 85.0 and is_live:
                attendance_marked = mark_enhanced_attendance(
                    name, roll_number, emotion, liveness_confidence, recognition_confidence, is_live
                )
                
                # Also mark in the original database
                if attendance_marked:
                    save_attendance_to_db(roll_number)
            
            recognized_faces.append({
                "name": name,
                "rollNumber": roll_number,
                "emotion": emotion,
                "recognitionConfidence": round(float(recognition_confidence), 1),
                "livenessConfidence": round(float(liveness_confidence), 1),
                "isLive": bool(is_live),
                "spoofed": bool(not is_live),
                "attendanceMarked": bool(attendance_marked)
            })
        
        return jsonify({
            "success": True, 
            "detectedFaces": recognized_faces
        })
        
    except Exception as e:
        print(f"Error in enhanced recognition: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Enhanced recognition failed: {str(e)}"
        }), 500

@app.route('/api/enhanced-attendance', methods=['GET'])
def get_enhanced_attendance():
    """
    Get enhanced attendance records with emotion and liveness data
    """
    try:
        date_str = request.args.get('date')
        
        conn = setup_enhanced_attendance_database()
        cursor = conn.cursor()
        
        if date_str:
            cursor.execute("""
                SELECT serial_no, student_id, name, date, time, emotion, spoofing_status,
                       liveliness_confidence, recognition_confidence, timestamp
                FROM enhanced_attendance
                WHERE date = ?
                ORDER BY time DESC
            """, (date_str,))
        else:
            cursor.execute("""
                SELECT serial_no, student_id, name, date, time, emotion, spoofing_status,
                       liveliness_confidence, recognition_confidence, timestamp
                FROM enhanced_attendance
                ORDER BY date DESC, time DESC
                LIMIT 100
            """)
        
        records = cursor.fetchall()
        conn.close()
        
        attendance_records = []
        for record in records:
            attendance_records.append({
                "serialNo": record[0],
                "studentId": record[1],
                "name": record[2],
                "date": record[3],
                "time": record[4],
                "emotion": record[5],
                "spoofingStatus": record[6],
                "livenessConfidence": record[7],
                "recognitionConfidence": record[8],
                "timestamp": record[9]
            })
        
        return jsonify({
            "success": True,
            "data": attendance_records,
            "total": len(attendance_records)
        })
        
    except Exception as e:
        print(f"Error getting enhanced attendance: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Failed to get enhanced attendance: {str(e)}"
        }), 500

@app.route('/api/enrolled-faces', methods=['GET'])
def get_enrolled_faces():
    """
    Get list of all enrolled faces
    """
    try:
        conn = setup_face_encodings_database()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT person_id, num_images, created_at, updated_at
            FROM face_encodings
            ORDER BY updated_at DESC
        """)
        
        records = cursor.fetchall()
        conn.close()
        
        enrolled_faces = []
        for record in records:
            person_id = record[0]
            # Parse person_id format: "ID-XXX - Name"
            parts = person_id.split(' - ')
            if len(parts) == 2:
                student_id = parts[0].replace('ID-', '')
                name = parts[1]
            else:
                student_id = person_id
                name = person_id
            
            enrolled_faces.append({
                "personId": person_id,
                "studentId": student_id,
                "name": name,
                "numImages": record[1],
                "createdAt": record[2],
                "updatedAt": record[3]
            })
        
        return jsonify({
            "success": True,
            "data": enrolled_faces,
            "total": len(enrolled_faces)
        })
        
    except Exception as e:
        print(f"Error getting enrolled faces: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Failed to get enrolled faces: {str(e)}"
        }), 500

@app.route('/api/test-db', methods=['GET'])
def test_database_connections():
    """
    Test database connections and show debug information
    """
    results = {
        "mainDatabase": False,
        "enhancedDatabase": False,
        "faceEncodingsDatabase": False,
        "studentsCount": 0,
        "knownFacesCount": len(known_face_encodings),
        "errors": []
    }
    
    # Test main database
    try:
        conn = db.sqlite3.connect(os.path.join(DATABASE_FOLDER, "attendance_demo.db"))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM students")
        results["studentsCount"] = cursor.fetchone()[0]
        results["mainDatabase"] = True
        conn.close()
    except Exception as e:
        results["errors"].append(f"Main DB error: {str(e)}")
    
    # Test enhanced attendance database
    try:
        conn = setup_enhanced_attendance_database()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM enhanced_attendance")
        enhanced_count = cursor.fetchone()[0]
        results["enhancedAttendanceCount"] = enhanced_count
        results["enhancedDatabase"] = True
        conn.close()
    except Exception as e:
        results["errors"].append(f"Enhanced DB error: {str(e)}")
    
    # Test face encodings database
    try:
        conn = setup_face_encodings_database()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM face_encodings")
        encodings_count = cursor.fetchone()[0]
        results["faceEncodingsCount"] = encodings_count
        results["faceEncodingsDatabase"] = True
        conn.close()
    except Exception as e:
        results["errors"].append(f"Face encodings DB error: {str(e)}")
    
    return jsonify(results)

@app.route('/api/reload-faces', methods=['POST'])
def reload_faces():
    """
    Reload known faces from the known_faces directory and save to database
    """
    try:
        print("🔄 Reloading faces...")
        load_known_faces()
        
        return jsonify({
            "success": True,
            "message": f"Successfully reloaded {len(known_face_encodings)} faces",
            "knownFacesCount": len(known_face_encodings)
        })
    except Exception as e:
        print(f"Error reloading faces: {e}")
        return jsonify({
            "success": False,
            "message": f"Failed to reload faces: {str(e)}"
        }), 500

@app.route('/api/test-attendance', methods=['POST'])
def test_attendance_marking():
    """
    Test attendance marking for a specific student ID
    """
    try:
        data = request.get_json()
        roll_number = data.get('rollNumber', '106')  # Default to Utkarsh's ID
        
        print(f"🧪 Testing attendance marking for roll number: {roll_number}")
        
        # Test basic attendance marking
        basic_result = save_attendance_to_db(roll_number)
        
        # Test enhanced attendance marking
        enhanced_result = mark_enhanced_attendance(
            "Test Student", roll_number, "Happy", 85.0, 90.0, True
        )
        
        return jsonify({
            "success": True,
            "basicAttendanceMarked": basic_result,
            "enhancedAttendanceMarked": enhanced_result,
            "rollNumber": roll_number
        })
        
    except Exception as e:
        print(f"Error testing attendance: {e}")
        return jsonify({
            "success": False,
            "message": f"Test failed: {str(e)}"
        }), 500


# All CSV functionality removed - using only database storage

def populate_face_encodings_from_files():
    """
    One-time function to populate face encodings database from known_faces directory.
    This should be run once to migrate from file-based to database-based storage.
    """
    print("🔄 Populating face encodings database from files...")
    
    # Check if KNOWN_FACES_DIR exists
    if not os.path.exists(KNOWN_FACES_DIR):
        print(f"Known faces directory not found: {KNOWN_FACES_DIR}")
        return False

    # Connect to face encodings database
    face_db_conn = setup_face_encodings_database()
    populated_count = 0

    for name_folder in os.listdir(KNOWN_FACES_DIR):
        if name_folder.startswith('.'):
            continue
        
        # Handle cases where folder name might not have underscore
        if '_' not in name_folder:
            print(f"Skipping folder with invalid format: {name_folder}")
            continue
            
        name, roll_number = name_folder.rsplit('_', 1)
        person_dir = os.path.join(KNOWN_FACES_DIR, name_folder)
        
        # Get actual student name from database
        try:
            conn = db.sqlite3.connect(os.path.join(DATABASE_FOLDER, "attendance_demo.db"))
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM students WHERE reg_no = ?", (roll_number,))
            result = cursor.fetchone()
            conn.close()
        except Exception as db_error:
            print(f"Database error for roll {roll_number}: {db_error}")
            result = None
        
        if result:
            db_name = result[0]
            if db_name == roll_number:
                actual_name = name.replace('-', ' ').title()
            else:
                actual_name = db_name
        else:
            actual_name = name.replace('-', ' ').title()
        
        if os.path.isdir(person_dir):
            face_encodings_for_person = []
            
            for filename in os.listdir(person_dir):
                if filename.startswith('.'):
                    continue
                
                if filename.endswith(('.jpg', '.jpeg', '.png')):
                    image_path = os.path.join(person_dir, filename)
                    image = face_recognition.load_image_file(image_path)
                    encodings = face_recognition.face_encodings(image)
                    
                    if encodings:
                        face_encodings_for_person.append(encodings[0])
                        print(f"Processed encoding for {actual_name} ({roll_number}) from {filename}")
            
            # Save average encoding to database if we have encodings for this person
            if face_encodings_for_person:
                try:
                    avg_encoding = np.mean(face_encodings_for_person, axis=0)
                    person_id = f"ID-{roll_number} - {actual_name}"
                    save_encoding_to_db(face_db_conn, person_id, avg_encoding, len(face_encodings_for_person))
                    print(f"✅ Saved encoding to database for {actual_name} ({roll_number})")
                    populated_count += 1
                except Exception as e:
                    print(f"❌ Error saving encoding to database for {actual_name}: {e}")
    
    try:
        face_db_conn.close()
    except:
        pass
    
    print(f"✅ Successfully populated {populated_count} face encodings in database")
    return populated_count > 0

@app.route('/api/populate-face-db', methods=['POST'])
def populate_face_database():
    """
    API endpoint to populate face encodings database from known_faces directory
    """
    try:
        success = populate_face_encodings_from_files()
        if success:
            # Reload faces after populating
            load_known_faces()
            return jsonify({
                "success": True,
                "message": "Face encodings database populated successfully",
                "knownFacesCount": len(known_face_encodings)
            })
        else:
            return jsonify({
                "success": False,
                "message": "No face encodings were populated"
            }), 400
            
    except Exception as e:
        print(f"Error populating face database: {e}")
        return jsonify({
            "success": False,
            "message": f"Failed to populate face database: {str(e)}"
        }), 500

# Period-based attendance endpoints
@app.route('/api/period-attendance', methods=['GET'])
def get_period_attendance():
    """
    Get period-based attendance records
    """
    try:
        date_str = request.args.get('date')
        period = request.args.get('period')
        
        records = period_db.get_period_attendance(date_str, period)
        
        attendance_records = []
        for record in records:
            attendance_records.append({
                "id": record[0],
                "studentId": record[1],
                "name": record[2],
                "date": record[3],
                "period": record[4],
                "time": record[5],
                "emotion": record[6],
                "spoofingStatus": record[7],
                "livenessConfidence": record[8],
                "recognitionConfidence": record[9],
                "timestamp": record[10]
            })
        
        return jsonify({
            "success": True,
            "data": attendance_records,
            "total": len(attendance_records)
        })
        
    except Exception as e:
        print(f"Error getting period attendance: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Failed to get period attendance: {str(e)}"
        }), 500

@app.route('/api/period-attendance/summary', methods=['GET'])
def get_period_attendance_summary():
    """
    Get attendance summary by period
    """
    try:
        date_str = request.args.get('date')
        
        records = period_db.get_attendance_summary(date_str)
        
        summary = []
        for record in records:
            summary.append({
                "period": record[0],
                "totalPresent": record[1],
                "liveCount": record[2],
                "spoofedCount": record[3]
            })
        
        return jsonify({
            "success": True,
            "data": summary
        })
        
    except Exception as e:
        print(f"Error getting attendance summary: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Failed to get attendance summary: {str(e)}"
        }), 500

@app.route('/api/period-attendance/export', methods=['GET'])
def export_period_attendance():
    """
    Export period attendance to CSV
    """
    try:
        date_str = request.args.get('date')
        period = request.args.get('period')
        
        csv_content = period_db.export_period_attendance_csv(date_str, period)
        
        if csv_content is None:
            return jsonify({
                "success": False,
                "message": "Failed to generate CSV"
            }), 500
        
        # Generate filename
        filename_parts = ["period_attendance"]
        if date_str:
            filename_parts.append(date_str)
        if period:
            filename_parts.append(period.replace(" ", "_").replace("(", "").replace(")", ""))
        filename = "_".join(filename_parts) + ".csv"
        
        from flask import Response
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
        
    except Exception as e:
        print(f"Error exporting period attendance: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Failed to export attendance: {str(e)}"
        }), 500
        
if __name__ == '__main__':
    print("🚀 Starting Smart Attend Face Recognition Attendance System Backend...")
    
    # Initialize the databases
    try:
        print("📊 Initializing main database...")
        db.init_db()
        print("✅ Main database initialized")
    except Exception as e:
        print(f"❌ Error initializing main database: {e}")
    
    # Initialize enhanced databases
    try:
        print("📊 Initializing face encodings database...")
        setup_face_encodings_database()
        print("✅ Face encodings database initialized")
    except Exception as e:
        print(f"❌ Error initializing face encodings database: {e}")
    
    try:
        print("📊 Initializing enhanced attendance database...")
        setup_enhanced_attendance_database()
        print("✅ Enhanced attendance database initialized")
    except Exception as e:
        print(f"❌ Error initializing enhanced attendance database: {e}")
    
    try:
        print("📊 Initializing period attendance database...")
        period_db.setup_period_attendance_database()
        print("✅ Period attendance database initialized")
    except Exception as e:
        print(f"❌ Error initializing period attendance database: {e}")
    
    # Load known faces
    try:
        print("👥 Loading known faces...")
        print(f"✅ Loaded {len(known_face_encodings)} known faces")
    except Exception as e:
        print(f"❌ Error loading known faces: {e}")
    
    print("\n🌟 Enhanced Face Recognition Attendance System Backend Started")
    print("📡 Available endpoints:")
    print("- /api/recognize (POST) - Standard face recognition with period support")
    print("- /api/enroll-face (POST) - Enroll new student face")
    print("- /api/enhanced-recognize (POST) - Enhanced face recognition with emotion & liveness")
    print("- /api/enhanced-attendance (GET) - Get enhanced attendance records")
    print("- /api/period-attendance (GET) - Get period-based attendance records")
    print("- /api/period-attendance/summary (GET) - Get attendance summary by period")
    print("- /api/period-attendance/export (GET) - Export period attendance to CSV")
    print("- /api/enrolled-faces (GET) - Get list of enrolled faces")
    print("- /api/test-db (GET) - Test database connections")
    print(f"\n🔗 Server running at: http://localhost:5001")
    print("🧪 Test database status at: http://localhost:5001/api/test-db")
    print("📊 Period attendance management: http://localhost:5001/api/period-attendance")
    print("📥 CSV export: http://localhost:5001/api/period-attendance/export")
    
    # You can change host and port as needed for deployment
    app.run(host='0.0.0.0', port=5001, debug=True)