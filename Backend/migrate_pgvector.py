import os
from sqlalchemy import text
from neon_db import engine, SessionLocal
from models import Base, FaceEncoding

def migrate():
    with engine.connect() as conn:
        print("Enabling pgvector extension...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
        print("pgvector extension enabled.")

        # Recreate face_encodings table
        print("Updating face_encodings table...")
        # Dropping existing table if it exists to ensure schema is correct
        # Alternatively, we could ALTER but dropping is safer for this schema change if we are okay losing data (which we are for this hardening step)
        conn.execute(text("DROP TABLE IF EXISTS face_encodings CASCADE;"))
        conn.commit()
        
    print("Creating new face_encodings table with pgvector support...")
    Base.metadata.create_all(bind=engine, tables=[FaceEncoding.__table__])
    print("Migration successful.")

if __name__ == "__main__":
    migrate()
