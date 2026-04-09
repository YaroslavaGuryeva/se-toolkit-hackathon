"""
Task CRUD routes.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from db import get_db
from models import Task, TaskHistory
from schemas import TaskCreate, TaskUpdate, TaskResponse, TaskCompleteRequest, TaskHistoryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["tasks"])


class CategoryUpdate(BaseModel):
    """Schema for updating just the task category."""
    category_override: Optional[str] = Field(None, description="Q1-Do First, Q2-Schedule, Q3-Delegate, Q4-Eliminate, or null to use auto-classification")


@router.get("/", response_model=List[TaskResponse])
def list_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all tasks, with pagination support."""
    tasks = db.query(Task).order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    return tasks


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task."""
    task = Task(
        title=task_data.title,
        description=task_data.description,
        deadline=task_data.deadline,
        effort=task_data.effort,
        importance=task_data.importance,
        is_urgent=task_data.is_urgent,
        category_override=task_data.category_override,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a single task by ID."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_data: TaskUpdate, db: Session = Depends(get_db)):
    """Update an existing task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task and its associated history."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    try:
        # Delete associated task history records first (FK has ON DELETE CASCADE, but being explicit)
        db.query(TaskHistory).filter(TaskHistory.task_id == task_id).delete()

        db.delete(task)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete task: {type(e).__name__}: {str(e)}"
        )


@router.post("/{task_id}/complete", response_model=TaskHistoryResponse, status_code=status.HTTP_201_CREATED)
def complete_task(task_id: int, request: TaskCompleteRequest, db: Session = Depends(get_db)):
    """
    Mark a task as complete and record the actual duration.
    Creates a task history entry for profile learning.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.completed:
        raise HTTPException(status_code=400, detail="Task is already completed")

    # Mark task as completed
    task.completed = True
    db.commit()

    # Check if this task was previously recommended
    # (We track this in the recommendation endpoint; default to False)
    was_recommended = False
    recommendation_rank = None

    # Create history record
    history = TaskHistory(
        task_id=task_id,
        actual_duration_minutes=request.actual_duration_minutes,
        was_recommended=was_recommended,
        recommendation_rank=recommendation_rank,
        was_completed=True,
    )
    db.add(history)
    db.commit()
    db.refresh(history)

    # Recompute user profile after task completion
    from services.user_profile_service import compute_user_profile
    compute_user_profile(db)

    return history


@router.get("/{task_id}/history", response_model=List[TaskHistoryResponse])
def get_task_history(task_id: int, db: Session = Depends(get_db)):
    """Get completion history for a specific task."""
    history = db.query(TaskHistory).filter(TaskHistory.task_id == task_id).all()
    return history


@router.patch("/{task_id}/category", response_model=TaskResponse)
def update_task_category(task_id: int, category_data: CategoryUpdate, db: Session = Depends(get_db)):
    """Update the category override for a task. Set to null to use auto-classification."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    valid_categories = {"Q1-Do First", "Q2-Schedule", "Q3-Delegate", "Q4-Eliminate", None}
    if category_data.category_override not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: Q1-Do First, Q2-Schedule, Q3-Delegate, Q4-Eliminate, or null"
        )

    task.category_override = category_data.category_override
    db.commit()
    db.refresh(task)
    return task
