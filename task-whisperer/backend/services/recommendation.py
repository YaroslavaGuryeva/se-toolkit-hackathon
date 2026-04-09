"""
Recommendation service that uses Qwen LLM and Eisenhower Matrix logic.
"""
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from models import Task, UserProfile
from schemas import RankedTask, RecommendationResponse
from services.llm_service import call_qwen, parse_json_response
from services.user_profile_service import get_or_create_profile, compute_user_profile

logger = logging.getLogger(__name__)

# ─── Eisenhower Matrix Quadrants ────────────────────────────────
EISENHOWER_QUADRANTS = {
    "Q1": "Do First",       # Urgent + Important
    "Q2": "Schedule",       # Not Urgent + Important
    "Q3": "Delegate",       # Urgent + Not Important
    "Q4": "Eliminate",      # Not Urgent + Not Important
}


def _get_eisenhower_quadrant(task: Task) -> str:
    """Get the effective quadrant for a task, respecting user category overrides."""
    if task.category_override:
        return task.category_override
    return _classify_eisenhower(task)


def _classify_eisenhower(task: Task) -> str:
    """Classify a task into an Eisenhower Matrix quadrant."""
    if task.is_urgent and task.importance >= 7:
        return f"Q1-{EISENHOWER_QUADRANTS['Q1']}"
    elif not task.is_urgent and task.importance >= 7:
        return f"Q2-{EISENHOWER_QUADRANTS['Q2']}"
    elif task.is_urgent and task.importance < 7:
        return f"Q3-{EISENHOWER_QUADRANTS['Q3']}"
    else:
        return f"Q4-{EISENHOWER_QUADRANTS['Q4']}"


def _compute_deadline_urgency(task: Task) -> float:
    """
    Compute a deadline urgency score (0-1).
    Higher score = more urgent based on deadline proximity.
    """
    if not task.deadline:
        return 0.3  # Default moderate urgency for tasks without deadlines

    now = datetime.now(timezone.utc)
    deadline = task.deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    delta = deadline - now
    total_seconds = delta.total_seconds()

    if total_seconds <= 0:
        return 1.0  # Past deadline = maximum urgency
    elif total_seconds <= 3600:  # Less than 1 hour
        return 0.95
    elif total_seconds <= 86400:  # Less than 1 day
        return 0.8
    elif total_seconds <= 172800:  # Less than 2 days
        return 0.6
    elif total_seconds <= 604800:  # Less than 1 week
        return 0.4
    else:
        return 0.2  # Far future = low urgency


def _build_recommendation_prompt(
    tasks: List[Task],
    profile: UserProfile,
) -> str:
    """
    Build a detailed prompt for Qwen to generate task recommendations.
    Includes Eisenhower Matrix classification, deadlines, effort, and user behavior.
    """
    now = datetime.now(timezone.utc).isoformat()

    # Build task descriptions for the prompt
    task_details = []
    for task in tasks:
        quadrant = _get_eisenhower_quadrant(task)
        deadline_urgency = _compute_deadline_urgency(task)
        effort_str = f"{task.effort} min" if task.effort else "Unknown"
        deadline_str = task.deadline.isoformat() if task.deadline else "No deadline"

        task_details.append(
            f"  - ID: {task.id}\n"
            f"    Title: {task.title}\n"
            f"    Description: {task.description or 'None'}\n"
            f"    Deadline: {deadline_str}\n"
            f"    Estimated Effort: {effort_str}\n"
            f"    Importance: {task.importance}/10\n"
            f"    Is Urgent: {task.is_urgent}\n"
            f"    Eisenhower Quadrant: {quadrant}\n"
            f"    Deadline Urgency Score: {deadline_urgency:.2f}"
        )

    tasks_str = "\n".join(task_details)

    prompt = f"""You are Task Whisperer, an AI that helps users decide what to work on next.

Current time: {now}

USER PROFILE (learned behavior):
- Prefers short tasks: {profile.prefers_short_tasks:.2f} (0 = no preference, 1 = strongly prefers short tasks)
- Average completion time: {profile.avg_completion_time:.1f} minutes
- Procrastination score: {profile.procrastination_score:.2f} (0 = never procrastinates, 1 = always procrastinates)
- Urgency bias: {profile.urgency_bias:.2f} (0 = ignores urgency, 1 = always prioritizes urgency)
- Total tasks completed: {profile.total_tasks_completed}

ACTIVE TASKS:
{tasks_str}

INSTRUCTIONS:
Rank ALL tasks from most to least recommended to work on NEXT. Consider:
1. Eisenhower Matrix: Q1 (Do First) > Q2 (Schedule) > Q3 (Delegate) > Q4 (Eliminate)
   - IMPORTANT: Q4 (Eliminate) tasks MUST ALWAYS rank below Q3 (Delegate) tasks, regardless of other factors.
   - Q4 tasks should receive a significant score penalty to ensure they always appear last.
2. Deadline urgency: Tasks closer to deadline should rank higher
3. Importance: Higher importance tasks should rank higher
4. User's tendency to prefer short tasks (if high, give slight boost to low-effort tasks)
5. Procrastination patterns (if user procrastinates a lot, push high-importance tasks higher)
6. Effort vs importance tradeoff (quick wins with high importance are great)

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{{
  "recommended_task": {{
    "task_id": <int>,
    "title": "<string>",
    "rank": 1,
    "score": <float 0-100>,
    "eisenhower_quadrant": "<string>"
  }},
  "ranking": [
    {{
      "task_id": <int>,
      "title": "<string>",
      "rank": <int>,
      "score": <float 0-100>,
      "eisenhower_quadrant": "<string>"
    }}
  ],
  "explanation": "<string explaining why the top task was chosen and general advice>"
}}

The "ranking" array must contain ALL tasks sorted by recommendation priority (rank 1 = best).
Scores should be 0-100 where 100 = absolutely must do now.
"""
    return prompt


def _fallback_ranking(tasks: List[Task], profile: UserProfile) -> List[Dict[str, Any]]:
    """
    Generate a deterministic fallback ranking without LLM.
    Used when Qwen API is unavailable.
    """
    # Quadrant priority mapping: lower number = higher priority
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
            # Shorter tasks get a slight boost
            effort_penalty = max(0, (60 - task.effort)) / 100.0 * profile.prefers_short_tasks

        # Weighted composite score
        urgency_weight = profile.urgency_bias
        importance_weight = 1.0 - urgency_weight

        raw_score = (
            urgency_weight * deadline_score
            + importance_weight * importance_score
            + 0.15 * effort_penalty
        )

        # Boost if user procrastinates (push important tasks higher)
        if profile.procrastination_score > 0.7:
            raw_score += 0.1 * importance_score

        score = min(100, max(0, raw_score * 100))
        quadrant = _get_eisenhower_quadrant(task)

        # Enforce: Q4 (Eliminate) tasks ALWAYS rank below Q3 (Delegate)
        # Apply a large penalty to Q4 tasks so they can never outrank Q3
        quadrant_order = QUADRANT_PRIORITY.get(quadrant, 3)
        if quadrant_order == QUADRANT_PRIORITY["Q4-Eliminate"]:
            # Cap Q4 scores at a maximum lower than any Q3 score
            score = min(score, 10.0)

        ranked.append({
            "task_id": task.id,
            "title": task.title,
            "score": round(score, 2),
            "eisenhower_quadrant": quadrant,
            "_quadrant_order": quadrant_order,  # used for sorting, removed later
        })

    # Sort by quadrant order first, then by score descending, then by importance
    ranked.sort(key=lambda x: (
        x["_quadrant_order"],
        -x["score"],
        -next((t.importance for t in tasks if t.id == x["task_id"]), 0),
    ))

    for i, item in enumerate(ranked):
        item["rank"] = i + 1
        del item["_quadrant_order"]  # remove internal field

    return ranked


def get_recommendation(db: Session, use_llm: bool = True) -> RecommendationResponse:
    """
    Get task recommendations using Qwen LLM + Eisenhower Matrix + user profile.

    Falls back to deterministic ranking if LLM is unavailable.

    Args:
        db: Database session.
        use_llm: Whether to attempt LLM-based recommendation.

    Returns:
        RecommendationResponse with ranked tasks.
    """
    # Fetch all incomplete tasks
    active_tasks = db.query(Task).filter(Task.completed == False).order_by(Task.created_at.desc()).all()

    if not active_tasks:
        return RecommendationResponse(
            recommended_task=None,
            ranking=[],
            explanation="No active tasks. Add some tasks and I'll help you prioritize them!",
        )

    # Build a lookup for task objects
    task_lookup = {task.id: task for task in active_tasks}

    # Get user profile
    profile = get_or_create_profile(db)

    if use_llm:
        try:
            prompt = _build_recommendation_prompt(active_tasks, profile)
            response_text = call_qwen(prompt)
            parsed = parse_json_response(response_text)

            # Validate and build response
            ranking_data = parsed.get("ranking", [])
            if not ranking_data:
                # If LLM didn't return ranking, build from recommended_task
                top = parsed.get("recommended_task")
                if top:
                    ranking_data = [top]
                else:
                    raise ValueError("No ranking data in LLM response")

            ranking = []
            for item in ranking_data:
                ranked_task = RankedTask(
                    task_id=int(item["task_id"]),
                    title=str(item["title"]),
                    rank=int(item["rank"]),
                    score=float(item["score"]),
                    eisenhower_quadrant=str(item["eisenhower_quadrant"]),
                )
                ranking.append(ranked_task)

            # ENFORCE: Q4 (Eliminate) tasks MUST ALWAYS rank below Q3 (Delegate) tasks.
            # Post-process the LLM ranking to guarantee this invariant.
            ranking = _enforce_quadrant_order(ranking, task_lookup)

            recommended = ranking[0] if ranking else None
            explanation = parsed.get("explanation", "Based on urgency, importance, and your work patterns.")

            return RecommendationResponse(
                recommended_task=recommended,
                ranking=ranking,
                explanation=explanation,
            )

        except Exception as e:
            logger.warning(f"LLM recommendation failed, using fallback: {str(e)}")
            # Fall through to deterministic ranking

    # Fallback: deterministic ranking
    ranked_data = _fallback_ranking(active_tasks, profile)
    ranking = [
        RankedTask(
            task_id=item["task_id"],
            title=item["title"],
            rank=item["rank"],
            score=item["score"],
            eisenhower_quadrant=item["eisenhower_quadrant"],
        )
        for item in ranked_data
    ]

    top = ranking[0] if ranking else None
    explanation = (
        f"Based on deterministic ranking: {top.title} is recommended next. "
        f"Consider urgency and importance when deciding what to work on."
    )

    return RecommendationResponse(
        recommended_task=top,
        ranking=ranking,
        explanation=explanation,
    )


def _enforce_quadrant_order(ranking: List[RankedTask], task_lookup: Dict[int, Task]) -> List[RankedTask]:
    """
    Ensure Q4 (Eliminate) tasks always rank below Q3 (Delegate) tasks.
    Also enforces Q1 > Q2 > Q3 > Q4 ordering as a hard constraint.

    Strategy:
    1. Separate tasks by quadrant
    2. Within each quadrant, keep the LLM's relative ordering
    3. Concatenate: Q1 tasks, Q2 tasks, Q3 tasks, Q4 tasks
    4. Re-assign ranks and adjust scores to maintain ordering
    """
    QUADRANT_KEY = {"Q1-Do First": 0, "Q2-Schedule": 1, "Q3-Delegate": 2, "Q4-Eliminate": 3}

    quadrants: Dict[int, List[RankedTask]] = {0: [], 1: [], 2: [], 3: []}

    for item in ranking:
        q_key = item.eisenhower_quadrant
        q_order = QUADRANT_KEY.get(q_key, 3)
        quadrants[q_order].append(item)

    # Find the minimum score in Q3 (if any) to set Q4 scores below it
    q3_scores = [item.score for item in quadrants[2]]
    q4_scores = [item.score for item in quadrants[3]]

    if q3_scores and q4_scores:
        q3_min = min(q3_scores)
        # Scale Q4 scores to be below the minimum Q3 score
        if q4_scores:
            q4_max = max(q4_scores)
            if q4_max >= q3_min and q4_max > 0:
                scale_factor = (q3_min * 0.9) / q4_max  # 90% of min Q3 score
                for item in quadrants[3]:
                    item.score = round(item.score * scale_factor, 2)
    elif q4_scores and not q3_scores:
        # No Q3 tasks, but Q4 tasks exist - cap them low
        for item in quadrants[3]:
            item.score = min(item.score, 10.0)

    # Reassemble in quadrant order: Q1 > Q2 > Q3 > Q4
    result = []
    for q_order in [0, 1, 2, 3]:
        # Within each quadrant, maintain the LLM's relative order (by original rank)
        quadrant_tasks = sorted(quadrants[q_order], key=lambda x: x.rank)
        result.extend(quadrant_tasks)

    # Re-assign ranks
    for i, item in enumerate(result):
        item.rank = i + 1

    return result
