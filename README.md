# Secure Messaging Platform (Signal Clone)

This repository contains a full-stack secure messaging experience inspired by Signal, with a Next.js frontend and a FastAPI backend backed by SQLite.

## Tech stack

- Frontend: Next.js 16 + TypeScript + Tailwind CSS
- Backend: FastAPI + SQLAlchemy + WebSockets
- Database: SQLite
- Real-time: WebSocket-based typing and message sync

## Features included

- Mocked authentication and registration with OTP support
- Contact management and search
- One-on-one and group conversations
- Real-time message exchange and typing indicators
- Message status, reactions, replies, and file uploads
- Signal-inspired UI with conversation list and chat pane

## Project structure

- backend/: FastAPI app, SQLAlchemy models, routes, WebSocket manager, seed data
- frontend/: Next.js app, UI components, Zustand store, API helpers

## Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

## Demo accounts

All seeded users use the password `password123`.

- Alice Johnson — +1 (555) 001-0001
- Bob Smith — +1 (555) 001-0002
- Carol White — +1 (555) 001-0003
- David Brown — +1 (555) 001-0004

## Database schema overview

Core entities:
- users
- contacts
- conversations
- conversation_members
- messages
- message_statuses
- message_reactions

Relationships are modeled for direct chats, group chats, message histories, read receipts, and reactions.

## Deploying to production

### Backend on Render
1. Create a new Web Service on Render and connect this repository.
2. Render will use the provided [render.yaml](render.yaml) configuration.
3. Set these environment variables:
   - SECRET_KEY
   - CORS_ORIGINS=https://your-frontend-url.vercel.app

### Frontend on Vercel
1. Import the frontend folder into Vercel.
2. Set these environment variables:
   - NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   - NEXT_PUBLIC_WS_URL=wss://your-backend-url.onrender.com
3. Deploy.

## Notes

- OTP verification is intentionally mocked with the fixed code `123456`.
- Encryption is simulated for the assignment experience rather than implemented as a real cryptographic protocol.
