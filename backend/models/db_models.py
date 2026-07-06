import datetime
from typing import Optional, List
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from database.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    is_2fa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    totp_secret: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    projects: Mapped[List["Project"]] = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_name: Mapped[str] = mapped_column(String, nullable=False)
    upload_date: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED

    owner: Mapped["User"] = relationship("User", back_populates="projects")
    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="project", cascade="all, delete-orphan")

class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    review_text: Mapped[str] = mapped_column(String, nullable=False)
    prediction: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # Positive, Negative
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Percentage, e.g. 98.5

    project: Mapped["Project"] = relationship("Project", back_populates="reviews")
