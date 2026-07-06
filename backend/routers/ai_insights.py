from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from database.database import get_db
from models.db_models import Project, Review, User
from models.schemas import AIInsightsResponse, ChatRequest, ChatResponse
from routers.auth import get_current_user
from services.groq_service import generate_insights, chat_with_reviews

router = APIRouter(prefix="/projects", tags=["AI Insights & Chat"])

@router.post("/{id}/summary", response_model=AIInsightsResponse)
def get_project_summary_insight(
    id: int,
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
        
    if project.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project is in '{project.status}' state. Insights are only available for completed projects."
        )

    # 1. Fetch metrics
    total_count = db.query(Review).filter(Review.project_id == id).count()
    positive_count = db.query(Review).filter(Review.project_id == id, Review.prediction == "Positive").count()
    negative_count = db.query(Review).filter(Review.project_id == id, Review.prediction == "Negative").count()

    # 2. Fetch sample reviews (limit to avoid token issues, e.g. 25 positive, 25 negative)
    sample_pos = db.query(Review.review_text).filter(
        Review.project_id == id, 
        Review.prediction == "Positive"
    ).limit(25).all()
    
    sample_neg = db.query(Review.review_text).filter(
        Review.project_id == id, 
        Review.prediction == "Negative"
    ).limit(25).all()

    # Convert tuples to strings
    sample_pos_list = [r[0] for r in sample_pos]
    sample_neg_list = [r[0] for r in sample_neg]

    # 3. Call Groq
    insights = generate_insights(
        project_name=project.project_name,
        total_count=total_count,
        positive_count=positive_count,
        negative_count=negative_count,
        sample_positive=sample_pos_list,
        sample_negative=sample_neg_list
    )

    return AIInsightsResponse(
        summary=insights.get("summary", ""),
        top_complaints=insights.get("top_complaints", []),
        appreciated_features=insights.get("appreciated_features", []),
        recommendations=insights.get("recommendations", [])
    )

@router.post("/{id}/chat", response_model=ChatResponse)
def chat_about_project(
    id: int,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat is only available for completed projects."
        )

    user_query = request.message
    
    # 1. Fetch relevant reviews context
    # We want to pull reviews containing words from the query (like 'battery', 'price', etc.)
    # Clean query and split into keywords
    keywords = [w.strip().lower() for w in user_query.split() if len(w.strip()) > 3]
    
    query_builder = db.query(Review.review_text).filter(Review.project_id == id)
    
    if keywords:
        # Check if any keyword matches reviews
        filter_conditions = [Review.review_text.like(f"%{kw}%") for kw in keywords]
        matched_reviews = query_builder.filter(or_(*filter_conditions)).limit(30).all()
    else:
        matched_reviews = []
        
    # If no matches found or list is short, fill with general mix (prioritizing negative reviews since they have more complaints)
    context_list = [r[0] for r in matched_reviews]
    if len(context_list) < 20:
        fill_reviews = db.query(Review.review_text).filter(Review.project_id == id).order_by(Review.prediction.asc()).limit(30).all()
        context_list.extend([r[0] for r in fill_reviews if r[0] not in context_list])

    # 2. Total reviews count
    total_reviews = db.query(Review).filter(Review.project_id == id).count()

    # 3. Call Groq Service
    ai_answer = chat_with_reviews(
        query=user_query,
        project_name=project.project_name,
        total_count=total_reviews,
        reviews_context=context_list
    )

    return ChatResponse(response=ai_answer)
