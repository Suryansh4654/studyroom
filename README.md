# StudyRoom — Collaborative Virtual Study Rooms

Hey! This is my full-stack web app for real-time collaborative study sessions. I built it because during my semester exams, me and my friends always struggled to stay productive studying alone at home. We'd end up on our phones or just procrastinating. I thought — what if there was a way to recreate that "library atmosphere" online? Where you can see your friends studying alongside you, chat when you're stuck, and actually track how much time you put in.

That's basically what StudyRoom does. You create a virtual study room (I started calling them "chambers" because it sounded cooler lol), share an invite code with your friends, and then everyone can join and study together with synced timers and live chat.

---

## Tech Stack

| Layer | What I Used |
|---|---|
| **Frontend** | React + TypeScript, built with Vite |
| **Backend** | Django + Django REST Framework |
| **Real-time** | Django Channels (WebSockets) |
| **Database** | PostgreSQL (auto falls back to SQLite if Postgres isn't installed) |
| **Auth** | JWT tokens using SimpleJWT |
| **Server** | Daphne (ASGI server for handling WebSockets) |

I went with Django Channels instead of something like Socket.IO because I wanted everything in one backend — REST APIs and WebSockets running on the same server. It was definitely harder to set up but it keeps the architecture clean.

---

## Features

### The Main Stuff
- **Sign up / Login** — JWT-based auth with automatic token refresh (so you don't get randomly logged out)
- **Create rooms** — Each room gets a unique 8-character invite code that you can share
- **Study sessions** — Start a timer that syncs across all members in the room. When anyone starts or stops, everyone sees it
- **Live chat** — Messages show up instantly via WebSockets. I also added basic markdown support (bold, italics, code blocks)
- **Shared task list** — Add study tasks, check them off together. Great for splitting up topics in a group study
- **Activity log** — Keeps track of who joined, who left, who started/ended sessions
- **Room admin** — The room creator can promote members to owner, kick people, and change settings like the daily study target

### Extra Stuff I Added
- **Pomodoro mode** — 25 min study / 5 min break timer with automatic transitions
- **Audio chimes** — I used the Web Audio API to generate notification sounds directly in the browser (no mp3 files needed). This was fun to figure out
- **Daily study target** — Set how many hours you want to study per day and see your progress as a visual bar
- **Online indicators** — Green dots next to people who are currently in the room

---

## Bugs I Ran Into (and how I fixed them)

### 1. WebSocket connections failing with localhost vs 127.0.0.1
This one was really annoying. The frontend would connect to `ws://localhost:8000/ws` but sometimes the browser resolves localhost to `127.0.0.1`. Django Channels treated these as different hosts and would reject the connection. I had to write a dynamic host detection in the WebSocket hook that reads `window.location.hostname` and builds the WebSocket URL from that instead of hardcoding it.

### 2. UUID serialization crashing the WebSocket consumer
When broadcasting messages through Django Channels, the consumer would randomly crash with a "Object of type UUID is not JSON serializable" error. Turns out Django's UUIDs don't serialize to JSON by default. I had to write a `to_json_compatible()` helper function that recursively converts all UUIDs and datetime objects to strings before sending them through the channel layer.

### 3. The database fallback for local development
I wanted the app to use PostgreSQL in production but not force everyone to install Postgres just to test it locally. So I wrote a smart check in `settings.py` that tries to connect to Postgres with a 1-second timeout — if it fails, it silently falls back to SQLite. Took a few tries to get the timeout right because the default psycopg2 timeout was too long.

### 4. Session timer drift across browser tabs
When two people were in the same room and one started a session, the timers would slowly drift apart because each browser was running its own `setInterval`. I fixed this by having the timer calculate elapsed time from the original `start_time` timestamp rather than just incrementing a counter every second. This way even if a tab goes to sleep briefly, it catches up.

### 5. WebSocket not reconnecting after phone goes to sleep
On mobile, when the phone screen locks and unlocks, the WebSocket connection would die silently — no error, no close event, nothing. I added a reconnection mechanism in the `useWebSocket` hook that automatically retries every 3 seconds when the connection drops, with proper cleanup to avoid duplicate connections.

---

## Environment Variables

### Backend (`studyroom_backend/.env`)
```
SECRET_KEY=your_django_secret_key
DEBUG=True
DATABASE_NAME=studyroom_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (`studyroom_frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws
```

---

## How to Run

### Prerequisites
- Python 3.12+
- Node.js 22+

### Backend
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r studyroom_backend/requirements.txt
python studyroom_backend/manage.py migrate
python studyroom_backend/manage.py runserver 8000
```

### Frontend
```bash
cd studyroom_frontend
npm install
npm run dev
```

Open `http://localhost:5173` and you're good to go.

---

## API Endpoints

### Auth
| Method | Endpoint | What it does |
|---|---|---|
| POST | `/api/auth/register/` | Create a new account |
| POST | `/api/auth/login/` | Get JWT tokens |
| POST | `/api/auth/token/refresh/` | Refresh expired token |
| GET | `/api/auth/me/` | Get current user info |

### Rooms
| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/rooms/` | List your rooms |
| POST | `/api/rooms/` | Create a room |
| GET | `/api/rooms/:id/` | Room details |
| POST | `/api/rooms/join/` | Join with invite code |
| POST | `/api/rooms/:id/leave/` | Leave a room |
| GET | `/api/rooms/:id/members/` | List members |

### Sessions & Tasks
| Method | Endpoint | What it does |
|---|---|---|
| POST | `/api/rooms/:id/sessions/start/` | Start studying |
| POST | `/api/rooms/:id/sessions/end/` | Stop studying |
| GET | `/api/rooms/:id/sessions/` | Past sessions |
| GET/POST | `/api/rooms/:id/tasks/` | List/add tasks |
| POST | `/api/rooms/:id/tasks/:tid/toggle/` | Check/uncheck task |
| DELETE | `/api/rooms/:id/tasks/:tid/` | Delete task |

---

## What I'd Do With More Time

- Use Redis instead of InMemoryChannelLayer (needed for multiple server instances)
- Add file/image sharing in chat
- Better mobile responsiveness
- Email verification on signup
- Rate limiting on the API
- Dark/light theme toggle

---

Built by Suryansh Pandey
