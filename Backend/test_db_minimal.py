
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

def test_minimal_connection():
    attendance_url = os.environ.get('DATABASE_URL_ATTENDANCE')
    faces_url = os.environ.get('DATABASE_URL_FACES')
    
    print("Testing Minimal Connectivty...")
    
    # Test Attendance DB
    print(f"Connecting to Attendance DB...")
    try:
        engine = create_engine(attendance_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print(f"✓ Attendance DB Connection Successful: {result.fetchone()}")
    except Exception as e:
        print(f"❌ Attendance DB Connection Failed: {e}")

    # Test Faces DB
    original_faces_url = os.environ.get('DATABASE_URL_FACES')
    # Extract base URL and options
    base_url = original_faces_url.split('/Face%20Encodings?')[0]
    options = original_faces_url.split('/Face%20Encodings?')[1]
    
    candidates = ["Face%20Encodings", "Face_Encodings", "face_encodings", "FaceEncodings", "faces", "Faces"]
    
    print("\nProbing Faces DB names...")
    
    for name in candidates:
        try:
            # Reconstruct URL
            test_url = f"{base_url}/{name}?{options}"
            print(f"Trying dbname: '{name}' ...")
            engine = create_engine(test_url)
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                print(f"✓ SUCCESS! Found database: '{name}'")
                return # Exit on success
        except Exception as e:
            if "does not exist" in str(e):
                print(f"  - '{name}' does not exist.")
            else:
                print(f"  - '{name}' error: {e}")


if __name__ == "__main__":
    test_minimal_connection()
