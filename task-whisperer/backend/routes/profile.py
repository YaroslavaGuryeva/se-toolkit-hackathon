"""
User profile routes.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from schemas import UserProfileResponse, UserProfileUpdate
from services.user_profile_service import (
    get_or_create_profile,
    compute_user_profile,
    update_profile_manually,
)

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/", response_model=UserProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    """Get the current user profile with learned behavior metrics."""
    profile = get_or_create_profile(db)
    return profile


@router.post("/update", response_model=UserProfileResponse)
def update_profile(
    updates: UserProfileUpdate,
    db: Session = Depends(get_db),
):
    """
    Update user profile metrics.
    
    This endpoint also recomputes the profile from task history,
    then applies any manual overrides provided in the request body.
    """
    # First, recompute from history
    profile = compute_user_profile(db)

    # Then apply any manual overrides
    update_data = updates.model_dump(exclude_unset=True)
    if update_data:
        profile = update_profile_manually(db, **update_data)

    return profile


@router.post("/recompute", response_model=UserProfileResponse)
def recompute_profile(db: Session = Depends(get_db)):
    """
    Force a full recomputation of the user profile from task history.
    Useful after bulk task completions or data imports.
    """
    profile = compute_user_profile(db)
    return profile
