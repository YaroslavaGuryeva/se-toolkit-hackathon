"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Task Schemas ───────────────────────────────────────────────

class TaskCreate(BaseModel):
    """Schema for creating a new task."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    effort: Optional[int] = Field(None, ge=1, description="Estimated effort in minutes")
    importance: int = Field(default=5, ge=1, le=10, description="Importance rating 1-10")
    is_urgent: bool = False


class TaskUpdate(BaseModel):
    """Schema for updating an existing task."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    effort: Optional[int] = Field(None, ge=1)
    importance: Optional[int] = Field(None, ge=1, le=10)
    is_urgent: Optional[bool] = None
    completed: Optional[bool] = None


class TaskResponse(BaseModel):
    """Schema returned for task operations."""
    id: int
    title: str
    description: Optional[str]
    deadline: Optional[datetime]
    effort: Optional[int]
    importance: int
    is_urgent: bool
    completed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Task Completion Schemas ────────────────────────────────────

class TaskCompleteRequest(BaseModel):
    """Schema for marking a task as complete with duration tracking."""
    actual_duration_minutes: float = Field(..., gt=0, description="Actual time spent on the task in minutes")


class TaskHistoryResponse(BaseModel):
    """Schema for task history records."""
    id: int
    task_id: int
    completed_at: datetime
    actual_duration_minutes: Optional[float]
    was_recommended: bool
    recommendation_rank: Optional[int]
    was_completed: bool

    class Config:
        from_attributes = True


# ─── Recommendation Schemas ─────────────────────────────────────

class RecommendationRequest(BaseModel):
    """Schema for requesting a task recommendation."""
    pass  # No body required; uses all active tasks + profile


class RankedTask(BaseModel):
    """A single task in the recommendation ranking."""
    task_id: int
    title: str
    rank: int
    score: float
    eisenhower_quadrant: str  # "Q1-Do First", "Q2-Schedule", "Q3-Delegate", "Q4-Eliminate"


class RecommendationResponse(BaseModel):
    """Schema returned by the recommendation endpoint."""
    recommended_task: Optional[RankedTask] = None
    ranking: List[RankedTask] = []
    explanation: str = ""


# ─── User Profile Schemas ───────────────────────────────────────

class UserProfileResponse(BaseModel):
    """Schema for user profile data."""
    id: int
    prefers_short_tasks: float
    avg_completion_time: float
    procrastination_score: float
    urgency_bias: float
    total_tasks_completed: int
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """Schema for manually updating user profile (rarely used directly)."""
    prefers_short_tasks: Optional[float] = Field(None, ge=0, le=1)
    avg_completion_time: Optional[float] = Field(None, gt=0)
    procrastination_score: Optional[float] = Field(None, ge=0, le=1)
    urgency_bias: Optional[float] = Field(None, ge=0, le=1)
