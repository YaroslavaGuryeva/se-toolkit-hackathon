"""
User profile service for computing and updating user behavior analytics.
"""
import logging
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models import UserProfile, TaskHistory, Task
from services.overdue_service import get_overdue_tasks_count

logger = logging.getLogger(__name__)


def get_or_create_profile(db: Session) -> UserProfile:
    """
    Get the existing user profile or create a new one.
    There is only one user profile in this system.
    """
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile(
            prefers_short_tasks=0.5,
            avg_completion_time=30.0,
            procrastination_score=0.0,
            urgency_bias=0.5,
            total_tasks_completed=0,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def compute_user_profile(db: Session) -> UserProfile:
    """
    Recompute user profile metrics based on task history.
    
    Calculates:
    - prefers_short_tasks: Ratio of short tasks (<30 min) completed vs total
    - avg_completion_time: Mean actual duration of completed tasks
    - procrastination_score: Based on gap between creation and completion times
    - urgency_bias: Ratio of urgent tasks completed vs total
    - total_tasks_completed: Count of completed tasks
    """
    profile = get_or_create_profile(db)

    # Fetch all completed task history records
    history_records = db.query(TaskHistory).filter(
        TaskHistory.was_completed == True
    ).all()

    if not history_records:
        # No history yet; return default profile
        return profile

    total_completed = len(history_records)
    profile.total_tasks_completed = total_completed

    # Compute avg_completion_time
    durations = [
        h.actual_duration_minutes
        for h in history_records
        if h.actual_duration_minutes is not None
    ]
    if durations:
        profile.avg_completion_time = round(sum(durations) / len(durations), 2)
    else:
        profile.avg_completion_time = 30.0

    # Compute prefers_short_tasks
    # A "short task" is defined as one that took less than 30 minutes
    short_tasks = sum(1 for d in durations if d < 30)
    profile.prefers_short_tasks = round(short_tasks / total_completed, 2) if total_completed > 0 else 0.5

    # Compute urgency_bias
    # Ratio of completed tasks that were marked as urgent
    urgent_completed = 0
    for h in history_records:
        original_task = db.query(Task).filter(Task.id == h.task_id).first()
        if original_task and original_task.is_urgent:
            urgent_completed += 1

    profile.urgency_bias = round(urgent_completed / total_completed, 2) if total_completed > 0 else 0.5

    # Compute procrastination_score
    # Higher score = more procrastination
    # Based on two factors:
    # 1. Average completion time relative to a "normal" baseline (45 min)
    # 2. Number of overdue, not-completed tasks (penalty factor)

    baseline_avg = 45.0  # Expected average task time

    # Base procrastination from completion time
    if profile.avg_completion_time > baseline_avg:
        # Scale: 0-1 based on how much over baseline
        ratio = profile.avg_completion_time / baseline_avg
        time_based_score = min(1.0, (ratio - 1.0) * 2)
    else:
        time_based_score = 0.0

    # Overdue penalty: each overdue task increases procrastination score
    # This ensures users with missed deadlines get higher procrastination scores
    overdue_count = get_overdue_tasks_count(db)

    if overdue_count > 0:
        # Overdue penalty: add 0.15 per overdue task, capped at 0.6
        overdue_penalty = min(0.6, overdue_count * 0.15)
        # Combine time-based score and overdue penalty (weighted average)
        # 70% time-based, 30% overdue penalty
        profile.procrastination_score = round(
            min(1.0, time_based_score * 0.7 + overdue_penalty * 0.3),
            2
        )
    else:
        profile.procrastination_score = round(time_based_score, 2)

    db.commit()
    db.refresh(profile)

    logger.info(
        f"Profile updated: prefers_short_tasks={profile.prefers_short_tasks}, "
        f"avg_completion_time={profile.avg_completion_time}, "
        f"procrastination_score={profile.procrastination_score}, "
        f"urgency_bias={profile.urgency_bias}"
    )

    return profile


def update_profile_manually(
    db: Session,
    prefers_short_tasks: Optional[float] = None,
    avg_completion_time: Optional[float] = None,
    procrastination_score: Optional[float] = None,
    urgency_bias: Optional[float] = None,
) -> UserProfile:
    """
    Manually update specific profile fields.
    Rarely used directly; compute_user_profile is the primary update method.
    """
    profile = get_or_create_profile(db)

    if prefers_short_tasks is not None:
        profile.prefers_short_tasks = max(0.0, min(1.0, prefers_short_tasks))
    if avg_completion_time is not None:
        profile.avg_completion_time = max(1.0, avg_completion_time)
    if procrastination_score is not None:
        profile.procrastination_score = max(0.0, min(1.0, procrastination_score))
    if urgency_bias is not None:
        profile.urgency_bias = max(0.0, min(1.0, urgency_bias))

    db.commit()
    db.refresh(profile)
    return profile
