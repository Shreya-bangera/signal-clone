from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from models import get_db, User, Contact
from schemas import UserOut, ContactOut, AddContactRequest
from auth import get_current_user
from pathlib import Path
import uuid, os, aiofiles

router = APIRouter(tags=["users"])
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
AVATAR_DIR = UPLOAD_DIR / "avatars"

@router.get("/users/search", response_model=list[UserOut])
def search_users(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).filter(
        User.id != current_user.id,
        (User.phone.contains(q) | User.display_name.ilike(f"%{q}%") | User.username.ilike(f"%{q}%"))
    ).limit(20).all()
    return [UserOut.model_validate(u) for u in users]

@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return UserOut.model_validate(user)

@router.post("/auth/avatar")
async def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    os.makedirs(AVATAR_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    path = AVATAR_DIR / filename
    async with aiofiles.open(path, "wb") as f:
        await f.write(await file.read())
    current_user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    return {"avatar_url": current_user.avatar_url}

# Contacts
@router.get("/contacts", response_model=list[ContactOut])
def get_contacts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contacts = db.query(Contact).filter(Contact.owner_id == current_user.id).all()
    result = []
    for c in contacts:
        contact_user = db.query(User).filter(User.id == c.contact_id).first()
        if contact_user:
            result.append(ContactOut(id=c.id, contact=UserOut.model_validate(contact_user), nickname=c.nickname))
    return result

@router.post("/contacts", response_model=ContactOut)
def add_contact(req: AddContactRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target = db.query(User).filter(User.phone == req.phone).first()
    if not target:
        raise HTTPException(404, "No user with that phone number")
    if target.id == current_user.id:
        raise HTTPException(400, "Cannot add yourself")
    existing = db.query(Contact).filter(Contact.owner_id == current_user.id, Contact.contact_id == target.id).first()
    if existing:
        raise HTTPException(400, "Contact already added")
    contact = Contact(owner_id=current_user.id, contact_id=target.id, nickname=req.nickname)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return ContactOut(id=contact.id, contact=UserOut.model_validate(target), nickname=contact.nickname)

@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.owner_id == current_user.id).first()
    if not contact:
        raise HTTPException(404, "Contact not found")
    db.delete(contact)
    db.commit()
    return {"ok": True}
