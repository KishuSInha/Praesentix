import bcrypt
from neon_db import SessionLocal
from models import User

def test_login_logic(username, password, role):
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.username == username,
            User.role == role
        ).first()

        if not user:
            print(f"User {username} with role {role} not found.")
            return

        print(f"User {user.username} found. Comparing passwords...")
        # App logic:
        # bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8'))
        match = bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8'))
        print(f"Match result: {match}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Testing admin123 / pass123 / admin")
    test_login_logic("admin123", "pass123", "admin")
