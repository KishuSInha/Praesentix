#!/usr/bin/env python3
"""
Initialize the face recognition attendance system with students and face encodings.
Run this script once to set up the system.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import DataBase_attendance as db
from app import setup_face_encodings_database, populate_face_encodings_from_files, load_known_faces, DATABASE_FOLDER

def initialize_system():
    print("🚀 Initializing Face Recognition Attendance System...")
    print("="*60)
    print(f"\n📁 Database folder location: {DATABASE_FOLDER}")
    print("="*60)
    
    # Step 1: Initialize main database
    print("\n📊 Step 1: Initializing main database...")
    try:
        db.init_db()
        print("✅ Main database initialized")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Step 2: Add students to database
    print("\n👥 Step 2: Adding students to database...")
    students = [
        ("Avijit Chowdhary", "101", "CSE", "A"),
        ("Saanjh Nayak", "102", "CSE", "A"), 
        ("Soumya Saragr Nayak", "103", "CSE", "A"),
        ("Sreyan Panda", "104", "CSE", "A"),
        ("Subham Sarangi", "105", "CSE", "A"),
        ("Utkarsh Sinha", "106", "CSE", "A")
    ]
    
    for name, reg_no, class_name, section in students:
        try:
            db.add_student(name, reg_no, class_name, section, f"known_faces/{name.replace(' ', '_')}_{reg_no}/{reg_no}.png")
            print(f"✅ Added: {name} (ID: {reg_no})")
        except Exception as e:
            print(f"⚠️  Student {name} might already exist: {e}")
    
    # Step 3: Initialize face encodings database
    print("\n🗄️ Step 3: Initializing face encodings database...")
    try:
        setup_face_encodings_database()
        print("✅ Face encodings database initialized")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Step 4: Populate face encodings from files
    print("\n📸 Step 4: Populating face encodings from known_faces directory...")
    try:
        success = populate_face_encodings_from_files()
        if success:
            print("✅ Face encodings populated successfully")
        else:
            print("⚠️  No face encodings were populated (directory might be empty)")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Step 5: Load and verify
    print("\n🔍 Step 5: Loading and verifying face encodings...")
    try:
        load_known_faces()
        print("✅ Face encodings loaded successfully")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    print("\n" + "="*60)
    print("✅ System initialization complete!")
    print("You can now run the Flask app with: python app.py")
    print("="*60)
    
    return True

if __name__ == "__main__":
    success = initialize_system()
    sys.exit(0 if success else 1)
