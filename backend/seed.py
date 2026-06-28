"""Seed the database with sample users, contacts, conversations, and messages."""
from models import Base, engine, SessionLocal, User, Contact, Conversation, ConversationMember, Message, MessageStatus
from auth import hash_password
from datetime import datetime, timedelta
import uuid

def gen_id():
    return str(uuid.uuid4())

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Clear existing data
for table in reversed(Base.metadata.sorted_tables):
    db.execute(table.delete())
db.commit()

# Users
users_data = [
    ("alice", "+1 (555) 001-0001", "Alice Johnson", "Hey there! I am using Signal.", "https://api.dicebear.com/7.x/avataaars/svg?seed=alice"),
    ("bob", "+1 (555) 001-0002", "Bob Smith", "Available", "https://api.dicebear.com/7.x/avataaars/svg?seed=bob"),
    ("carol", "+1 (555) 001-0003", "Carol White", "At the gym 🏋️", "https://api.dicebear.com/7.x/avataaars/svg?seed=carol"),
    ("david", "+1 (555) 001-0004", "David Brown", "Busy", "https://api.dicebear.com/7.x/avataaars/svg?seed=david"),
    ("eve", "+1 (555) 001-0005", "Eve Davis", "Living the dream ✨", "https://api.dicebear.com/7.x/avataaars/svg?seed=eve"),
    ("frank", "+1 (555) 001-0006", "Frank Miller", "🎵 Music is life", "https://api.dicebear.com/7.x/avataaars/svg?seed=frank"),
]

created_users = []
for username, phone, name, about, avatar in users_data:
    u = User(id=gen_id(), phone=phone, username=username, display_name=name, about=about,
             avatar_url=avatar, password_hash=hash_password("password123"), is_online=False)
    db.add(u)
    created_users.append(u)

db.commit()

alice, bob, carol, david, eve, frank = created_users

# Contacts (mutual)
pairs = [(alice, bob), (alice, carol), (alice, david), (alice, eve), (alice, frank),
         (bob, carol), (bob, david), (carol, david), (carol, eve)]
for u1, u2 in pairs:
    db.add(Contact(id=gen_id(), owner_id=u1.id, contact_id=u2.id))
    db.add(Contact(id=gen_id(), owner_id=u2.id, contact_id=u1.id))
db.commit()

# Helper
def make_dm(u1, u2):
    c = Conversation(id=gen_id(), is_group=False, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    db.add(c)
    db.flush()
    db.add(ConversationMember(id=gen_id(), conversation_id=c.id, user_id=u1.id, is_admin=True))
    db.add(ConversationMember(id=gen_id(), conversation_id=c.id, user_id=u2.id, is_admin=True))
    return c

def add_msg(conv_id, sender, content, minutes_ago=0, status_users=None):
    t = datetime.utcnow() - timedelta(minutes=minutes_ago)
    msg = Message(id=gen_id(), conversation_id=conv_id, sender_id=sender.id,
                  content=content, message_type="text", created_at=t, updated_at=t)
    db.add(msg)
    db.flush()
    if status_users:
        for u in status_users:
            db.add(MessageStatus(id=gen_id(), message_id=msg.id, user_id=u.id, status="read"))
    return msg

# DM: alice <-> bob
dm_ab = make_dm(alice, bob)
add_msg(dm_ab.id, alice, "Hey Bob! How's it going?", 120, [bob])
add_msg(dm_ab.id, bob, "Hey Alice! Doing great, just finished a project. You?", 115, [alice])
add_msg(dm_ab.id, alice, "That's awesome! I'm working on something new too 🚀", 110, [bob])
add_msg(dm_ab.id, bob, "Nice! We should catch up sometime", 60, [alice])
add_msg(dm_ab.id, alice, "Definitely! How about this weekend?", 30, [bob])
add_msg(dm_ab.id, bob, "Sounds good to me! 👍", 5, [alice])
dm_ab.updated_at = datetime.utcnow() - timedelta(minutes=5)

# DM: alice <-> carol
dm_ac = make_dm(alice, carol)
add_msg(dm_ac.id, carol, "Alice! Did you see the game last night?", 200, [alice])
add_msg(dm_ac.id, alice, "Yes!! What a finish 🎉", 195, [carol])
add_msg(dm_ac.id, carol, "I couldn't believe it!", 190, [alice])
add_msg(dm_ac.id, alice, "Same! Are you going to the gym later?", 60, [carol])
add_msg(dm_ac.id, carol, "Yeah, around 6pm. Wanna join?", 10)
dm_ac.updated_at = datetime.utcnow() - timedelta(minutes=10)

# DM: alice <-> david
dm_ad = make_dm(alice, david)
add_msg(dm_ad.id, david, "Hey, can you review my PR?", 300, [alice])
add_msg(dm_ad.id, alice, "Sure! Sending feedback now", 295, [david])
add_msg(dm_ad.id, david, "Thanks a lot!", 290, [alice])
add_msg(dm_ad.id, alice, "No prob. Also, the meeting is moved to 3pm", 45)
dm_ad.updated_at = datetime.utcnow() - timedelta(minutes=45)

# DM: bob <-> carol
dm_bc = make_dm(bob, carol)
add_msg(dm_bc.id, bob, "Carol, are you coming to the team lunch?", 500, [carol])
add_msg(dm_bc.id, carol, "Absolutely! Where are we going?", 490, [bob])
add_msg(dm_bc.id, bob, "That new Italian place downtown", 485, [carol])
add_msg(dm_bc.id, carol, "Perfect, I love Italian! 🍝", 480, [bob])
dm_bc.updated_at = datetime.utcnow() - timedelta(minutes=480)

# Group: Dev Team
grp_dev = Conversation(id=gen_id(), is_group=True, name="Dev Team 🚀", 
                        description="Engineering team chat", created_by=alice.id,
                        created_at=datetime.utcnow(), updated_at=datetime.utcnow())
db.add(grp_dev)
db.flush()
for u, is_admin in [(alice, True), (bob, False), (carol, False), (david, False)]:
    db.add(ConversationMember(id=gen_id(), conversation_id=grp_dev.id, user_id=u.id, is_admin=is_admin))

add_msg(grp_dev.id, alice, "Good morning team! Sprint planning at 10am today", 480, [bob, carol, david])
add_msg(grp_dev.id, bob, "On it! I'll have my tasks ready", 475, [alice, carol, david])
add_msg(grp_dev.id, carol, "Same here 👋", 470, [alice, bob, david])
add_msg(grp_dev.id, david, "Can we push it to 10:30? In a call", 465, [alice, bob, carol])
add_msg(grp_dev.id, alice, "Sure, 10:30 works", 460, [bob, carol, david])
add_msg(grp_dev.id, bob, "Deployment successful! 🎉 All tests passing", 120, [alice, carol, david])
add_msg(grp_dev.id, carol, "Great work everyone!", 115, [alice, bob, david])
add_msg(grp_dev.id, alice, "Nice! Let's celebrate 🥂", 20)
grp_dev.updated_at = datetime.utcnow() - timedelta(minutes=20)

# Group: Friends
grp_friends = Conversation(id=gen_id(), is_group=True, name="Squad 🎉",
                             description="The gang's all here", created_by=bob.id,
                             created_at=datetime.utcnow(), updated_at=datetime.utcnow())
db.add(grp_friends)
db.flush()
for u, is_admin in [(bob, True), (alice, False), (carol, False), (eve, False), (frank, False)]:
    db.add(ConversationMember(id=gen_id(), conversation_id=grp_friends.id, user_id=u.id, is_admin=is_admin))

add_msg(grp_friends.id, bob, "Weekend plans anyone?", 2880, [alice, carol, eve, frank])
add_msg(grp_friends.id, eve, "Beach! 🏖️", 2870, [alice, bob, carol, frank])
add_msg(grp_friends.id, frank, "I'm in 🙌", 2865, [alice, bob, carol, eve])
add_msg(grp_friends.id, carol, "Same! Let's go Saturday morning", 2860, [alice, bob, eve, frank])
add_msg(grp_friends.id, alice, "Saturday works for me!", 2855, [bob, carol, eve, frank])
add_msg(grp_friends.id, eve, "Can't wait!! 🌊", 60, [alice, bob, carol, frank])
add_msg(grp_friends.id, frank, "What time are we meeting?", 15)
grp_friends.updated_at = datetime.utcnow() - timedelta(minutes=15)

db.commit()
db.close()
print("✅ Database seeded successfully!")
print("\nTest accounts (all use password: password123):")
for _, phone, name, _, _ in users_data:
    print(f"  {name}: {phone}")
