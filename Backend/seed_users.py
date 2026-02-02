import bcrypt
from neon_db import SessionLocal
from models import User
import sys

def seed_users():
    db = SessionLocal()
    try:
        # Clear existing users for a fresh reseed with new requested credentials
        db.query(User).delete()
        print("Cleared existing users.")

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
        print("✅ Success: New credentials seeded with hashed passwords.")
        print("Student: utkarsh123 / pass123")
        print("Teacher: teacher123 / pass123")
        print("Admin: admin123 / pass123")
        print("Education: edu123 / pass123")
    except Exception as e:
        print(f"❌ Error seeding users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
