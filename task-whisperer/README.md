# 🤫 Task Whisperer

> AI-Powered Task Prioritization Assistant

Task Whisperer helps you overcome decision paralysis by intelligently prioritizing your tasks using AI (Qwen LLM), the Eisenhower Matrix, and adaptive learning from your work patterns.

---

## ✨ Features

- **🧠 AI-Powered Recommendations**: Uses Qwen LLM to analyze and rank your tasks
- **📐 Eisenhower Matrix**: Automatically classifies tasks into Do First, Schedule, Delegate, or Eliminate
- **📊 Adaptive Learning**: Tracks your behavior and personalizes recommendations over time
- **⏱️ Effort Estimation**: Considers task duration for smarter prioritization
- **🔥 Urgency Detection**: Factors in deadlines and urgency scores
- **📈 Insights Dashboard**: Visualizes your work patterns, procrastination tendencies, and preferences

---

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│  Frontend   │─────▶│   Backend    │─────▶│  PostgreSQL  │
│   (React)   │◀─────│  (FastAPI)   │◀─────│              │
└─────────────┘      └──────────────┘      └──────────────┘
                            │
                            ▼
                      ┌──────────────┐
                      │  Qwen LLM    │
                      │  (OpenAI)    │
                      └──────────────┘
```

### Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 18, Axios, CSS              |
| Backend     | Python 3.11, FastAPI, SQLAlchemy  |
| Database    | PostgreSQL 15                     |
| AI          | Qwen LLM via OpenAI-compatible API|
| DevOps      | Docker, Docker Compose            |

---

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Qwen API key (via DashScope or compatible provider)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd task-whisperer
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp backend/.env.example backend/.env

# Edit with your API credentials
nano backend/.env
```

Required backend environment variables:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/task_whisperer
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

### 3. Start the Application

```bash
docker-compose up --build
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📡 API Endpoints

### Tasks

| Method   | Endpoint                | Description                    |
|----------|-------------------------|--------------------------------|
| `GET`    | `/api/tasks/`           | List all tasks                 |
| `POST`   | `/api/tasks/`           | Create a new task              |
| `GET`    | `/api/tasks/{id}`       | Get task by ID                 |
| `PUT`    | `/api/tasks/{id}`       | Update a task                  |
| `DELETE` | `/api/tasks/{id}`       | Delete a task                  |
| `POST`   | `/api/tasks/{id}/complete` | Mark task as complete      |
| `GET`    | `/api/tasks/{id}/history`  | Get task completion history  |

### Recommendations

| Method   | Endpoint           | Description                         |
|----------|--------------------|-------------------------------------|
| `POST`   | `/api/recommend/`  | Get AI-powered task recommendation  |

### User Profile

| Method   | Endpoint                | Description                         |
|----------|-------------------------|-------------------------------------|
| `GET`    | `/api/profile/`         | Get user profile                    |
| `POST`   | `/api/profile/update`   | Update profile metrics              |
| `POST`   | `/api/profile/recompute`| Recompute profile from history      |

---

## 🧠 How AI Recommendations Work

Task Whisperer uses a multi-layered approach to prioritize tasks:

### 1. Data Collection
- Task metadata (title, description, deadline, effort, importance, urgency)
- User behavior (completion times, procrastination patterns, urgency bias)

### 2. Eisenhower Matrix Classification
Tasks are automatically classified:
- **Q1 (Do First)**: Urgent + Important
- **Q2 (Schedule)**: Not Urgent + Important
- **Q3 (Delegate)**: Urgent + Not Important
- **Q4 (Eliminate)**: Not Urgent + Not Important

### 3. LLM Analysis
The system builds a comprehensive prompt including:
- All active tasks with their metadata
- User profile and behavioral patterns
- Eisenhower quadrant assignments
- Deadline urgency scores

Qwen LLM then returns a ranked list with explanations.

### 4. Fallback Mechanism
If the LLM API is unavailable, a deterministic algorithm provides recommendations based on weighted scores of urgency, importance, and user preferences.

---

## 🗄️ Database Schema

### `tasks`
| Column        | Type      | Description                       |
|---------------|-----------|-----------------------------------|
| id            | INTEGER   | Primary key                       |
| title         | VARCHAR   | Task title                        |
| description   | TEXT      | Task details                      |
| deadline      | TIMESTAMP | Due date/time                     |
| effort        | INTEGER   | Estimated minutes to complete     |
| importance    | INTEGER   | Importance rating (1-10)          |
| is_urgent     | BOOLEAN   | Whether the task is urgent        |
| completed     | BOOLEAN   | Completion status                 |
| created_at    | TIMESTAMP | Creation timestamp                |
| updated_at    | TIMESTAMP | Last update timestamp             |

### `task_history`
| Column                    | Type      | Description                       |
|---------------------------|-----------|-----------------------------------|
| id                        | INTEGER   | Primary key                       |
| task_id                   | INTEGER   | Foreign key to tasks              |
| completed_at              | TIMESTAMP | Completion timestamp              |
| actual_duration_minutes   | FLOAT     | Actual time spent                 |
| was_recommended           | BOOLEAN   | Was this task AI-recommended?     |
| recommendation_rank       | INTEGER   | Rank when recommended             |
| was_completed             | BOOLEAN   | Completion status                 |

### `user_profile`
| Column                  | Type    | Description                         |
|-------------------------|---------|-------------------------------------|
| id                      | INTEGER | Primary key                         |
| prefers_short_tasks     | FLOAT   | Preference for short tasks (0-1)    |
| avg_completion_time     | FLOAT   | Average task duration (minutes)     |
| procrastination_score   | FLOAT   | Procrastination indicator (0-1)     |
| urgency_bias            | FLOAT   | Tendency to prioritize urgency (0-1)|
| total_tasks_completed   | INTEGER | Total completed tasks count         |
| updated_at              | TIMESTAMP| Last update timestamp               |

---

## 🛠️ Development

### Running Locally (Without Docker)

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/task_whisperer
export OPENAI_API_KEY=your-key-here
export OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
export QWEN_MODEL=qwen-plus

# Start the server
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm start
```

### Project Structure

```
task-whisperer/
├── backend/
│   ├── app/
│   │   └── main.py                 # FastAPI application entry point
│   ├── db/
│   │   └── __init__.py             # Database connection and session management
│   ├── models/
│   │   └── __init__.py             # SQLAlchemy ORM models
│   ├── schemas/
│   │   └── __init__.py             # Pydantic request/response schemas
│   ├── services/
│   │   ├── __init__.py             # Service layer exports
│   │   ├── llm_service.py          # Qwen LLM API integration
│   │   ├── recommendation.py       # AI recommendation logic
│   │   └── user_profile_service.py # User behavior analytics
│   ├── routes/
│   │   ├── __init__.py             # Route exports
│   │   ├── tasks.py                # Task CRUD endpoints
│   │   ├── recommendations.py      # Recommendation endpoint
│   │   └── profile.py              # User profile endpoints
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── api.js                  # API service layer
│   │   ├── App.js                  # Main app component
│   │   ├── App.css                 # Global styles
│   │   ├── index.js                # React entry point
│   │   ├── index.css               # Base CSS
│   │   └── components/
│   │       ├── Dashboard.js        # Task list and management
│   │       ├── TaskForm.js         # Add/edit task form
│   │       ├── TaskItem.js         # Single task display
│   │       ├── RecommendationPanel.js  # AI recommendations
│   │       └── InsightsPanel.js    # User behavior analytics
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🔧 Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running and accessible:

```bash
docker-compose ps
docker-compose logs db
```

### LLM API Errors

Check your API key and base URL in `backend/.env`. View logs:

```bash
docker-compose logs backend
```

### Frontend Not Loading

```bash
docker-compose logs frontend
docker-compose up --build frontend
```

---

## 📝 License

MIT License — see LICENSE file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using FastAPI, React, PostgreSQL, and Qwen LLM
