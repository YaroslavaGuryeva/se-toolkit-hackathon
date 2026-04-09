# 🧠 Task Whisperer

Task Whisperer is a full-stack application that helps users decide what to work on next by intelligently prioritizing tasks based on deadlines, effort, and behavioral patterns. Unlike traditional to-do lists, it uses an AI agent and adaptive learning to continuously improve recommendations over time.

## End users

Busy professionals, students, freelancers, and anyone with multiple tasks who struggles to prioritize

## Core Problem It Solves

**The Paradox of Choice in Task Management:** People spend more time deciding what to do than actually doing it. Traditional to-do lists present all tasks as equal, leading to:

- Decision paralysis when facing 10+ tasks
- Procrastination on important but non-urgent tasks
- Missed deadlines because "everything feels urgent"
- No intelligent system to provide objective prioritization

**Task Whisperer solves this by:** Using an LLM agent to apply prioritization heuristics (Eisenhower Matrix + deadline pressure + effort estimation) and output clear, explainable recommendations.

---

## 🚀 Features

### ✅ Core (MVP)

#### Task Management

- Create, update, delete tasks
- Task fields:
  - Title
  - Description
  - Deadline
  - Estimated effort
  - Importance (1-10)
  - Urgency flag
  - Category override (manual Eisenhower quadrant assignment)

#### Overdue Task Tracking

- Automatic detection of tasks with past deadlines that aren't completed
- Visual overdue badges with pulsing animation on task cards
- Overdue stat card in dashboard (appears when overdue tasks exist)
- Filter tasks by overdue status ("Overdue Only" filter)
- Overdue penalty factored into procrastination score
- API endpoints:
  - `POST /tasks/overdue/detect` — scan and mark overdue tasks
  - `GET /tasks/overdue/count` — get current overdue task count

#### Intelligent Prioritization

- AI-powered task ranking
- Uses:
  - Deadline pressure
  - Effort estimation
  - Eisenhower Matrix (urgent vs important)
  - User behavior adaptation

#### Recommendation Engine

- Suggests:
  - What to work on next
  - Ranked list of tasks
  - Human-readable explanations

#### Advanced Filtering & Sorting

- **Filters:**
  - Active Only
  - Overdue Only
  - Completed Only
  - All Tasks

- **Sorting options:**
  - **Date Created** — with toggle for Latest→Earliest / Earliest→Latest
  - **Importance** — descending (highest first)
  - **Deadline** — ascending (soonest first)
  - **Effort** — with toggle for Min→Max / Max→Min
  - **Eisenhower Quadrant** — Q1 → Q2 → Q3 → Q4, with importance descending within each quadrant

#### Task Detail Modal

- Click any task title or description to open a detailed view showing:
  - Full description
  - Importance score (visual card)
  - Urgency status
  - Eisenhower Quadrant (with color coding and auto/custom indicator)
  - Estimated effort
  - Deadline (relative + absolute)
  - Status (Active / Overdue / Completed)
  - Created and updated timestamps

---

### 🧠 Version 2: Adaptive Learning

#### Behavior Tracking

- Tracks:
  - Task completion
  - Actual time spent
  - Ignored recommendations
  - Task postponements

#### Personalized Recommendations

- Learns user patterns:
  - Preference for short vs long tasks
  - Procrastination tendencies (including overdue task penalty)
  - Deadline sensitivity
  - Urgency bias

#### Insights

- Displays behavioral insights such as:
  - "You tend to delay high-effort tasks"
  - "You complete short tasks faster"
  - Procrastination score with overdue penalty visualization
  - Average completion time
  - Short task preference percentage

---

## Demo

- Several screenshots of the product:
  - [Page with tasks list](main-window-with-tasks.png)
  - [Recommendations page](rec-after-click.png)
  - [Insights page](insights.png)

## 🏗️ Architecture

### Stack Overview

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 18, Axios, CSS              |
| Backend     | Python 3.11, FastAPI, SQLAlchemy  |
| Database    | PostgreSQL 15                     |
| AI          | Qwen LLM via OpenAI-compatible API|
| DevOps      | Docker, Docker Compose            |

---

### System Architecture

``` text
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

## 📦 Project Structure

``` text
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
│   │   │   ├── overdue_service.py
│   │   │   ├── user_profile_service.py
│   │   │   └── llm_service.py
│   │   ├── db/
│   │   └── core/
│   ├── migrate.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.js
│   │   │   ├── TaskForm.js
│   │   │   ├── TaskItem.js
│   │   │   ├── TaskDetailModal.js
│   │   │   ├── RecommendationPanel.js
│   │   │   └── InsightsPanel.js
│   │   ├── api.js
│   │   ├── App.js
│   │   └── App.css
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## 🗄️ Database Schema

### Table: `tasks`

| Column            | Type       |
|-------------------|------------|
| id                | INT        |
| title             | TEXT       |
| description       | TEXT       |
| deadline          | TIMESTAMP  |
| effort            | INT        |
| importance        | INT        |
| is_urgent         | BOOLEAN    |
| category_override | VARCHAR(50)|
| created_at        | TIMESTAMP  |
| updated_at        | TIMESTAMP  |
| completed         | BOOLEAN    |
| overdue           | BOOLEAN    |

---

### Table: `task_history`

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

### Table: `user_profile`

| Column                | Type       |
| --------------------- | ---------- |
| id                    | UUID / INT |
| prefers_short_tasks   | BOOLEAN    |
| avg_completion_time   | FLOAT      |
| procrastination_score | FLOAT      |
| urgency_bias          | FLOAT      |
| updated_at            | TIMESTAMP  |

---

## ⚙️ Backend (FastAPI)

### Key Endpoints

#### Task CRUD

```http
GET    /tasks
POST   /tasks
PUT    /tasks/{id}
DELETE /tasks/{id}
```

---

#### Overdue Task Detection

```http
POST /tasks/overdue/detect
GET  /tasks/overdue/count
```

**Response:**

```json
{
  "newly_marked": 3,
  "total_overdue": 5
}
```

---

#### Complete Task

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

#### Recommendation

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

#### Update User Profile

```http
POST /profile/update
```

---

## 🤖 AI Agent Design (Qwen Integration)

### Model

- Default: `qwen/qwen-2.5-72b-instruct`
- Optional: `qwen/qwen-2.5-7b-instruct` (faster & cheaper)

---

### API Strategy

The backend uses an **OpenAI-compatible API interface** to call Qwen.

#### Example Configuration

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

``` text
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

### Output

- Ranked task list
- Recommended task
- Explanation

---

## 💻 Frontend (React)

### Pages

#### Dashboard

- Task list with advanced filtering (Active / Overdue / Completed / All)
- Add/edit/delete tasks
- Deadline + effort indicators
- Overdue status badges with visual warnings
- Bidirectional sort controls (Date Created, Effort)
- Eisenhower quadrant sorting
- Task detail modal on click

#### Recommendation Panel

- Top task suggestion
- Explanation
- Ranked list

#### Insights Panel

- Displays learned user behavior
- Procrastination score with overdue penalty
- Average completion time
- Short task preference percentage
- Urgency bias visualization

---

### Components

- TaskForm
- TaskList
- TaskItem (with overdue badges and click-to-view-details)
- TaskDetailModal (full task details overlay)
- RecommendationCard
- InsightsPanel

---

## 🐳 Docker Setup

### docker-compose.yml

Services:

- `frontend`
 `backend`
- `db` (PostgreSQL)

---

## 🚀 Quick Start

### Prerequisites

- OS: Ubuntu 24.04
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

- **Frontend**: [http://localhost:3000]
- **Backend API**: [http://localhost:8000]
- **API Docs**: [http://localhost:8000/docs]

---

## 🚀 Deployment

### Target Environment

- **Operating System**: Ubuntu 24.04 LTS (or any modern Linux distribution with kernel 5.15+)
- **Architecture**: x86_64 or ARM64
- **Minimum Resources**: 2 vCPUs, 4 GB RAM, 20 GB disk

### Prerequisites — What to Install on the VM

Before deploying, ensure the following packages are installed on your Ubuntu 24.04 VM:

```bash
# Update package index
sudo apt update

# Install Docker
sudo apt install -y docker.io

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Add your user to the docker group (so you don't need sudo)
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl enable --now docker

# Verify installations
docker --version
docker compose version
```

> **Note:** After running `usermod`, log out and log back in for the group change to take effect.

### Step-by-Step Deployment Instructions

#### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd task-whisperer
```

#### Step 2: Configure Environment Variables

Create the backend `.env` file with your API credentials:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Set the following variables:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/task_whisperer
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

> **Security tip:** In production, change the default PostgreSQL credentials in both `backend/.env` and `docker-compose.yml` (`POSTGRES_PASSWORD`).

#### Step 3: Build and Start Containers

```bash
docker compose up -d --build
```

This command:
- Builds the backend image (Python 3.11 + FastAPI)
- Builds the frontend image (React → nginx)
- Pulls the PostgreSQL 15 image
- Creates a shared network and starts all three containers

#### Step 4: Verify the Deployment

Check that all containers are running:

```bash
docker compose ps
```

You should see three containers with status **Up**:

| Container                  | Purpose       | Port Mapping  |
|----------------------------|---------------|---------------|
| `task-whisperer-db`        | PostgreSQL    | 5432          |
| `task-whisperer-backend`   | FastAPI       | 8000          |
| `task-whisperer-frontend`  | nginx (React) | 3000 → 80     |

#### Step 5: Access the Application

Open your browser and navigate to:

- **Frontend**: `http://<VM_IP>:3000`
- **Backend API**: `http://<VM_IP>:8000`
- **API Docs (Swagger)**: `http://<VM_IP>:8000/docs`

#### Step 6 (Optional): Expose via HTTPS

For production use, place a reverse proxy (e.g., Caddy or nginx) in front of the frontend container and configure TLS with Let's Encrypt:

```bash
# Example with Caddy (simplest option)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo tee /etc/apt/trusted.gpg.d/caddy-stable.asc
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Create a `Caddyfile`:

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

Start Caddy:

```bash
sudo systemctl enable --now caddy
```

### Useful Commands

| Command                              | Description                          |
|--------------------------------------|--------------------------------------|
| `docker compose logs -f`             | Follow logs for all services         |
| `docker compose logs -f backend`     | Follow backend logs only             |
| `docker compose down`                | Stop and remove containers           |
| `docker compose down -v`             | Stop, remove containers **and** volumes (destroys DB data) |
| `docker compose up -d --build`       | Rebuild and restart after code changes|
| `docker compose restart backend`     | Restart a single service             |

### Troubleshooting

**Container won't start:**
```bash
docker compose logs <service-name>
```

**Database connection refused:**
Make sure the `db` container is healthy before the backend starts:
```bash
docker compose ps db
docker compose logs db
```

**Port 3000 or 8000 already in use:**
Change the host port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"   # instead of 3000:80
```

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
│   │   └── __init__.py             # SQLAlchemy ORM models (includes overdue field)
│   ├── schemas/
│   │   └── __init__.py             # Pydantic request/response schemas
│   ├── services/
│   │   ├── __init__.py             # Service layer exports
│   │   ├── llm_service.py          # Qwen LLM API integration
│   │   ├── recommendation.py       # AI recommendation logic
│   │   ├── overdue_service.py      # Overdue task detection and marking
│   │   └── user_profile_service.py # User behavior analytics (with overdue penalty)
│   ├── routes/
│   │   ├── __init__.py             # Route exports
│   │   ├── tasks.py                # Task CRUD + overdue endpoints
│   │   ├── recommendations.py      # Recommendation endpoint
│   │   └── profile.py              # User profile endpoints
│   ├── migrate.py                  # Database migration script
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── api.js                  # API service layer (includes overdue endpoints)
│   │   ├── App.js                  # Main app component
│   │   ├── App.css                 # Global styles (includes overdue badge styles)
│   │   ├── index.js                # React entry point
│   │   ├── index.css               # Base CSS
│   │   └── components/
│   │       ├── Dashboard.js        # Task list with filtering and sorting
│   │       ├── TaskForm.js         # Add/edit task form
│   │       ├── TaskItem.js         # Single task display with overdue badges
│   │       ├── TaskDetailModal.js  # Task detail modal overlay
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

## 🔁 User Flow

1. User creates tasks with deadlines and effort estimates
2. System automatically detects overdue tasks (past deadline, not completed)
3. System recommends priorities based on AI + adaptive learning
4. User completes tasks, tracking actual time spent
5. Overdue detection runs on task completion to update procrastination scores
6. User profile updates with learned behavior patterns
7. Future recommendations improve based on user's work habits

---

## 🧪 Future Improvements

- 📅 Smart scheduling (time-blocking)
- 📊 Advanced analytics dashboard with trend graphs
- 🔔 Notifications & reminders for approaching deadlines
- 📱 Mobile app version
- 👥 Multi-user authentication & shared task lists
- 🎯 Goal tracking & progress milestones
- 🤖 Enhanced LLM recommendations with context awareness

---

## 🎯 Why This Project Stands Out

- Combines full-stack engineering + AI
- Uses modern LLM integration (Qwen API)
- Demonstrates adaptive intelligence with behavior learning
- Production-ready architecture with Docker
- Advanced overdue task detection and tracking system
- Intelligent filtering and sorting with bidirectional sort controls
- Rich task detail modal for comprehensive task overview

---

## 📜 License

MIT License

---

## 🙌 Author

Iaroslava Gureva

---
