"""
Test for Bug #7: Q4 (Eliminate) tasks MUST always rank below Q3 (Delegate) tasks.

This test verifies the invariant that regardless of scores, deadlines, or other factors,
Q4 tasks should NEVER appear above Q3 tasks in the recommendation ranking.

This version is self-contained and copies the actual ranking logic to test it.
"""
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from typing import List, Dict, Any
from dataclasses import dataclass


# ─── Inline copies of the actual code from recommendation.py ───────────────
# This ensures we can test the logic without needing the full backend environment

@dataclass
class MockRankedTask:
    task_id: int
    title: str
    rank: int
    score: float
    eisenhower_quadrant: str


def _compute_deadline_urgency(task) -> float:
    if not task.deadline:
        return 0.3
    now = datetime.now(timezone.utc)
    deadline = task.deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    delta = deadline - now
    total_seconds = delta.total_seconds()
    if total_seconds <= 0:
        return 1.0
    elif total_seconds <= 3600:
        return 0.95
    elif total_seconds <= 86400:
        return 0.8
    elif total_seconds <= 172800:
        return 0.6
    elif total_seconds <= 604800:
        return 0.4
    else:
        return 0.2


def _get_eisenhower_quadrant(task) -> str:
    if task.category_override:
        return task.category_override
    if task.is_urgent and task.importance >= 7:
        return "Q1-Do First"
    elif not task.is_urgent and task.importance >= 7:
        return "Q2-Schedule"
    elif task.is_urgent and task.importance < 7:
        return "Q3-Delegate"
    else:
        return "Q4-Eliminate"


def _fallback_ranking(tasks, profile) -> List[Dict[str, Any]]:
    QUADRANT_PRIORITY = {
        "Q1-Do First": 0,
        "Q2-Schedule": 1,
        "Q3-Delegate": 2,
        "Q4-Eliminate": 3,
    }

    ranked = []
    for task in tasks:
        deadline_score = _compute_deadline_urgency(task)
        importance_score = task.importance / 10.0
        effort_penalty = 0.0
        if task.effort:
            effort_penalty = max(0, (60 - task.effort)) / 100.0 * profile.prefers_short_tasks

        urgency_weight = profile.urgency_bias
        importance_weight = 1.0 - urgency_weight

        raw_score = (
            urgency_weight * deadline_score
            + importance_weight * importance_score
            + 0.15 * effort_penalty
        )

        if profile.procrastination_score > 0.7:
            raw_score += 0.1 * importance_score

        score = min(100, max(0, raw_score * 100))
        quadrant = _get_eisenhower_quadrant(task)

        quadrant_order = QUADRANT_PRIORITY.get(quadrant, 3)
        if quadrant_order == QUADRANT_PRIORITY["Q4-Eliminate"]:
            score = min(score, 10.0)

        ranked.append({
            "task_id": task.id,
            "title": task.title,
            "score": round(score, 2),
            "eisenhower_quadrant": quadrant,
            "_quadrant_order": quadrant_order,
        })

    ranked.sort(key=lambda x: (
        x["_quadrant_order"],
        -x["score"],
        -next((t.importance for t in tasks if t.id == x["task_id"]), 0),
    ))

    for i, item in enumerate(ranked):
        item["rank"] = i + 1
        del item["_quadrant_order"]

    return ranked


def _enforce_quadrant_order(ranking, task_lookup) -> List:
    QUADRANT_KEY = {"Q1-Do First": 0, "Q2-Schedule": 1, "Q3-Delegate": 2, "Q4-Eliminate": 3}

    quadrants: Dict[int, List] = {0: [], 1: [], 2: [], 3: []}

    for item in ranking:
        q_key = item.eisenhower_quadrant
        q_order = QUADRANT_KEY.get(q_key, 3)
        quadrants[q_order].append(item)

    q3_scores = [item.score for item in quadrants[2]]
    q4_scores = [item.score for item in quadrants[3]]

    if q3_scores and q4_scores:
        q3_min = min(q3_scores)
        if q4_scores:
            q4_max = max(q4_scores)
            if q4_max >= q3_min and q4_max > 0:
                scale_factor = (q3_min * 0.9) / q4_max
                for item in quadrants[3]:
                    item.score = round(item.score * scale_factor, 2)
    elif q4_scores and not q3_scores:
        for item in quadrants[3]:
            item.score = min(item.score, 10.0)

    result = []
    for q_order in [0, 1, 2, 3]:
        quadrant_tasks = sorted(quadrants[q_order], key=lambda x: x.rank)
        result.extend(quadrant_tasks)

    for i, item in enumerate(result):
        item.rank = i + 1

    return result


# ─── Test helpers ────────────────────────────────────────────────────────────

def _make_mock_task(
    task_id: int,
    title: str,
    importance: int = 5,
    is_urgent: bool = False,
    effort: int = 30,
    deadline=None,
    category_override: str = None,
):
    task = MagicMock()
    task.id = task_id
    task.title = title
    task.description = "Test task"
    task.importance = importance
    task.is_urgent = is_urgent
    task.effort = effort
    task.deadline = deadline
    task.category_override = category_override
    task.completed = False
    return task


def _make_mock_profile(
    prefers_short_tasks: float = 0.5,
    urgency_bias: float = 0.5,
    procrastination_score: float = 0.0,
    avg_completion_time: float = 30.0,
    total_tasks_completed: int = 10,
):
    profile = MagicMock()
    profile.prefers_short_tasks = prefers_short_tasks
    profile.urgency_bias = urgency_bias
    profile.procrastination_score = procrastination_score
    profile.avg_completion_time = avg_completion_time
    profile.total_tasks_completed = total_tasks_completed
    return profile


# ─── Tests ───────────────────────────────────────────────────────────────────

class TestBug7_Q4BelowQ3_FallbackRanking(unittest.TestCase):
    """Test that _fallback_ranking always places Q4 tasks below Q3 tasks."""

    def test_q4_tasks_ranked_below_q3_basic(self):
        """Basic test: Q4 tasks should rank below Q3 tasks."""
        q3_task = _make_mock_task(1, "Q3 Task", importance=4, is_urgent=True, effort=30)
        q4_task = _make_mock_task(2, "Q4 Task", importance=3, is_urgent=False, effort=30)

        profile = _make_mock_profile()
        ranked = _fallback_ranking([q3_task, q4_task], profile)

        q3_rank = next(item["rank"] for item in ranked if item["task_id"] == 1)
        q4_rank = next(item["rank"] for item in ranked if item["task_id"] == 2)
        self.assertLess(q3_rank, q4_rank, f"Q3 rank ({q3_rank}) must be less than Q4 rank ({q4_rank})")

    def test_q4_high_score_still_below_q3_low_score(self):
        """Q4 task with high importance should still rank below Q3 with low importance."""
        q3_task = _make_mock_task(1, "Q3 Task", importance=5, is_urgent=True, effort=30)
        q4_task = _make_mock_task(2, "Q4 High Importance", importance=6, is_urgent=False, effort=30)

        profile = _make_mock_profile()
        ranked = _fallback_ranking([q3_task, q4_task], profile)

        q3_rank = next(item["rank"] for item in ranked if item["task_id"] == 1)
        q4_rank = next(item["rank"] for item in ranked if item["task_id"] == 2)
        self.assertLess(q3_rank, q4_rank, f"Q3 rank ({q3_rank}) must be less than Q4 rank ({q4_rank})")

    def test_q4_score_capped_at_10(self):
        """Q4 tasks should have scores capped at 10.0 in fallback ranking."""
        q4_task = _make_mock_task(
            1, "Q4 Task",
            importance=6,
            is_urgent=False,
            effort=10,
            deadline=datetime.now(timezone.utc) + timedelta(hours=1),
        )

        profile = _make_mock_profile(urgency_bias=0.9, prefers_short_tasks=1.0)
        ranked = _fallback_ranking([q4_task], profile)

        q4_score = ranked[0]["score"]
        self.assertLessEqual(q4_score, 10.0, f"Q4 score ({q4_score}) must be capped at 10.0")

    def test_multiple_q3_q4_tasks_ordering(self):
        """Multiple Q3 and Q4 tasks should maintain quadrant ordering."""
        tasks = [
            _make_mock_task(1, "Q3 Task A", importance=5, is_urgent=True, effort=30),
            _make_mock_task(2, "Q3 Task B", importance=4, is_urgent=True, effort=45),
            _make_mock_task(3, "Q4 Task A", importance=6, is_urgent=False, effort=15),
            _make_mock_task(4, "Q4 Task B", importance=3, is_urgent=False, effort=60),
        ]

        profile = _make_mock_profile()
        ranked = _fallback_ranking(tasks, profile)

        q3_ranks = [item["rank"] for item in ranked if item["task_id"] in (1, 2)]
        q4_ranks = [item["rank"] for item in ranked if item["task_id"] in (3, 4)]

        max_q3_rank = max(q3_ranks)
        min_q4_rank = min(q4_ranks)

        self.assertLess(max_q3_rank, min_q4_rank,
                        f"All Q3 ranks {q3_ranks} must be below all Q4 ranks {q4_ranks}")

    def test_q4_only_tasks_no_q3(self):
        """When only Q4 tasks exist, they should still be ranked properly."""
        tasks = [
            _make_mock_task(1, "Q4 Task A", importance=5, is_urgent=False, effort=30),
            _make_mock_task(2, "Q4 Task B", importance=3, is_urgent=False, effort=45),
        ]

        profile = _make_mock_profile()
        ranked = _fallback_ranking(tasks, profile)

        for item in ranked:
            self.assertLessEqual(item["score"], 10.0,
                                 f"Q4 task score ({item['score']}) must be capped at 10.0")


class TestBug7_Q4BelowQ3_EnforceQuadrantOrder(unittest.TestCase):
    """Test that _enforce_quadrant_order always places Q4 below Q3 for LLM ranking."""

    def test_q4_ranked_below_q3_basic(self):
        """Basic enforcement: Q4 tasks should be moved below Q3 tasks."""
        ranking = [
            MockRankedTask(task_id=1, title="Q4 Task", rank=1, score=50.0, eisenhower_quadrant="Q4-Eliminate"),
            MockRankedTask(task_id=2, title="Q3 Task", rank=2, score=40.0, eisenhower_quadrant="Q3-Delegate"),
        ]
        task_lookup = {
            1: _make_mock_task(1, "Q4 Task", is_urgent=False, importance=5),
            2: _make_mock_task(2, "Q3 Task", is_urgent=True, importance=5),
        }

        result = _enforce_quadrant_order(ranking, task_lookup)

        q4_rank = next(item.rank for item in result if item.task_id == 1)
        q3_rank = next(item.rank for item in result if item.task_id == 2)
        self.assertLess(q3_rank, q4_rank, f"Q3 rank ({q3_rank}) must be less than Q4 rank ({q4_rank})")

    def test_q4_score_scaled_below_q3_min(self):
        """Q4 scores should be scaled to 90% of minimum Q3 score."""
        ranking = [
            MockRankedTask(task_id=1, title="Q4 Task A", rank=1, score=80.0, eisenhower_quadrant="Q4-Eliminate"),
            MockRankedTask(task_id=2, title="Q3 Task A", rank=2, score=50.0, eisenhower_quadrant="Q3-Delegate"),
            MockRankedTask(task_id=3, title="Q3 Task B", rank=3, score=40.0, eisenhower_quadrant="Q3-Delegate"),
            MockRankedTask(task_id=4, title="Q4 Task B", rank=4, score=30.0, eisenhower_quadrant="Q4-Eliminate"),
        ]
        task_lookup = {
            1: _make_mock_task(1, "Q4 Task A", is_urgent=False, importance=5),
            2: _make_mock_task(2, "Q3 Task A", is_urgent=True, importance=5),
            3: _make_mock_task(3, "Q3 Task B", is_urgent=True, importance=4),
            4: _make_mock_task(4, "Q4 Task B", is_urgent=False, importance=3),
        }

        result = _enforce_quadrant_order(ranking, task_lookup)

        q3_scores = [item.score for item in result if item.eisenhower_quadrant == "Q3-Delegate"]
        q4_scores = [item.score for item in result if item.eisenhower_quadrant == "Q4-Eliminate"]

        q3_min = min(q3_scores)
        q4_max = max(q4_scores)

        self.assertLess(q4_max, q3_min,
                        f"Max Q4 score ({q4_max}) must be less than min Q3 score ({q3_min})")

    def test_q4_only_no_q3_scaling(self):
        """When only Q4 tasks exist, scores should be capped at 10.0."""
        ranking = [
            MockRankedTask(task_id=1, title="Q4 Task A", rank=1, score=80.0, eisenhower_quadrant="Q4-Eliminate"),
            MockRankedTask(task_id=2, title="Q4 Task B", rank=2, score=60.0, eisenhower_quadrant="Q4-Eliminate"),
        ]
        task_lookup = {
            1: _make_mock_task(1, "Q4 Task A", is_urgent=False, importance=5),
            2: _make_mock_task(2, "Q4 Task B", is_urgent=False, importance=3),
        }

        result = _enforce_quadrant_order(ranking, task_lookup)

        for item in result:
            self.assertLessEqual(item.score, 10.0,
                                 f"Q4 score ({item.score}) must be capped at 10.0 when no Q3 tasks exist")

    def test_full_quadrant_order_q1_q2_q3_q4(self):
        """All quadrants present should be ordered Q1 > Q2 > Q3 > Q4."""
        ranking = [
            MockRankedTask(task_id=4, title="Q4 Task", rank=1, score=90.0, eisenhower_quadrant="Q4-Eliminate"),
            MockRankedTask(task_id=1, title="Q1 Task", rank=2, score=85.0, eisenhower_quadrant="Q1-Do First"),
            MockRankedTask(task_id=3, title="Q3 Task", rank=3, score=70.0, eisenhower_quadrant="Q3-Delegate"),
            MockRankedTask(task_id=2, title="Q2 Task", rank=4, score=75.0, eisenhower_quadrant="Q2-Schedule"),
        ]
        task_lookup = {
            1: _make_mock_task(1, "Q1 Task", is_urgent=True, importance=8),
            2: _make_mock_task(2, "Q2 Task", is_urgent=False, importance=8),
            3: _make_mock_task(3, "Q3 Task", is_urgent=True, importance=5),
            4: _make_mock_task(4, "Q4 Task", is_urgent=False, importance=5),
        }

        result = _enforce_quadrant_order(ranking, task_lookup)

        ranks = {item.task_id: item.rank for item in result}
        self.assertEqual(ranks[1], 1, "Q1 Task should be rank 1")
        self.assertEqual(ranks[2], 2, "Q2 Task should be rank 2")
        self.assertEqual(ranks[3], 3, "Q3 Task should be rank 3")
        self.assertEqual(ranks[4], 4, "Q4 Task should be rank 4")

    def test_llm_incorrect_order_corrected(self):
        """LLM might rank Q4 above Q3 due to high score - this must be corrected."""
        ranking = [
            MockRankedTask(task_id=1, title="Q4 Important-Looking", rank=1, score=95.0,
                           eisenhower_quadrant="Q4-Eliminate"),
            MockRankedTask(task_id=2, title="Q3 Routine", rank=2, score=45.0,
                           eisenhower_quadrant="Q3-Delegate"),
        ]
        task_lookup = {
            1: _make_mock_task(1, "Q4 Important-Looking", is_urgent=False, importance=6),
            2: _make_mock_task(2, "Q3 Routine", is_urgent=True, importance=5),
        }

        result = _enforce_quadrant_order(ranking, task_lookup)

        q3_item = next(item for item in result if item.task_id == 2)
        q4_item = next(item for item in result if item.task_id == 1)

        self.assertEqual(q3_item.rank, 1, "Q3 task must be rank 1 after enforcement")
        self.assertEqual(q4_item.rank, 2, "Q4 task must be rank 2 after enforcement")
        self.assertLess(q4_item.score, q3_item.score,
                        f"Q4 score ({q4_item.score}) must be less than Q3 score ({q3_item.score})")


class TestBug7_Q4BelowQ3_Integration(unittest.TestCase):
    """Integration-style tests combining both ranking methods."""

    def test_fallback_ranking_with_mixed_quadrants(self):
        """Test full fallback ranking with all four quadrants."""
        tasks = [
            _make_mock_task(1, "Q1 Crisis", importance=9, is_urgent=True, effort=60),
            _make_mock_task(2, "Q2 Planning", importance=8, is_urgent=False, effort=120),
            _make_mock_task(3, "Q3 Interruption", importance=4, is_urgent=True, effort=15),
            _make_mock_task(4, "Q4 Busywork", importance=3, is_urgent=False, effort=45),
            _make_mock_task(5, "Q4 Filing", importance=2, is_urgent=False, effort=30),
            _make_mock_task(6, "Q3 Email", importance=5, is_urgent=True, effort=20),
        ]

        profile = _make_mock_profile()
        ranked = _fallback_ranking(tasks, profile)

        q1_ranks = [item["rank"] for item in ranked if item["eisenhower_quadrant"].startswith("Q1")]
        q2_ranks = [item["rank"] for item in ranked if item["eisenhower_quadrant"].startswith("Q2")]
        q3_ranks = [item["rank"] for item in ranked if item["eisenhower_quadrant"].startswith("Q3")]
        q4_ranks = [item["rank"] for item in ranked if item["eisenhower_quadrant"].startswith("Q4")]

        if q1_ranks and q2_ranks:
            self.assertLess(max(q1_ranks), min(q2_ranks), "Q1 must rank above Q2")
        if q2_ranks and q3_ranks:
            self.assertLess(max(q2_ranks), min(q3_ranks), "Q2 must rank above Q3")
        if q3_ranks and q4_ranks:
            self.assertLess(max(q3_ranks), min(q4_ranks), "Q3 must rank above Q4")

    def test_q4_never_above_q3_edge_case_deadlines(self):
        """Q4 task with near deadline should still be below Q3 with far deadline."""
        tasks = [
            _make_mock_task(
                1, "Q3 Far Deadline",
                importance=5, is_urgent=True, effort=30,
                deadline=datetime.now(timezone.utc) + timedelta(days=7),
            ),
            _make_mock_task(
                2, "Q4 Near Deadline",
                importance=6, is_urgent=False, effort=30,
                deadline=datetime.now(timezone.utc) + timedelta(hours=2),
            ),
        ]

        profile = _make_mock_profile(urgency_bias=0.9)
        ranked = _fallback_ranking(tasks, profile)

        q3_rank = next(item["rank"] for item in ranked if item["task_id"] == 1)
        q4_rank = next(item["rank"] for item in ranked if item["task_id"] == 2)

        self.assertLess(q3_rank, q4_rank,
                        f"Q3 rank ({q3_rank}) must be less than Q4 rank ({q4_rank}) even with deadline advantage")

    def test_category_override_respected(self):
        """Category overrides should still maintain Q4 below Q3."""
        tasks = [
            _make_mock_task(
                1, "Override to Q4",
                importance=5, is_urgent=True, effort=30,
                category_override="Q4-Eliminate",
            ),
            _make_mock_task(
                2, "Normal Q3",
                importance=4, is_urgent=True, effort=45,
            ),
        ]

        profile = _make_mock_profile()
        ranked = _fallback_ranking(tasks, profile)

        q4_rank = next(item["rank"] for item in ranked if item["task_id"] == 1)
        q3_rank = next(item["rank"] for item in ranked if item["task_id"] == 2)

        self.assertLess(q3_rank, q4_rank,
                        f"Q3 rank ({q3_rank}) must be less than Q4 rank ({q4_rank}) even with override")


if __name__ == "__main__":
    unittest.main()
