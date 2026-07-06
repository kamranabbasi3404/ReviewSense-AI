from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from database.database import get_db
from models.db_models import Project, Review, User
from models.schemas import AnalyticsResponse, SentimentSummary, ConfidenceDistribution, ReviewListResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/{id}", response_model=AnalyticsResponse)
def get_analytics(
    id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Verify project exists and belongs to current user
    project = db.query(Project).filter(Project.id == id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    if project.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project is in '{project.status}' status. Analytics only available for COMPLETED projects."
        )

    # 1. Calculate Sentiment Statistics
    total_reviews = db.query(Review).filter(Review.project_id == id).count()
    positive_count = db.query(Review).filter(Review.project_id == id, Review.prediction == "Positive").count()
    negative_count = db.query(Review).filter(Review.project_id == id, Review.prediction == "Negative").count()
    
    avg_confidence_query = db.query(func.avg(Review.confidence)).filter(Review.project_id == id).scalar()
    avg_confidence = round(avg_confidence_query, 2) if avg_confidence_query is not None else 0.0

    summary = SentimentSummary(
        total_reviews=total_reviews,
        positive_count=positive_count,
        negative_count=negative_count,
        average_confidence=avg_confidence
    )

    # 2. Confidence Distribution
    # Intervals: 90-100%, 80-90%, 70-80%, under 70%
    ranges = [
        {"name": "90-100%", "min": 90.0, "max": 100.0},
        {"name": "80-90%", "min": 80.0, "max": 90.0},
        {"name": "70-80%", "min": 70.0, "max": 80.0},
        {"name": "< 70%", "min": 0.0, "max": 70.0}
    ]

    distribution = []
    for r in ranges:
        count = db.query(Review).filter(
            Review.project_id == id,
            Review.confidence >= r["min"],
            Review.confidence < r["max"] if r["max"] < 100.0 else Review.confidence <= 100.0
        ).count()
        distribution.append(
            ConfidenceDistribution(range_name=r["name"], count=count)
        )

    return AnalyticsResponse(summary=summary, distribution=distribution)

@router.get("/{id}/reviews", response_model=ReviewListResponse)
def get_project_reviews(
    id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    sentiment: str = Query(None),
    sort_by: str = Query("id"),
    sort_order: str = Query("desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify project
    project = db.query(Project).filter(Project.id == id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    query = db.query(Review).filter(Review.project_id == id)

    # Search filter
    if search:
        query = query.filter(Review.review_text.like(f"%{search}%"))

    # Sentiment filter
    if sentiment:
        query = query.filter(Review.prediction == sentiment)

    # Sorting
    order_column = getattr(Review, sort_by, Review.id)
    if sort_order.lower() == "desc":
        query = query.order_by(order_column.desc())
    else:
        query = query.order_by(order_column.asc())

    # Pagination calculation
    total_count = query.count()
    pages = (total_count + limit - 1) // limit
    offset = (page - 1) * limit
    
    reviews = query.offset(offset).limit(limit).all()

    return ReviewListResponse(
        reviews=reviews,
        total_count=total_count,
        page=page,
        pages=pages
    )
