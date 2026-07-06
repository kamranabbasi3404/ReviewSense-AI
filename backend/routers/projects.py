import os
import csv
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from database.database import get_db, SessionLocal
from models.db_models import Project, Review, User
from models.schemas import ProjectCreate, ProjectOut
from routers.auth import get_current_user
from services.sentiment_service import predict_sentiment_batch

router = APIRouter(prefix="/projects", tags=["Projects"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Max file size: 20MB
MAX_FILE_SIZE = 20 * 1024 * 1024

def analyze_and_store_reviews(project_id: int, file_path: str):
    """
    Background worker function that reads the uploaded CSV, runs BERT prediction in batches,
    and updates the database with results.
    """
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return

        # 1. Parse CSV reviews
        reviews_list = []
        try:
            with open(file_path, mode="r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                
                # Check for "review" column
                if not reader.fieldnames or "review" not in [col.strip().lower() for col in reader.fieldnames]:
                    project.status = "FAILED"
                    db.commit()
                    return
                
                # Get exact casing of 'review' column
                review_col_name = next(col for col in reader.fieldnames if col.strip().lower() == "review")
                
                for row in reader:
                    val = row.get(review_col_name)
                    if val:
                        cleaned_val = val.strip()
                        if cleaned_val:
                            reviews_list.append(cleaned_val)
        except Exception as e:
            print(f"Error parsing CSV: {e}")
            project.status = "FAILED"
            db.commit()
            return
        
        # 2. De-duplicate reviews
        reviews_list = list(dict.fromkeys(reviews_list))
        
        if not reviews_list:
            project.status = "FAILED"
            project.total_reviews = 0
            db.commit()
            return

        # 3. Predict in batches and store in DB
        batch_size = 64
        all_predictions = []
        
        # Run sentiment analysis
        try:
            all_predictions = predict_sentiment_batch(reviews_list)
        except Exception as e:
            print(f"Error running BERT analysis: {e}")
            project.status = "FAILED"
            db.commit()
            return

        # Store reviews and predictions in database
        for text, pred_info in zip(reviews_list, all_predictions):
            db_review = Review(
                project_id=project_id,
                review_text=text,
                prediction=pred_info["prediction"],
                confidence=pred_info["confidence"]
            )
            db.add(db_review)
        
        # Update project status
        project.total_reviews = len(reviews_list)
        project.status = "COMPLETED"
        db.commit()

    except Exception as e:
        print(f"Critical error in processing task: {e}")
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.status = "FAILED"
                db.commit()
        except:
            pass
    finally:
        db.close()
        # Clean up temporary uploaded file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(project_data: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = Project(
        project_name=project_data.project_name,
        user_id=current_user.id,
        status="PENDING",
        total_reviews=0
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("", response_model=list[ProjectOut])
def list_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Project).filter(Project.user_id == current_user.id).all()

@router.get("/{id}", response_model=ProjectOut)
def get_project(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project

@router.post("/{id}/upload", response_model=ProjectOut)
async def upload_csv(
    id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    if project.status == "PROCESSING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is already processing a file."
        )

    # Validate file extension and MIME type
    is_csv_mime = file.content_type in ["text/csv", "application/vnd.ms-excel", "text/plain", "application/csv"]
    if not file.filename or not file.filename.lower().endswith(".csv") or not is_csv_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format or MIME type. Only CSV files are supported."
        )

    # Validate file size (optional check using seek)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large. Max size allowed is 20MB."
        )

    # Save to temp uploads folder (prevent path traversal by using a generated UUID name)
    temp_file_name = f"project_{project.id}_{uuid.uuid4().hex}.csv"
    temp_file_path = os.path.join(UPLOAD_DIR, temp_file_name)
    
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Set status to PROCESSING
    project.status = "PROCESSING"
    db.commit()
    db.refresh(project)

    # Trigger background sentiment worker
    background_tasks.add_task(analyze_and_store_reviews, project.id, temp_file_path)  # type: ignore[arg-type]

    return project

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    db.delete(project)
    db.commit()
    return None
