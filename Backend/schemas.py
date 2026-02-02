from pydantic import BaseModel, Field
from typing import List, Optional

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str

class RecognizeRequest(BaseModel):
    image: Optional[str] = None
    images: Optional[List[str]] = None
    period: Optional[str] = ""
    date: Optional[str] = None

class MarkAttendanceRequest(BaseModel):
    studentId: str
    name: str
    date: str
    period: str
    emotion: Optional[str] = "Neutral"
    livenessConfidence: Optional[float] = 75.0
    recognitionConfidence: Optional[float] = 85.0
    isLive: Optional[bool] = True
