from fastapi import WebSocket
from typing import Dict, List, Optional
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # visitor_id -> WebSocket
        self.visitor_connections: Dict[str, WebSocket] = {}
        # agent_id -> WebSocket
        self.agent_connections: Dict[str, WebSocket] = {}
        # conversation_id -> agent_id (active live chats)
        self.active_chats: Dict[str, str] = {}

    async def connect_visitor(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.visitor_connections[session_id] = websocket
        logger.info(f"Visitor connected: {session_id}")

    async def connect_agent(self, websocket: WebSocket, agent_id: str):
        await websocket.accept()
        self.agent_connections[agent_id] = websocket
        logger.info(f"Agent connected: {agent_id}")
        # Notify agent of pending escalations
        await self.send_to_agent(agent_id, {
            "type": "connected",
            "message": "Connected to Paysys Chat System"
        })

    def disconnect_visitor(self, session_id: str):
        self.visitor_connections.pop(session_id, None)
        logger.info(f"Visitor disconnected: {session_id}")

    def disconnect_agent(self, agent_id: str):
        self.agent_connections.pop(agent_id, None)
        # Remove from active chats
        convs_to_remove = [
            conv_id for conv_id, aid in self.active_chats.items()
            if aid == agent_id
        ]
        for conv_id in convs_to_remove:
            del self.active_chats[conv_id]
        logger.info(f"Agent disconnected: {agent_id}")

    async def send_to_visitor(self, session_id: str, data: dict):
        ws = self.visitor_connections.get(session_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception as e:
                logger.error(f"Error sending to visitor {session_id}: {e}")
                self.visitor_connections.pop(session_id, None)

    async def send_to_agent(self, agent_id: str, data: dict):
        ws = self.agent_connections.get(agent_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception as e:
                logger.error(f"Error sending to agent {agent_id}: {e}")
                self.agent_connections.pop(agent_id, None)

    async def broadcast_to_all_agents(self, data: dict):
        """Broadcast to all online agents (e.g. new escalation)"""
        disconnected = []
        for agent_id, ws in self.agent_connections.items():
            try:
                await ws.send_text(json.dumps(data))
            except:
                disconnected.append(agent_id)
        for aid in disconnected:
            self.agent_connections.pop(aid, None)

    def assign_agent_to_conversation(self, conversation_id: str, agent_id: str):
        self.active_chats[conversation_id] = agent_id

    def get_agent_for_conversation(self, conversation_id: str) -> Optional[str]:
        return self.active_chats.get(conversation_id)

    def get_online_agents(self) -> List[str]:
        return list(self.agent_connections.keys())

    def is_visitor_online(self, session_id: str) -> bool:
        return session_id in self.visitor_connections

# Global instance
manager = ConnectionManager()
