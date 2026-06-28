from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Auth
class RegisterRequest(BaseModel):
    phone: str
    display_name: str
    password: str
    otp: str = "123456"
    username: Optional[str] = None

class LoginRequest(BaseModel):
    phone: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

# User
class UserOut(BaseModel):
    id: str
    phone: str
    username: Optional[str]
    display_name: str
    avatar_url: Optional[str]
    about: Optional[str]
    is_online: bool
    last_seen: datetime
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    about: Optional[str] = None
    username: Optional[str] = None

# Contact
class ContactOut(BaseModel):
    id: str
    contact: UserOut
    nickname: Optional[str]
    class Config:
        from_attributes = True

class AddContactRequest(BaseModel):
    phone: str
    nickname: Optional[str] = None

# Message
class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: UserOut
    content: Optional[str]
    message_type: str
    file_url: Optional[str]
    file_name: Optional[str]
    reply_to_id: Optional[str]
    reply_to: Optional["MessageOut"] = None
    is_deleted: bool
    disappear_after: Optional[int]
    status: str = "sent"
    reactions: List["ReactionOut"] = []
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ReactionOut(BaseModel):
    id: str
    emoji: str
    user_id: str
    user: UserOut
    class Config:
        from_attributes = True

class SendMessageRequest(BaseModel):
    content: Optional[str] = None
    message_type: str = "text"
    reply_to_id: Optional[str] = None
    disappear_after: Optional[int] = None

class ReactRequest(BaseModel):
    emoji: str

# Conversation
class ConversationOut(BaseModel):
    id: str
    is_group: bool
    name: Optional[str]
    avatar_url: Optional[str]
    description: Optional[str]
    created_by: Optional[str]
    members: List["MemberOut"] = []
    last_message: Optional[MessageOut] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class MemberOut(BaseModel):
    id: str
    user: UserOut
    is_admin: bool
    joined_at: datetime
    class Config:
        from_attributes = True

class CreateGroupRequest(BaseModel):
    name: str
    member_ids: List[str]
    description: Optional[str] = None

class UpdateGroupRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

TokenResponse.model_rebuild()
MessageOut.model_rebuild()
ConversationOut.model_rebuild()
