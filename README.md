# ProjectHub — Full Stack Project Management Tool

A Trello/Asana-like collaborative project management app built with:
- **Backend**: Node.js + Express + SQLite + Socket.IO
- **Frontend**: React + React Router + Socket.IO Client

## Features
- ✅ User auth (register/login with JWT)
- ✅ Create group projects with custom colors
- ✅ Kanban board (To Do / In Progress / Review / Done)
- ✅ Drag-and-drop tasks between columns
- ✅ Assign tasks to team members
- ✅ Comment & communicate within tasks
- ✅ Real-time updates via WebSockets
- ✅ In-app notifications when assigned/commented

---

## Setup in VSCode

### 1. Install dependencies

Open TWO terminals in VSCode (`Ctrl+\`` → `+` icon to split).

**Terminal 1 — Backend:**
```bash
cd backend
npm install
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
```

### 2. Run the app

**Terminal 1 — Start backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 — Start frontend:**
```bash
cd frontend
npm start
# Opens http://localhost:3000
```

### 3. Use the app
1. Go to `http://localhost:3000`
2. Register an account
3. Create a project
4. Add tasks to the Kanban board
5. Drag tasks between columns
6. Click a task to assign it, set due date, add comments
7. Open in two browser tabs to see real-time WebSocket updates!

---

## Project Structure
```
projecthub/
├── backend/
│   ├── server.js        # All API routes + WebSocket server
│   ├── package.json
│   └── projecthub.db    # Created automatically on first run
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js
        ├── index.js
        ├── context/
        │   ├── AuthContext.js    # Global auth state
        │   └── SocketContext.js  # Real-time WebSocket
        ├── pages/
        │   ├── AuthPage.js       # Login / Register
        │   ├── Dashboard.js      # Projects list
        │   └── ProjectBoard.js   # Kanban board
        └── components/
            └── TaskModal.js      # Create/edit task + comments
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Project details + members |
| DELETE | /api/projects/:id | Delete project |
| POST | /api/projects/:id/members | Invite member |
| GET | /api/projects/:id/tasks | List tasks |
| POST | /api/projects/:id/tasks | Create task |
| PUT | /api/tasks/:id | Update task (status, assignee, etc.) |
| DELETE | /api/tasks/:id | Delete task |
| GET | /api/tasks/:id/comments | List comments |
| POST | /api/tasks/:id/comments | Add comment |
| GET | /api/notifications | Get notifications |
| PUT | /api/notifications/read | Mark all read |

## WebSocket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| join:project | Client → Server | Subscribe to project updates |
| task:created | Server → Client | New task added |
| task:updated | Server → Client | Task modified/moved |
| task:deleted | Server → Client | Task removed |
| comment:created | Server → Client | New comment posted |
| notification | Server → Client | Assignment/comment alert |
