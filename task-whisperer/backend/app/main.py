"""
Task Whisperer - AI-Powered Task Prioritization Assistant
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import init_db
from routes import tasks_router, recommendations_router, profile_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")
    yield
    logger.info("Shutting down Task Whisperer...")


app = FastAPI(
    title="Task Whisperer",
    description="AI-powered task prioritization assistant using Qwen LLM and Eisenhower Matrix logic.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(tasks_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api")
app.include_router(profile_router, prefix="/api")


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "Task Whisperer API"}


@app.get("/")
def root():
    """Root endpoint with API info."""
    return {
        "message": "Welcome to Task Whisperer API",
        "docs": "/docs",
        "health": "/api/health",
    }
