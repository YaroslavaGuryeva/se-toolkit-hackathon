# 🧠 Task Whisperer

**AI-powered task prioritization assistant with adaptive learning**

Task Whisperer is a full-stack application that helps users decide what to work on next by intelligently prioritizing tasks based on deadlines, effort, and behavioral patterns. Unlike traditional to-do lists, it uses an AI agent and adaptive learning to continuously improve recommendations over time.

---

# 🚀 Features

## ✅ Core (MVP)

### Task Management

* Create, update, delete tasks
* Task fields:

  * Title
  * Description
  * Deadline
  * Estimated effort
  * Optional importance

### Intelligent Prioritization

* AI-powered task ranking
* Uses:

  * Deadline pressure
  * Effort estimation
  * Eisenhower Matrix (urgent vs important)

### Recommendation Engine

* Suggests:

  * What to work on next
  * Ranked list of tasks
  * Human-readable explanations

---

## 🧠 Version 2: Adaptive Learning

### Behavior Tracking

* Tracks:

  * Task completion
  * Actual time spent
  * Ignored recommendations
  * Task postponements

### Personalized Recommendations

* Learns user patterns:

  * Preference for short vs long tasks
  * Procrastination tendencies
  * Deadline sensitivity

### Insights

* Displays behavioral insights such as:

  * “You tend to delay high-effort tasks”
  * “You complete short tasks faster”

---

# 🏗️ Architecture

## Stack Overview

| Layer    | Technology              |
| -------- | ----------------------- |
| Frontend | React                   |
| Backend  | FastAPI (Python)        |
| Database | PostgreSQL              |
| AI Agent | Qwen (LLM API)          |
| DevOps   | Docker + Docker Compose |

---

## System Architecture

```
[ React Frontend ]
        |
        v
[ FastAPI Backend ]
        |
        +----> PostgreSQL (tasks + history + user profile)
        |
        +----> Qwen API (LLM reasoning + explanations)
```

---

# 📦 Project Structure

```
task-whisperer/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── recommendation.py
│   │   │   ├── adaptive_learning.py
│   │   │   ├── llm_service.py
│   │   ├── db/
│   │   └── core/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/
│   │   └── App.js
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

# 🗄️ Database Schema

## Table: `tasks`

| Column      | Type       |
| ----------- | ---------- |
| id          | UUID / INT |
| title       | TEXT       |
| description | TEXT       |
| deadline    | TIMESTAMP  |
| effort      | INT / ENUM |
| importance  | INT        |
| created_at  | TIMESTAMP  |
| updated_at  | TIMESTAMP  |

---

## Table: `task_history`

| Column                  | Type       |
| ----------------------- | ---------- |
| id                      | UUID / INT |
| task_id                 | FK         |
| completed_at            | TIMESTAMP  |
| actual_duration_minutes | INT        |
| was_recommended         | BOOLEAN    |
| recommendation_rank     | INT        |
| was_completed           | BOOLEAN    |

---

## Table: `user_profile`

| Column                | Type       |
| --------------------- | ---------- |
| id                    | UUID / INT |
| prefers_short_tasks   | BOOLEAN    |
| avg_completion_time   | FLOAT      |
| procrastination_score | FLOAT      |
| urgency_bias          | FLOAT      |
| updated_at            | TIMESTAMP  |

---

# ⚙️ Backend (FastAPI)

## Key Endpoints

### Task CRUD

```http
GET /tasks
POST /tasks
PUT /tasks/{id}
DELETE /tasks/{id}
```

---

### Complete Task

```http
POST /tasks/{id}/complete
```

**Body:**

```json
{
  "actual_duration_minutes": 90
}
```

---

### Recommendation

```http
POST /recommend
```

**Response:**

```json
{
  "recommended_task": {...},
  "ranking": [...],
  "explanation": "Start with Task A because..."
}
```

---

### Update User Profile

```http
POST /profile/update
```

---

# 🤖 AI Agent Design (Qwen Integration)

## Model

* Default: `qwen/qwen-2.5-72b-instruct`
* Optional: `qwen/qwen-2.5-7b-instruct` (faster & cheaper)

---

## API Strategy

The backend uses an **OpenAI-compatible API interface** to call Qwen.

### Example Configuration

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL")
)
```

---

## Prompt Strategy

The agent combines:

1. Eisenhower Matrix
2. Deadline urgency
3. Effort balancing
4. User behavior adaptation

### Example Prompt

```
You are Task Whisperer, an AI that prioritizes tasks.

User behavior:
- Prefers short tasks
- Often delays high-effort work

Tasks:
[...]

Return STRICT JSON:
{
  "recommended_task": "...",
  "ranking": ["..."],
  "explanation": "..."
}
```

---

## Output

* Ranked task list
* Recommended task
* Explanation

---

# 💻 Frontend (React)

## Pages

### Dashboard

* Task list
* Add/edit/delete tasks
* Deadline + effort indicators

### Recommendation Panel

* Top task suggestion
* Explanation
* Ranked list

### Insights Panel (NEW)

* Displays learned user behavior

---

## Components

* TaskForm
* TaskList
* RecommendationCard
* InsightsPanel

---

# 🐳 Docker Setup

## docker-compose.yml

Services:

* `frontend`
* `backend`
* `db` (PostgreSQL)

---

## Run the Project

```bash
docker-compose up --build
```

---

## Environment Variables

### Backend

```env
DATABASE_URL=postgresql://user:password@db:5432/taskdb
OPENAI_API_KEY=qwen_api_key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
QWEN_MODEL=coder-model
```

---

### Frontend

```env
REACT_APP_API_URL=http://localhost:8000
```

---

# 🔁 User Flow

1. User creates tasks
2. System recommends priorities
3. User completes tasks
4. System stores behavior
5. Profile updates
6. Future recommendations improve

---

# 🧪 Future Improvements

* 📅 Smart scheduling (time-blocking)
* 📊 Analytics dashboard
* 🔔 Notifications & reminders
* 📱 Mobile app version
* 👥 Multi-user authentication

---

# 🎯 Why This Project Stands Out

* Combines full-stack engineering + AI
* Uses modern LLM integration (Qwen API)
* Demonstrates adaptive intelligence
* Production-ready architecture with Docker

---

# 📜 License

MIT License

---

# 🙌 Author

Iaroslava Gureva 

---