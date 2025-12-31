import os
import cv2
import mediapipe as mp
import sqlite3
import numpy as np
import json

# --- 1. Initialization ---
# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

# --- 2. Directory Setup ---
flat_dir = '/Users/utkarshsinha/Desktop/SIH NEW/Images'
group_dir = '/Users/utkarshsinha/Desktop/SIH NEW/Grouped Images'
database_file = "face_encodings.db"

# --- 3. Database Setup ---
def setup_database():
    """Create the SQLite database and table for face encodings."""
    conn = sqlite3.connect(database_file)
    cursor = conn.cursor()
    
    # Create table if it doesn't exist
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

def save_encoding_to_db(conn, person_id, encoding, num_images=1):
    """Save or update a face encoding in the database."""
    cursor = conn.cursor()
    
    # Convert numpy array to JSON string for storage
    encoding_json = json.dumps(encoding.tolist())
    
    # Insert or replace the encoding
    cursor.execute('''
        INSERT OR REPLACE INTO face_encodings 
        (person_id, encoding_data, num_images, updated_at) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ''', (person_id, encoding_json, num_images))
    
    conn.commit()

def load_encoding_from_db(conn, person_id):
    """Load a face encoding from the database."""
    cursor = conn.cursor()
    cursor.execute('SELECT encoding_data FROM face_encodings WHERE person_id = ?', (person_id,))
    result = cursor.fetchone()
    
    if result:
        encoding_data = json.loads(result[0])
        return np.array(encoding_data, dtype=np.float16)
    return None

def get_all_encodings_from_db(conn):
    """Get all face encodings from the database."""
    cursor = conn.cursor()
    cursor.execute('SELECT person_id, encoding_data FROM face_encodings')
    results = cursor.fetchall()
    
    encodings = {}
    for person_id, encoding_data in results:
        encoding = json.loads(encoding_data)
        encodings[person_id] = np.array(encoding, dtype=np.float16)
    
    return encodings

print("Starting face encoding process using MediaPipe...")

def get_mediapipe_encoding(image_path):
    """
    Loads an image, processes it with MediaPipe Face Mesh,
    and returns a flattened landmark vector as the encoding.
    """
    img = cv2.imread(image_path)
    if img is None:
        return None
    
    img = cv2.resize(img, (1280, 960))  # Increase resolution for better detection
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(img_rgb)
    
    if results.multi_face_landmarks:
        # Get landmarks for the first face
        face_landmarks = results.multi_face_landmarks[0]
        
        # Flatten the (x, y, z) coordinates of all 478 landmarks into a single vector
        landmark_points = []
        for landmark in face_landmarks.landmark:
            landmark_points.extend([landmark.x, landmark.y, landmark.z])
        
        return np.array(landmark_points, dtype=np.float16)
    else:
        return None

# --- 4. Initialize Database ---
conn = setup_database()
print(f"Database '{database_file}' initialized successfully.")

# --- 5. Process the Flat Directory ---
if os.path.exists(flat_dir):
    print(f"\nProcessing flat directory: '{flat_dir}'...")
    for filename in os.listdir(flat_dir):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            person_id = os.path.splitext(filename)[0]
            image_path = os.path.join(flat_dir, filename)
            
            encoding = get_mediapipe_encoding(image_path)
            if encoding is not None:
                save_encoding_to_db(conn, person_id, encoding, 1)
                print(f" ✓ Encoded and saved {person_id} to database")
            else:
                print(f" ⚠️ No face found in {filename} (Path: {image_path})")
else:
    print(f"\nSkipping flat directory (Not found: '{flat_dir}')")

# --- 6. Process the Grouped Directory and Create Averaged Profiles ---
if os.path.exists(group_dir):
    print(f"\nProcessing grouped directory: '{group_dir}'...")
    for person_name in os.listdir(group_dir):
        person_dir = os.path.join(group_dir, person_name)
        if not os.path.isdir(person_dir):
            continue
        
        all_person_encodings = []
        for image_file in os.listdir(person_dir):
            if image_file.lower().endswith(('.png', '.jpg', '.jpeg')):
                image_path = os.path.join(person_dir, image_file)
                encoding = get_mediapipe_encoding(image_path)
                
                if encoding is not None:
                    all_person_encodings.append(encoding)
                else:
                    print(f" ⚠️ No face found in {image_file} for {person_name}")
        
        # Calculate the average encoding for a more robust profile
        if all_person_encodings:
            avg_encoding = np.mean(all_person_encodings, axis=0)
            save_encoding_to_db(conn, person_name, avg_encoding, len(all_person_encodings))
            print(f" ✓ Created and saved average profile for {person_name} from {len(all_person_encodings)} images.")
else:
    print(f"\nSkipping grouped directory (Not found: '{group_dir}')")

# --- 7. Display Summary ---
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM face_encodings')
total_encodings = cursor.fetchone()[0]

if total_encodings > 0:
    print(f"\n✅ Successfully saved {total_encodings} MediaPipe face encodings to SQLite database '{database_file}'")
    
    # Display all saved encodings
    cursor.execute('SELECT person_id, num_images, created_at FROM face_encodings ORDER BY person_id')
    results = cursor.fetchall()
    print("\nSaved encodings:")
    for person_id, num_images, created_at in results:
        print(f"  - {person_id}: {num_images} image(s), created at {created_at}")
else:
    print("\nNo faces were encoded. The database is empty.")

# --- 8. Example: How to retrieve encodings ---
print(f"\nExample: Retrieving all encodings from database...")
all_encodings = get_all_encodings_from_db(conn)
print(f"Retrieved {len(all_encodings)} encodings from database")

# --- Cleanup ---
conn.close()
face_mesh.close()
print(f"\nDatabase connection closed. Encoding process completed.")