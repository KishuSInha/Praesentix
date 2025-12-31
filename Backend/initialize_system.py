
from neon_db import engine
from models import Base
import os
import sys

# Ensure current directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def init_db():
    print("Initialize System: Neon Database")
    print("--------------------------------")
    try:
        print(f"Connecting to database via neon_db.engine...")
        Base.metadata.create_all(bind=engine)
        print("✅ Neon database initialized successfully.")
        print("Created tables:")
        for table_name in Base.metadata.tables.keys():
            print(f" - {table_name}")
            
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")

if __name__ == "__main__":
    init_db()
