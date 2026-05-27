# SpatialPioneer — Collaborative Virtual Study Rooms

A state-of-the-art, premium full-stack web application designed for collaborative real-time study sessions. Users can establish study chambers, invite peers using unique 8-character codes, start/end study sessions with synced live stopwatch and Pomodoro timers, text in real-time, and view persistent activity logs.

---

## 🌟 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite, TypeScript, Vanilla CSS Modules) |
| **Backend** | Django + Django REST Framework (DRF) |
| **Real-time** | Django Channels (ASGI) + WebSockets |
| **Database** | PostgreSQL (with automatic SQLite fallback for local evaluation) |
| **Server Integration** | Daphne + ASGI Protocol Routers |
| **Authentication** | JSON Web Tokens (via `djangorestframework-simplejwt`) |

---

## ✨ Features Implemented

1. **Authentication & User Profiles:**
   - Secure registration, JWT-based login (access + refresh tokens), and self profile fetch (`/api/auth/me/`).
   - Token lifecycle auto-refresh via customized Axios interceptors.
2. **Interactive Room Management:**
   - Create study chambers with automatic unique 8-character invite code generation.
   - Join existing chambers via invite code and easily leave rooms.
   - Creator is automatically registered as the room `owner` while others join as `member`.
3. **Precision Synchronized Study Sessions:**
   - Start and end sessions dynamically.
   - Auto-calculate and persist study session durations in seconds.
   - Enforce a strict one-active-session-per-room model constraint.
4. **Real-time WebSockets Sync:**
   - Group-based Channel layers syncing all active rooms.
   - Real-time online/offline member indicators with dynamic participant list updates.
   - Instant WebSocket chat messages with persistent database logging.
5. **Audit Activity Log:**
   - Persistent audit tracking for room entries, exits, session start, and session end.
   - Signal-based automatic event logging.
6. **Robust Cleanup Engine:**
   - A custom Django management command (`cleanup_old_sessions`) to detect and auto-close dangling sessions older than 12 hours.

---

## 💎 Premium Enhancements (Bonus Points)

- **Pomodoro Mode:** Structured study timer with automatic 25-minute work and 5-minute break countdown intervals.
- **Synthesized Retro Audio Chimes:** Utilizes the HTML5 Web Audio API to synthesize beautiful sound chimes for session starts, ends, and breaks, ensuring zero-dependency, local audio notifications.
- **Markdown Chat Support:** Renders bold (`**text**`), italics (`*text*`), and monospace code blocks (`` `code` ``) inside real-time chat fragments.
- **Dashboard Stats Panel:** Displays dynamic counters for total chambers joined, active peers, and active live sessions.
- **Database Fallback:** A smart connection test in `settings.py` checks for local PostgreSQL availability. If unreachable, it gracefully boots using SQLite, making local evaluation effortless!

---

## 🔧 Environment Variables

### Backend (`studyroom_backend/.env`)
```env
SECRET_KEY=your_django_secret_key
DEBUG=True
DATABASE_NAME=studyroom_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_db_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (`studyroom_frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws
```

---

## ⚡ Setup & Launch Instructions

### Prerequisites
Ensure you have **Python 3.12+**, **Node.js 22+**, and **npm** installed.

### 1. Backend Server Setup
1. Open a terminal inside the project root.
2. Initialize and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install django djangorestframework djangorestframework-simplejwt channels channels-redis psycopg2-binary django-cors-headers python-decouple daphne
   ```
4. Perform database migrations (auto-creates SQLite file if Postgres is unreachable):
   ```bash
   python studyroom_backend/manage.py makemigrations accounts rooms chat
   python studyroom_backend/manage.py migrate
   ```
5. Run the ASGI server:
   ```bash
   python studyroom_backend/manage.py runserver 8000
   ```

### 2. Frontend React Client Setup
1. Open a new terminal inside `studyroom_frontend`.
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the workspace at `http://localhost:5173`.

---

## 📡 API Reference Overview

### Auth (`/api/auth/`)
- `POST /register/` — Sign up a new user.
- `POST /login/` — Authenticate and retrieve JWT access/refresh tokens.
- `POST /token/refresh/` — Refresh an expired access token.
- `GET /me/` — Retrieve the current authenticated user's profile.

### Chambers (`/api/rooms/`)
- `GET /` — List all chambers the current user is a member of.
- `POST /` — Establish a new study room.
- `GET /:id/` — Retrieve chamber details (members only).
- `DELETE /:id/` — Delete room (owner only).
- `POST /join/` — Join a room using an 8-character invite code.
- `POST /:id/leave/` — Leave a study room.
- `GET /:id/members/` — Retrieve list of chamber members.

### Sessions (`/api/rooms/:id/sessions/`)
- `POST /start/` — Start a synchronized active study session.
- `POST /end/` — End the active session and persist duration.
- `GET /` — Fetch past study session intervals.

### Chat & Audit Logs
- `GET /api/rooms/:id/messages/` — Fetch the last 50 chat messages.
- `GET /api/rooms/:id/activity/` — Fetch historical activity audit logs.

---

## ⚓ Known Limitations
- The development ASGI `CHANNEL_LAYERS` is configured to use the `InMemoryChannelLayer`. In production deployment, replace this with `channels_redis.core.RedisChannelLayer` by updating `settings.py` with your Redis server credentials.
