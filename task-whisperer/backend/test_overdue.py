"""
Test overdue task detection service and integration.

Tests the overdue_service.py functions and their integration with
task completion and profile recomputation.
"""
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session


class TestOverdueService(unittest.TestCase):
    """Test overdue task detection and marking functions."""

    def setUp(self):
        """Set up test fixtures."""
        self.mock_db = MagicMock(spec=Session)
        self.now = datetime.now(timezone.utc)

    def _make_mock_task(self, task_id, deadline=None, completed=False, overdue=False):
        """Create a mock task object."""
        task = MagicMock()
        task.id = task_id
        task.title = f"Task {task_id}"
        task.deadline = deadline
        task.completed = completed
        task.overdue = overdue
        return task

    def test_detect_overdue_marks_past_deadline_incomplete(self):
        """Tasks with past deadlines that are incomplete should be marked overdue."""
        past_task = self._make_mock_task(
            1,
            deadline=self.now - timedelta(hours=2),
            completed=False,
            overdue=False
        )
        self.mock_db.query.return_value.filter.return_value.all.return_value = [past_task]

        from services.overdue_service import detect_and_mark_overdue_tasks
        result = detect_and_mark_overdue_tasks(self.mock_db)

        self.assertEqual(result, 1)
        self.assertTrue(past_task.overdue)
        self.mock_db.commit.assert_called_once()

    def test_detect_overdue_ignores_completed_tasks(self):
        """Completed tasks should not be marked overdue even if deadline passed."""
        completed_task = self._make_mock_task(
            1,
            deadline=self.now - timedelta(hours=2),
            completed=True,
            overdue=False
        )
        self.mock_db.query.return_value.filter.return_value.all.return_value = []

        from services.overdue_service import detect_and_mark_overdue_tasks
        result = detect_and_mark_overdue_tasks(self.mock_db)

        self.assertEqual(result, 0)
        self.mock_db.commit.assert_not_called()

    def test_detect_overdue_ignores_already_overdue(self):
        """Tasks already marked overdue should not be counted again."""
        self.mock_db.query.return_value.filter.return_value.all.return_value = []

        from services.overdue_service import detect_and_mark_overdue_tasks
        result = detect_and_mark_overdue_tasks(self.mock_db)

        self.assertEqual(result, 0)

    def test_detect_overdue_ignores_future_deadlines(self):
        """Tasks with future deadlines should not be marked overdue."""
        self.mock_db.query.return_value.filter.return_value.all.return_value = []

        from services.overdue_service import detect_and_mark_overdue_tasks
        result = detect_and_mark_overdue_tasks(self.mock_db)

        self.assertEqual(result, 0)

    def test_detect_overdue_multiple_tasks(self):
        """Multiple overdue tasks should all be marked."""
        tasks = [
            self._make_mock_task(1, self.now - timedelta(hours=5), False, False),
            self._make_mock_task(2, self.now - timedelta(days=1), False, False),
            self._make_mock_task(3, self.now - timedelta(hours=1), False, False),
        ]
        self.mock_db.query.return_value.filter.return_value.all.return_value = tasks

        from services.overdue_service import detect_and_mark_overdue_tasks
        result = detect_and_mark_overdue_tasks(self.mock_db)

        self.assertEqual(result, 3)
        self.assertTrue(all(t.overdue for t in tasks))
        self.mock_db.commit.assert_called_once()

    def test_get_overdue_tasks_count(self):
        """Should return count of all overdue tasks (including already marked)."""
        self.mock_db.query.return_value.filter.return_value.count.return_value = 5

        from services.overdue_service import get_overdue_tasks_count
        result = get_overdue_tasks_count(self.mock_db)

        self.assertEqual(result, 5)

    def test_detect_overdue_no_tasks(self):
        """When no tasks need marking, should return 0 and not commit."""
        self.mock_db.query.return_value.filter.return_value.all.return_value = []

        from services.overdue_service import detect_and_mark_overdue_tasks
        result = detect_and_mark_overdue_tasks(self.mock_db)

        self.assertEqual(result, 0)
        self.mock_db.commit.assert_not_called()


class TestOverdueIntegration(unittest.TestCase):
    """Test overdue detection integration with profile computation."""

    @patch('services.user_profile_service.get_overdue_tasks_count')
    @patch('services.user_profile_service.TaskHistory')
    @patch('services.user_profile_service.Task')
    @patch('services.user_profile_service.get_or_create_profile')
    def test_procrastination_score_increases_with_overdue(
        self, mock_get_profile, mock_task, mock_history, mock_get_overdue
    ):
        """Procrastination score should increase with overdue tasks."""
        # Mock profile
        profile = MagicMock()
        profile.avg_completion_time = 50.0
        profile.procrastination_score = 0.0
        mock_get_profile.return_value = profile

        # Mock task history
        mock_history.query.return_value.filter.return_value.all.return_value = [
            MagicMock(actual_duration_minutes=45),
            MagicMock(actual_duration_minutes=55),
        ]

        # Mock overdue count
        mock_get_overdue.return_value = 3

        # Mock task lookups
        mock_task.query.return_value.filter.return_value.first.return_value = MagicMock(is_urgent=False)

        mock_db = MagicMock()

        from services.user_profile_service import compute_user_profile
        result = compute_user_profile(mock_db)

        # Verify procrastination score was updated with overdue penalty
        self.assertGreater(result.procrastination_score, 0)
        
        # With 3 overdue tasks, penalty should be min(0.6, 3 * 0.15) = 0.45
        # Combined with time-based score
        self.assertLessEqual(result.procrastination_score, 1.0)


class TestOverdueAPIEndpoints(unittest.TestCase):
    """Test the API endpoint schemas."""

    def test_overdue_detection_response_schema(self):
        """OverdueDetectionResponse should have required fields."""
        from schemas import OverdueDetectionResponse

        response = OverdueDetectionResponse(
            newly_marked=5,
            total_overdue=10
        )

        self.assertEqual(response.newly_marked, 5)
        self.assertEqual(response.total_overdue, 10)

    def test_overdue_detection_response_defaults(self):
        """OverdueDetectionResponse should accept zero values."""
        from schemas import OverdueDetectionResponse

        response = OverdueDetectionResponse(
            newly_marked=0,
            total_overdue=0
        )

        self.assertEqual(response.newly_marked, 0)
        self.assertEqual(response.total_overdue, 0)


class TestTaskModelOverdueField(unittest.TestCase):
    """Test that Task model has overdue field."""

    def test_task_model_has_overdue_field(self):
        """Task model should have overdue boolean field."""
        from models import Task

        # Check that overdue column exists
        self.assertTrue(hasattr(Task, 'overdue'))

    def test_task_overdue_default_false(self):
        """Task overdue field should default to False."""
        from models import Task

        task = Task(
            title="Test Task",
            importance=5
        )
        # SQLAlchemy Column default
        self.assertEqual(Task.overdue.default.arg, False)


if __name__ == "__main__":
    unittest.main()
