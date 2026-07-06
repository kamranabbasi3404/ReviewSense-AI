import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from database.database import engine, Base
from routers import auth, projects, analytics, ai_insights, reports

# Create Database tables (simple startup initialization)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ReviewSense AI API",
    description="Intelligent Product Review Sentiment and Analytics Platform API Backend",
    version="1.0.0"
)

# Enable CORS dynamically or fallback for frontend development
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(analytics.router)
app.include_router(ai_insights.router)
app.include_router(reports.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "ReviewSense AI Backend Server",
        "api_docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
