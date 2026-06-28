# Secure Messaging Platform (Signal Clone)

A full-stack secure messaging application inspired by **Signal Messenger**, built with **Next.js**, **FastAPI**, **SQLite**, and **WebSockets**.

The application recreates the core messaging experience of Signal, including real-time messaging, contact management, group conversations, typing indicators, reactions, replies, and file sharing through a clean, modern interface.

---

## 🚀 Live Demo

**Frontend**

https://signal-clone-l2nee8i98-shreyaprojects.vercel.app/chat

**Backend API (Swagger Docs)**

https://signal-clone-wzty.onrender.com/docs

---

## ✨ Features

* ✅ Mocked authentication with OTP verification
* ✅ Contact management and search
* ✅ One-to-one conversations
* ✅ Group conversations
* ✅ Real-time messaging using WebSockets
* ✅ Typing indicators
* ✅ Message delivery/read status
* ✅ Message reactions
* ✅ Reply to messages
* ✅ File uploads
* ✅ Signal-inspired responsive UI
* ✅ SQLite database with seeded demo data

---

## 🛠 Tech Stack

### Frontend

* Next.js 16
* TypeScript
* Tailwind CSS
* Zustand

### Backend

* FastAPI
* SQLAlchemy
* WebSockets
* Pydantic

### Database

* SQLite

---

## 🏗 Architecture

Frontend (Next.js)

⬇ REST API + WebSockets

Backend (FastAPI)

⬇

SQLite Database

WebSockets are used for:

* Real-time messaging
* Typing indicators
* Conversation synchronization

---

## 📁 Project Structure

```
backend/
│── main.py
│── models.py
│── routes/
│── websocket_manager.py
│── seed.py
│── requirements.txt

frontend/
│── app/
│── components/
│── store/
│── lib/
│── package.json
```

---

## ⚙️ Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd signal-clone
```

---

### 2. Backend

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt

python seed.py

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at:

```
http://localhost:8000
```

Swagger Documentation:

```
http://localhost:8000/docs
```

---

### 3. Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend runs at:

```
http://localhost:3000
```

---

## 👤 Demo Accounts

All seeded users use the password:

```
password123
```

| User          | Phone             |
| ------------- | ----------------- |
| Alice Johnson | +1 (555) 001-0001 |
| Bob Smith     | +1 (555) 001-0002 |
| Carol White   | +1 (555) 001-0003 |
| David Brown   | +1 (555) 001-0004 |

---

## 🗄 Database Schema

Core tables include:

* users
* contacts
* conversations
* conversation_members
* messages
* message_statuses
* message_reactions

These entities support:

* Direct messaging
* Group chats
* Read receipts
* Reactions
* Reply chains
* Message history

---

## 🌐 Deployment

### Backend (Render)

Environment Variables

```
SECRET_KEY=<your-secret-key>
CORS_ORIGINS=https://signal-clone-l2nee8i98-shreyaprojects.vercel.app
```

Production Backend

```
https://signal-clone-wzty.onrender.com
```

---

### Frontend (Vercel)

Environment Variables

```
NEXT_PUBLIC_API_URL=https://signal-clone-wzty.onrender.com

NEXT_PUBLIC_WS_URL=wss://signal-clone-wzty.onrender.com
```

Production Frontend

```
https://signal-clone-l2nee8i98-shreyaprojects.vercel.app/chat
```

---

## 🔒 Assignment Notes

This project was built as part of a Full-Stack Software Engineering assignment.

For simplicity:

* OTP verification is mocked using the fixed code **123456**
* Encryption is simulated for demonstration purposes
* SQLite is used as the database

---

## 🚀 Future Improvements

* End-to-end encryption
* Push notifications
* Voice messages
* Video calling
* Offline synchronization
* Message search
* Media compression
* Docker deployment
* PostgreSQL support

---

## 📄 License

This project was developed for educational and assessment purposes.
