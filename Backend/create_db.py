
import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

def create_database():
    attendance_url = os.environ.get('DATABASE_URL_ATTENDANCE')
    
    # Parse the URL to get separate components for psycopg2
    result = urlparse(attendance_url)
    username = result.username
    password = result.password
    database = result.path[1:]
    hostname = result.hostname
    port = result.port
    
    print(f"Connecting to '{database}' on {hostname} to create new DB...")
    
    try:
        conn = psycopg2.connect(
            database=database,
            user=username,
            password=password,
            host=hostname,
            port=port,
            sslmode='require'
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if it exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'face_encodings'")
        exists = cursor.fetchone()
        
        if not exists:
            print("Creating database 'face_encodings'...")
            cursor.execute(sql.SQL("CREATE DATABASE face_encodings"))
            print("✓ Database 'face_encodings' created successfully.")
        else:
            print("ℹ️ Database 'face_encodings' already exists.")
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Failed to create database: {e}")
        return False

if __name__ == "__main__":
    create_database()
