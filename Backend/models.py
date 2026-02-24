from sqlalchemy import Column, Integer, String, DateTime, Text, Float, JSON, Date, UniqueConstraint, Boolean
from sqlalchemy.ext.declarative import declarative_base
# from pgvector.sqlalchemy import Vector # Removed for SQLite
from datetime import datetime

Base = declarative_base()

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True)
    name = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    period = Column(String)
    # Additional fields from original schema
    date = Column(Date)
    time = Column(String)
    emotion = Column(String, default='Neutral')
    spoof_status = Column(String, default='LIVE')
    liveness_confidence = Column(Float, default=75.0)
    recognition_confidence = Column(Float, default=85.0)
    
    # NEW FIELDS for Offline Mode & Trust Score
    is_offline_sync = Column(Boolean, default=False)
    trust_score_impact = Column(Float, default=0.0) # How much this record affected the score

    __table_args__ = (
        UniqueConstraint('student_id', 'date', 'period', name='unique_attendance'),
    )

class FaceEncoding(Base):
    __tablename__ = "face_encodings"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(String, index=True)  # NOT unique — multiple descriptors per student
    embedding = Column(JSON)  # Storing list/array as JSON
    descriptor_index = Column(Integer, default=0)  # 0..4 per student
    num_images = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('person_id', 'descriptor_index', name='unique_person_descriptor'),
    )

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    title = Column(String)
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    read = Column(Integer, default=0) # Using Integer for boolean compatibility 0/1

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String) # student, teacher, admin, education
    full_name = Column(String)
    student_id = Column(String, nullable=True) # For student role linking
    
    # NEW FIELDS for Trust Score
    trust_score = Column(Float, default=100.0)

class EngagementLog(Base):
    __tablename__ = "engagement_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True)
    session_id = Column(String, index=True) # To group continuous periods
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_focused = Column(Boolean, default=True) # Looking at screen/teacher
    drowsiness_detected = Column(Boolean, default=False)
    
