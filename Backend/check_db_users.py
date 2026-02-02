from neon_db import SessionLocal
from models import User

def check_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total users: {len(users)}")
        for user in users:
            print(f"Username: {user.username}, Role: {user.role}, Password (hashed): {user.password[:10]}...")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
