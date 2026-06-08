from groq import Groq
from openai import OpenAI
from typing import List, Dict, Optional, Tuple
from services.rag_engine import search_knowledge_base
from sqlalchemy.orm import Session
from db.models import BotOverride
from core.config import settings
import re

# Initialize clients
groq_client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None
openai_client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

SYSTEM_PROMPT = """You are a helpful AI assistant for Paysys Labs — a leading fintech company providing digital financial services.

Your job is to help visitors understand Paysys Labs products and services and answer their questions accurately.

PAYSYS LABS PRODUCTS:
- Open Connect: Middleware Switch / API-driven payment switching platform
- Open ACS: 3D Secure authentication solution
- Open Acquiring: Merchant payment and acquiring solution
- Open Wallet: Digital wallet management system
- Open CMS: Card Management System
- Open Digital: Digital Banking Platform
- Open Remit: Cross-border remittance platform
- Open Engage: Loyalty & Rewards Engine
- Open Credit: Digital Lending Management System
- Open FRMS: Fraud Detection & Prevention System
- Open Pay: Digital Payment & Collection Platform

SERVICES:
- Advisory as a Service
- Software as a Service (SaaS/Managed)
- Gateway as a Service

LANGUAGE RULES:
- If user writes in English → respond in English
- If user writes in Urdu or Roman Urdu → respond in the same style (Roman Urdu or Urdu)
- Always be professional but friendly

ANSWER RULES:
- Answer ONLY from the context provided below
- If answer is not in context, say: "I don't have specific details on that. Would you like me to connect you with our team?"
- Never make up features or pricing
- Keep answers concise and clear
- For pricing or custom requirements, always suggest connecting with the team

ESCALATION: If user asks about pricing, custom demos, partnerships, integration details, or says they want to talk to someone — suggest escalation."""

PRODUCT_DETECTION_PROMPT = """Based on this conversation, identify which Paysys Labs product(s) the user is most interested in.
Choose from: Open Connect, Open ACS, Open Acquiring, Open Wallet, Open CMS, Open Digital, Open Remit, Open Engage, Open Credit, Open FRMS, Open Pay, Advisory, Managed Services, General Inquiry.
Respond with ONLY the product name(s), comma separated. Max 2 products."""

ESCALATION_KEYWORDS = [
    "talk to", "speak to", "human", "agent", "person", "team",
    "demo", "pricing", "price", "cost", "quote", "purchase", "buy",
    "integrate", "implementation", "contact", "call me", "reach out",
    "connect", "sales", "representative", "انسان", "قیمت", "demo chahiye",
    "baat krni", "team se", "price btao", "kitna cost"
]

def check_override(query: str, db: Session) -> Optional[str]:
    """Check if any admin override matches this query"""
    overrides = db.query(BotOverride).filter(BotOverride.is_active == True).all()
    query_lower = query.lower()
    for override in overrides:
        trigger_lower = override.trigger_phrase.lower()
        if trigger_lower in query_lower or query_lower in trigger_lower:
            return override.response
    return None

def detect_escalation_intent(message: str) -> bool:
    """Detect if user wants to escalate to human"""
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in ESCALATION_KEYWORDS)

def detect_product_interest(conversation_history: List[Dict]) -> str:
    """Use AI to detect which product user is interested in"""
    if not conversation_history:
        return "General Inquiry"
    
    conversation_text = "\n".join([
        f"{msg['role']}: {msg['content']}"
        for msg in conversation_history[-6:]  # last 6 messages
    ])
    
    try:
        response = _call_ai([
            {"role": "system", "content": PRODUCT_DETECTION_PROMPT},
            {"role": "user", "content": conversation_text}
        ], max_tokens=50)
        return response.strip()
    except:
        return "General Inquiry"

def _call_ai(messages: List[Dict], max_tokens: int = 800) -> str:
    """Call AI provider based on settings"""
    if settings.ai_provider == "groq" and groq_client:
        response = groq_client.chat.completions.create(
            model=settings.ai_model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.3
        )
        return response.choices[0].message.content
    
    elif settings.ai_provider == "openai" and openai_client:
        response = openai_client.chat.completions.create(
            model=settings.ai_model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.3
        )
        return response.choices[0].message.content
    
    else:
        return "AI service is not configured. Please contact the administrator."

def generate_bot_response(
    user_message: str,
    conversation_history: List[Dict],
    db: Session
) -> Tuple[str, bool, List[Dict]]:
    """
    Generate bot response.
    Returns: (response_text, should_escalate, sources_used)
    """
    
    # 1. Check admin overrides first
    override = check_override(user_message, db)
    if override:
        return override, False, []
    
    # 2. Check escalation intent
    should_escalate = detect_escalation_intent(user_message)
    
    # 3. Search knowledge base
    sources = search_knowledge_base(user_message, n_results=5)
    
    # 4. Build context from sources
    context = ""
    if sources:
        context = "\n\n---\n".join([
            f"Source: {s['source_name']}\n{s['content']}"
            for s in sources
        ])
    
    # 5. Build messages for AI
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    if context:
        messages.append({
            "role": "system",
            "content": f"RELEVANT KNOWLEDGE BASE CONTEXT:\n{context}"
        })
    
    # Add conversation history (last 8 messages)
    for msg in conversation_history[-8:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    messages.append({"role": "user", "content": user_message})
    
    # 6. Get AI response
    response = _call_ai(messages)
    
    return response, should_escalate, sources

def generate_conversation_summary(messages: List[Dict]) -> str:
    """Generate a summary of conversation for agent context"""
    if not messages:
        return "No messages"
    
    conversation_text = "\n".join([
        f"{msg['sender'].upper()}: {msg['content']}"
        for msg in messages
    ])
    
    try:
        summary = _call_ai([
            {"role": "system", "content": "Summarize this customer support conversation in 2-3 sentences. Focus on what the customer wants and what was discussed. Be concise."},
            {"role": "user", "content": conversation_text}
        ], max_tokens=150)
        return summary
    except:
        return "Conversation summary unavailable"
