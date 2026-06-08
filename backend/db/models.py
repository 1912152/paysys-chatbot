from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class UserRole(str, enum.Enum):
    admin = "admin"
    agent = "agent"

class LeadStatus(str, enum.Enum):
    new = "new"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"

class ConversationStatus(str, enum.Enum):
    bot = "bot"
    escalated = "escalated"
    live = "live"
    closed = "closed"

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.agent)
    is_active = Column(Boolean, default=True)
    is_online = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_conversations = relationship("Conversation", back_populates="assigned_agent")

class Visitor(Base):
    __tablename__ = "visitors"
    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(100))
    email = Column(String(100))
    phone = Column(String(20))
    company = Column(String(100))
    product_interest = Column(String(200))  # auto-tagged by AI
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    conversations = relationship("Conversation", back_populates="visitor")

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, default=generate_uuid)
    visitor_id = Column(String, ForeignKey("visitors.id"), nullable=False)
    assigned_agent_id = Column(String, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(ConversationStatus), default=ConversationStatus.bot)
    lead_status = Column(Enum(LeadStatus), default=LeadStatus.new)
    product_interest = Column(String(200))
    summary = Column(Text)  # AI generated summary
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    escalated_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    visitor = relationship("Visitor", back_populates="conversations")
    assigned_agent = relationship("User", back_populates="assigned_conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    sender = Column(String(20), nullable=False)  # visitor, bot, agent
    content = Column(Text, nullable=False)
    meta = Column(JSON)  # sources used, confidence, etc
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    conversation = relationship("Conversation", back_populates="messages")

class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    source_type = Column(String(20), nullable=False)  # pdf, url, text
    source_path = Column(String(500))  # file path or URL
    status = Column(String(20), default="processing")  # processing, active, failed
    chunk_count = Column(Integer, default=0)
    added_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class BotOverride(Base):
    __tablename__ = "bot_overrides"
    id = Column(String, primary_key=True, default=generate_uuid)
    trigger_phrase = Column(String(500), nullable=False)  # question/phrase to match
    response = Column(Text, nullable=False)  # exact response to give
    is_active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
