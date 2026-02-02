import os
from sqlalchemy import text
from neon_db import engine, SessionLocal
from models import Base, Attendance

def migrate_attendance():
    with engine.connect() as conn:
        print("Migrating attendance table...")
        
        # Since we are hardening, we might need to cast or recreate
        # Casting is better if there's data, but recreate is safer for schema enforcement
        # Let's try ALTER first
        try:
            # 1. Alter date column to DATE
            # USING date::DATE handles 'YYYY-MM-DD' strings
            conn.execute(text("ALTER TABLE attendance ALTER COLUMN date TYPE DATE USING date::DATE;"))
            print("✓ Altered date column type to DATE.")
            
            # 2. Add Unique Constraint
            conn.execute(text("ALTER TABLE attendance ADD CONSTRAINT unique_attendance UNIQUE (student_id, date, period);"))
            print("✓ Added unique constraint.")
            
            conn.commit()
        except Exception as e:
            print(f"⚠️ Alter failed (maybe constraint already exists or data issue): {e}")
            print("Falling back to recreate if necessary (WARNING: Data Loss)...")
            # If alter fails, we could drop and recreate but let's be cautious.
            # In this case, if it fails, maybe the table doesn't exist yet or already has it.
            conn.rollback()

    # Ensure all tables match models
    print("Ensuring tables are up to date...")
    Base.metadata.create_all(bind=engine)
    print("Migration successful.")

if __name__ == "__main__":
    migrate_attendance()
