from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from models import get_db, User, Conversation, ConversationMember, Message, MessageStatus, MessageReaction
from schemas import MessageOut, SendMessageRequest, ReactRequest
from auth import get_current_user
from ws_manager import manager
from routes.conversation_routes import build_message_out
from datetime import datetime
from pathlib import Path
import uuid, os, aiofiles

router = APIRouter(prefix="/conversations/{conv_id}/messages", tags=["messages"])
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
FILES_DIR = UPLOAD_DIR / "files"

def assert_member(conv_id: str, user_id: str, db: Session):
    m = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id, ConversationMember.user_id == user_id
    ).first()
    if not m:
        raise HTTPException(403, "Not a member")
    return m

def get_conv_member_ids(conv_id: str, db: Session):
    return [m.user_id for m in db.query(ConversationMember).filter(ConversationMember.conversation_id == conv_id).all()]

@router.get("", response_model=list[MessageOut])
def get_messages(conv_id: str, skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assert_member(conv_id, current_user.id, db)
    messages = db.query(Message).options(
        joinedload(Message.sender),
        joinedload(Message.statuses),
        joinedload(Message.reactions).joinedload(MessageReaction.user),
        joinedload(Message.reply_to).joinedload(Message.sender),
    ).filter(Message.conversation_id == conv_id).order_by(desc(Message.created_at)).offset(skip).limit(limit).all()
    messages.reverse()
    # Mark as read
    for msg in messages:
        if msg.sender_id != current_user.id:
            existing = db.query(MessageStatus).filter(
                MessageStatus.message_id == msg.id, MessageStatus.user_id == current_user.id
            ).first()
            if not existing:
                db.add(MessageStatus(message_id=msg.id, user_id=current_user.id, status="read"))
    db.commit()
    return [build_message_out(m, current_user.id, db) for m in messages]

@router.post("", response_model=MessageOut)
async def send_message(conv_id: str, req: SendMessageRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assert_member(conv_id, current_user.id, db)
    msg = Message(
        conversation_id=conv_id, sender_id=current_user.id,
        content=req.content, message_type=req.message_type,
        reply_to_id=req.reply_to_id, disappear_after=req.disappear_after,
    )
    db.add(msg)
    # Update conversation updated_at
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    conv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)
    msg = db.query(Message).options(
        joinedload(Message.sender), joinedload(Message.statuses),
        joinedload(Message.reactions).joinedload(MessageReaction.user),
        joinedload(Message.reply_to).joinedload(Message.sender),
    ).filter(Message.id == msg.id).first()

    msg_out = build_message_out(msg, current_user.id, db)
    member_ids = get_conv_member_ids(conv_id, db)
    await manager.broadcast_to_users(member_ids, {"type": "new_message", "data": msg_out.model_dump(mode="json")})
    return msg_out

@router.post("/upload", response_model=MessageOut)
async def send_file(conv_id: str, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assert_member(conv_id, current_user.id, db)
    os.makedirs(FILES_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    path = FILES_DIR / filename
    async with aiofiles.open(path, "wb") as f:
        await f.write(await file.read())
    content_type = file.content_type or ""
    msg_type = "image" if content_type.startswith("image") else "file"
    msg = Message(
        conversation_id=conv_id, sender_id=current_user.id,
        message_type=msg_type, file_url=f"/uploads/files/{filename}", file_name=file.filename,
    )
    db.add(msg)
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    conv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)
    msg = db.query(Message).options(
        joinedload(Message.sender), joinedload(Message.statuses),
        joinedload(Message.reactions).joinedload(MessageReaction.user),
    ).filter(Message.id == msg.id).first()
    msg_out = build_message_out(msg, current_user.id, db)
    member_ids = get_conv_member_ids(conv_id, db)
    await manager.broadcast_to_users(member_ids, {"type": "new_message", "data": msg_out.model_dump(mode="json")})
    return msg_out

@router.delete("/{msg_id}")
async def delete_message(conv_id: str, msg_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == msg_id, Message.conversation_id == conv_id).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(403, "Not your message")
    msg.is_deleted = True
    msg.content = None
    db.commit()
    member_ids = get_conv_member_ids(conv_id, db)
    await manager.broadcast_to_users(member_ids, {"type": "message_deleted", "data": {"id": msg_id, "conversation_id": conv_id}})
    return {"ok": True}

@router.post("/{msg_id}/react")
async def react(conv_id: str, msg_id: str, req: ReactRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assert_member(conv_id, current_user.id, db)
    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == msg_id, MessageReaction.user_id == current_user.id, MessageReaction.emoji == req.emoji
    ).first()
    if existing:
        db.delete(existing)
    else:
        db.add(MessageReaction(message_id=msg_id, user_id=current_user.id, emoji=req.emoji))
    db.commit()
    member_ids = get_conv_member_ids(conv_id, db)
    await manager.broadcast_to_users(member_ids, {"type": "reaction_update", "data": {"message_id": msg_id, "conversation_id": conv_id}})
    return {"ok": True}

@router.post("/{msg_id}/read")
async def mark_read(conv_id: str, msg_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assert_member(conv_id, current_user.id, db)
    existing = db.query(MessageStatus).filter(
        MessageStatus.message_id == msg_id, MessageStatus.user_id == current_user.id
    ).first()
    if not existing:
        db.add(MessageStatus(message_id=msg_id, user_id=current_user.id, status="read"))
    else:
        existing.status = "read"
    db.commit()
    msg = db.query(Message).filter(Message.id == msg_id).first()
    if msg:
        await manager.send_to_user(msg.sender_id, {"type": "message_read", "data": {"message_id": msg_id, "conversation_id": conv_id, "reader_id": current_user.id}})
    return {"ok": True}
