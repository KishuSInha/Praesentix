from sqlalchemy import Column, Integer, String, DateTime, Text, Float, JSON, Date, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from pgvector.sqlalchemy import Vector
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

    __table_args__ = (
        UniqueConstraint('student_id', 'date', 'period', name='unique_attendance'),
    )

class FaceEncoding(Base):
    __tablename__ = "face_encodings"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(String, unique=True, index=True)
    embedding = Column(Vector(128)) # Using 128 for FaceNet as suggested
    num_images = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
