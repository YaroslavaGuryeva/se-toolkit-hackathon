"""
Overdue task detection service.
Identifies tasks with deadlines in the past that are not yet completed and marks them as overdue.
"""
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models import Task

logger = logging.getLogger(__name__)


def detect_and_mark_overdue_tasks(db: Session) -> int:
    """
    Find all tasks with deadlines in the past that are not completed and not already marked overdue.
    Mark them as overdue and return the count of updated tasks.
    """
    now = datetime.now(timezone.utc)

    # Find tasks that should be marked as overdue:
    # - deadline is in the past
    # - not completed
    # - not already marked as overdue
    overdue_tasks = db.query(Task).filter(
        and_(
            Task.deadline != None,
            Task.deadline < now,
            Task.completed == False,
            Task.overdue == False,
        )
    ).all()

    count = 0
    for task in overdue_tasks:
        task.overdue = True
        count += 1

    if count > 0:
        db.commit()
        logger.info(f"Marked {count} task(s) as overdue")

    return count


def get_overdue_tasks_count(db: Session) -> int:
    """
    Get the count of tasks that are currently overdue (deadline passed and not completed).
    """
    now = datetime.now(timezone.utc)

    count = db.query(Task).filter(
        and_(
            Task.deadline != None,
            Task.deadline < now,
            Task.completed == False,
        )
    ).count()

    return count
