from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from models import Base, engine, get_db, User
from routes import auth_routes, user_routes, conversation_routes, message_routes
from ws_manager import manager
from jose import JWTError, jwt
from auth import SECRET_KEY, ALGORITHM
from datetime import datetime
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
AVATAR_DIR = UPLOAD_DIR / "avatars"
FILES_DIR = UPLOAD_DIR / "files"

Base.metadata.create_all(bind=engine)
os.makedirs(AVATAR_DIR, exist_ok=True)
os.makedirs(FILES_DIR, exist_ok=True)

app = FastAPI(title="Signal Clone API")

cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
allow_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins if allow_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.include_router(auth_routes.router, prefix="/api")
app.include_router(user_routes.router, prefix="/api")
app.include_router(conversation_routes.router, prefix="/api")
app.include_router(message_routes.router, prefix="/api")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    manager.connect(user_id, websocket)

    db: Session = next(get_db())
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_online = True
        db.commit()

    # Notify contacts of online status
    await manager.broadcast_to_users(
        [uid for uid in manager.active.keys() if uid != user_id],
        {"type": "user_online", "data": {"user_id": user_id, "is_online": True}}
    )

    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("type")

            if event == "typing":
                conv_id = data.get("conversation_id")
                if conv_id:
                    from models import ConversationMember
                    member_ids = [m.user_id for m in db.query(ConversationMember).filter(ConversationMember.conversation_id == conv_id).all()]
                    for mid in member_ids:
                        if mid != user_id:
                            await manager.send_to_user(mid, {
                                "type": "typing",
                                "data": {"user_id": user_id, "conversation_id": conv_id, "is_typing": data.get("is_typing", False)}
                            })

            elif event == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, websocket)
        if user:
            user.is_online = False
            user.last_seen = datetime.utcnow()
            db.commit()
        await manager.broadcast_to_users(
            list(manager.active.keys()),
            {"type": "user_online", "data": {"user_id": user_id, "is_online": False}}
        )
        db.close()

@app.get("/api/health")
def health():
    return {"status": "ok"}
