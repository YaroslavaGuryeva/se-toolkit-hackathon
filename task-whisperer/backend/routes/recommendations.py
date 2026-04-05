"""
Recommendation routes.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from schemas import RecommendationResponse, RecommendationRequest
from services.recommendation import get_recommendation

router = APIRouter(prefix="/recommend", tags=["recommendations"])


@router.post("/", response_model=RecommendationResponse)
def get_task_recommendation(
    request: RecommendationRequest = RecommendationRequest(),
    db: Session = Depends(get_db),
):
    """
    Get AI-powered task prioritization recommendation.
    
    Uses Qwen LLM combined with Eisenhower Matrix logic and user behavior
    patterns to recommend what to work on next.
    """
    try:
        return get_recommendation(db, use_llm=True)
    except Exception as e:
        # Return fallback recommendation
        return get_recommendation(db, use_llm=False)
