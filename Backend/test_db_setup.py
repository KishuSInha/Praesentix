
import os
import sys

# Add Backend logic to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, FaceEncoding, Attendance

def test_connection():
    print("Testing Database Configuration...")
    print(f"Attenuation DB: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print(f"Faces DB Bind: {app.config['SQLALCHEMY_BINDS']['faces']}")
    
    try:
        with app.app_context():
            print("\nAttempting to connect and create tables...")
            db.create_all()
            print("✓ db.create_all() executed successfully.")
            
            # Test default bind (Attendance)
            print("\nTesting 'Attendance' table (Default Bind)...")
            try:
                # Just query count to see if table exists/is readable
                count = Attendance.query.count()
                print(f"✓ Attendance table accessible. Row count: {count}")
            except Exception as e:
                print(f"❌ Error accessing Attendance table: {e}")

            # Test 'faces' bind (FaceEncoding)
            print("\nTesting 'FaceEncoding' table ('faces' Bind)...")
            try:
                count = FaceEncoding.query.count()
                print(f"✓ FaceEncoding table accessible. Row count: {count}")
            except Exception as e:
                print(f"❌ Error accessing FaceEncoding table: {e}")
                
            print("\nTest completed.")
            
    except Exception as e:
        print(f"\n❌ value error during test: {e}")

if __name__ == "__main__":
    test_connection()
