import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from datetime import datetime

# --- Auth Schemas ---
class UserSignup(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`]', v):
            raise ValueError('Password must contain at least one special character (!@#$%^&* etc.)')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectCreate(BaseModel):
    project_name: str = Field(..., min_length=1, max_length=100)

class ProjectOut(BaseModel):
    id: int
    user_id: int
    project_name: str
    upload_date: datetime
    total_reviews: int
    status: str

    class Config:
        from_attributes = True

# --- Review Schemas ---
class ReviewOut(BaseModel):
    id: int
    project_id: int
    review_text: str
    prediction: Optional[str] = None
    confidence: Optional[float] = None

    class Config:
        from_attributes = True

class ReviewListResponse(BaseModel):
    reviews: List[ReviewOut]
    total_count: int
    page: int
    pages: int

# --- Analytics Schemas ---
class ConfidenceDistribution(BaseModel):
    range_name: str  # "90-100%", "80-90%", "70-80%", etc.
    count: int

class SentimentSummary(BaseModel):
    total_reviews: int
    positive_count: int
    negative_count: int
    average_confidence: float

class AnalyticsResponse(BaseModel):
    summary: SentimentSummary
    distribution: List[ConfidenceDistribution]

# --- AI Insight Schemas ---
class AIInsightsResponse(BaseModel):
    summary: str
    top_complaints: List[str]
    appreciated_features: List[str]
    recommendations: List[str]

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
