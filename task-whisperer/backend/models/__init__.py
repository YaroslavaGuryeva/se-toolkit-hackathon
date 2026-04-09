"""
SQLAlchemy models for tasks, task history, and user profile.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.sql import func
from db import Base


class Task(Base):
    """Represents a task to be prioritized."""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    effort = Column(Integer, nullable=True, comment="Estimated effort in minutes")
    importance = Column(Integer, nullable=False, default=5, comment="Importance rating 1-10")
    is_urgent = Column(Boolean, nullable=False, default=False, comment="Whether the task is urgent")
    category_override = Column(String(50), nullable=True, comment="User-approved category override (Q1-Do First, Q2-Schedule, Q3-Delegate, Q4-Eliminate)")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed = Column(Boolean, nullable=False, default=False)


class TaskHistory(Base):
    """Tracks completion history and recommendation data for tasks."""
    __tablename__ = "task_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    actual_duration_minutes = Column(Float, nullable=True)
    was_recommended = Column(Boolean, nullable=False, default=False)
    recommendation_rank = Column(Integer, nullable=True)
    was_completed = Column(Boolean, nullable=False, default=True)


class UserProfile(Base):
    """Stores learned user behavior for adaptive recommendations."""
    __tablename__ = "user_profile"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    prefers_short_tasks = Column(Float, nullable=False, default=0.5, comment="Preference for short tasks (0-1)")
    avg_completion_time = Column(Float, nullable=False, default=30.0, comment="Average task completion time in minutes")
    procrastination_score = Column(Float, nullable=False, default=0.0, comment="Procrastination indicator (0-1, higher = more procrastination)")
    urgency_bias = Column(Float, nullable=False, default=0.5, comment="Tendency to prioritize urgent tasks (0-1)")
    total_tasks_completed = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
