from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from models import get_db, User, Conversation, ConversationMember, Message, MessageStatus, MessageReaction
from schemas import ConversationOut, MemberOut, UserOut, MessageOut, CreateGroupRequest, UpdateGroupRequest
from auth import get_current_user
from datetime import datetime
import uuid

router = APIRouter(prefix="/conversations", tags=["conversations"])

def build_conversation_out(conv: Conversation, current_user_id: str, db: Session) -> ConversationOut:
    members = [
        MemberOut(id=m.id, user=UserOut.model_validate(m.user), is_admin=m.is_admin, joined_at=m.joined_at)
        for m in conv.members if m.user
    ]
    last_msg = db.query(Message).filter(
        Message.conversation_id == conv.id, Message.is_deleted == False
    ).order_by(desc(Message.created_at)).first()

    unread = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.sender_id != current_user_id,
        Message.is_deleted == False,
    ).outerjoin(MessageStatus, (MessageStatus.message_id == Message.id) & (MessageStatus.user_id == current_user_id)).filter(
        MessageStatus.id == None
    ).count()

    last_msg_out = build_message_out(last_msg, current_user_id, db) if last_msg else None

    return ConversationOut(
        id=conv.id, is_group=conv.is_group, name=conv.name,
        avatar_url=conv.avatar_url, description=conv.description,
        created_by=conv.created_by, members=members,
        last_message=last_msg_out, unread_count=unread,
        created_at=conv.created_at, updated_at=conv.updated_at
    )

def build_message_out(msg: Message, current_user_id: str, db: Session) -> MessageOut:
    # Determine aggregate status
    if msg.sender_id == current_user_id:
        statuses = [s.status for s in msg.statuses]
        if "read" in statuses:
            status = "read"
        elif "delivered" in statuses:
            status = "delivered"
        else:
            status = "sent"
    else:
        status = "received"

    reply_out = None
    if msg.reply_to:
        reply_out = MessageOut(
            id=msg.reply_to.id, conversation_id=msg.reply_to.conversation_id,
            sender_id=msg.reply_to.sender_id, sender=UserOut.model_validate(msg.reply_to.sender),
            content=msg.reply_to.content, message_type=msg.reply_to.message_type,
            file_url=msg.reply_to.file_url, file_name=msg.reply_to.file_name,
            reply_to_id=None, is_deleted=msg.reply_to.is_deleted,
            disappear_after=msg.reply_to.disappear_after, status="sent",
            reactions=[], created_at=msg.reply_to.created_at, updated_at=msg.reply_to.updated_at
        )

    from schemas import ReactionOut
    reactions = [
        ReactionOut(id=r.id, emoji=r.emoji, user_id=r.user_id, user=UserOut.model_validate(r.user))
        for r in msg.reactions
    ]

    return MessageOut(
        id=msg.id, conversation_id=msg.conversation_id,
        sender_id=msg.sender_id, sender=UserOut.model_validate(msg.sender),
        content=msg.content, message_type=msg.message_type,
        file_url=msg.file_url, file_name=msg.file_name,
        reply_to_id=msg.reply_to_id, reply_to=reply_out,
        is_deleted=msg.is_deleted, disappear_after=msg.disappear_after,
        status=status, reactions=reactions,
        created_at=msg.created_at, updated_at=msg.updated_at
    )

@router.get("", response_model=list[ConversationOut])
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = db.query(ConversationMember).filter(ConversationMember.user_id == current_user.id).all()
    conv_ids = [m.conversation_id for m in memberships]
    convs = db.query(Conversation).options(
        joinedload(Conversation.members).joinedload(ConversationMember.user),
        joinedload(Conversation.messages).joinedload(Message.sender),
        joinedload(Conversation.messages).joinedload(Message.statuses),
        joinedload(Conversation.messages).joinedload(Message.reactions).joinedload(MessageReaction.user),
    ).filter(Conversation.id.in_(conv_ids)).order_by(desc(Conversation.updated_at)).all()
    return [build_conversation_out(c, current_user.id, db) for c in convs]

@router.post("/dm/{user_id}", response_model=ConversationOut)
def get_or_create_dm(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    # Find existing DM
    my_convs = db.query(ConversationMember.conversation_id).filter(ConversationMember.user_id == current_user.id)
    their_convs = db.query(ConversationMember.conversation_id).filter(ConversationMember.user_id == user_id)
    shared = my_convs.intersect(their_convs).all()
    for (cid,) in shared:
        conv = db.query(Conversation).filter(Conversation.id == cid, Conversation.is_group == False).first()
        if conv:
            db.expire_all()
            conv = db.query(Conversation).options(
                joinedload(Conversation.members).joinedload(ConversationMember.user),
            ).filter(Conversation.id == cid).first()
            return build_conversation_out(conv, current_user.id, db)
    # Create new DM
    conv = Conversation(is_group=False)
    db.add(conv)
    db.flush()
    db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id, is_admin=True))
    db.add(ConversationMember(conversation_id=conv.id, user_id=user_id, is_admin=True))
    db.commit()
    db.refresh(conv)
    conv = db.query(Conversation).options(
        joinedload(Conversation.members).joinedload(ConversationMember.user),
    ).filter(Conversation.id == conv.id).first()
    return build_conversation_out(conv, current_user.id, db)

@router.post("/group", response_model=ConversationOut)
def create_group(req: CreateGroupRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = Conversation(is_group=True, name=req.name, description=req.description, created_by=current_user.id)
    db.add(conv)
    db.flush()
    member_ids = list(set(req.member_ids + [current_user.id]))
    for uid in member_ids:
        db.add(ConversationMember(conversation_id=conv.id, user_id=uid, is_admin=(uid == current_user.id)))
    db.commit()
    conv = db.query(Conversation).options(
        joinedload(Conversation.members).joinedload(ConversationMember.user),
    ).filter(Conversation.id == conv.id).first()
    return build_conversation_out(conv, current_user.id, db)

@router.get("/{conv_id}", response_model=ConversationOut)
def get_conversation(conv_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id, ConversationMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(403, "Not a member")
    conv = db.query(Conversation).options(
        joinedload(Conversation.members).joinedload(ConversationMember.user),
    ).filter(Conversation.id == conv_id).first()
    return build_conversation_out(conv, current_user.id, db)

@router.patch("/{conv_id}", response_model=ConversationOut)
def update_group(conv_id: str, req: UpdateGroupRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id, ConversationMember.user_id == current_user.id, ConversationMember.is_admin == True
    ).first()
    if not member:
        raise HTTPException(403, "Admin only")
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if req.name: conv.name = req.name
    if req.description is not None: conv.description = req.description
    db.commit()
    conv = db.query(Conversation).options(joinedload(Conversation.members).joinedload(ConversationMember.user)).filter(Conversation.id == conv_id).first()
    return build_conversation_out(conv, current_user.id, db)

@router.post("/{conv_id}/members/{user_id}")
def add_member(conv_id: str, user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id, ConversationMember.user_id == current_user.id, ConversationMember.is_admin == True
    ).first()
    if not admin:
        raise HTTPException(403, "Admin only")
    existing = db.query(ConversationMember).filter(ConversationMember.conversation_id == conv_id, ConversationMember.user_id == user_id).first()
    if existing:
        raise HTTPException(400, "Already a member")
    db.add(ConversationMember(conversation_id=conv_id, user_id=user_id))
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    conv.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}

@router.delete("/{conv_id}/members/{user_id}")
def remove_member(conv_id: str, user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id, ConversationMember.user_id == current_user.id, ConversationMember.is_admin == True
    ).first()
    if not admin and current_user.id != user_id:
        raise HTTPException(403, "Admin only")
    member = db.query(ConversationMember).filter(ConversationMember.conversation_id == conv_id, ConversationMember.user_id == user_id).first()
    if member:
        db.delete(member)
        db.commit()
    return {"ok": True}
