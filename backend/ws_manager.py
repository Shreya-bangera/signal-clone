from typing import Dict, Set
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # user_id -> set of websockets
        self.active: Dict[str, Set[WebSocket]] = {}

    def connect(self, user_id: str, ws: WebSocket):
        if user_id not in self.active:
            self.active[user_id] = set()
        self.active[user_id].add(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.active:
            self.active[user_id].discard(ws)
            if not self.active[user_id]:
                del self.active[user_id]

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active and len(self.active[user_id]) > 0

    async def send_to_user(self, user_id: str, data: dict):
        if user_id in self.active:
            dead = set()
            for ws in self.active[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.active[user_id].discard(ws)

    async def broadcast_to_users(self, user_ids: list, data: dict):
        for uid in user_ids:
            await self.send_to_user(uid, data)

manager = ConnectionManager()
