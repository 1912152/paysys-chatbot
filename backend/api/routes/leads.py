from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db.database import get_db
from db.models import Conversation, Message, Visitor, User, ConversationStatus, LeadStatus
from core.auth import decode_token
from typing import Optional

router = APIRouter(prefix="/api/leads", tags=["leads"])

def get_agent_user(token: str, db: Session):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.get("/conversations")
def get_conversations(
    token: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    get_agent_user(token, db)
    
    query = db.query(Conversation).join(Visitor)
    if status:
        query = query.filter(Conversation.status == status)
    else:
        # By default show escalated and live
        query = query.filter(
            Conversation.status.in_([
                ConversationStatus.escalated,
                ConversationStatus.live
            ])
        )
    
    conversations = query.order_by(desc(Conversation.started_at)).limit(100).all()
    
    result = []
    for conv in conversations:
        visitor = conv.visitor
        result.append({
            "id": conv.id,
            "status": conv.status,
            "lead_status": conv.lead_status,
            "product_interest": conv.product_interest,
            "summary": conv.summary,
            "started_at": conv.started_at.isoformat() if conv.started_at else None,
            "escalated_at": conv.escalated_at.isoformat() if conv.escalated_at else None,
            "visitor": {
                "name": visitor.name,
                "email": visitor.email,
                "phone": visitor.phone,
                "company": visitor.company,
            } if visitor else {},
            "assigned_agent": conv.assigned_agent.name if conv.assigned_agent else None
        })
    
    return result

@router.get("/conversations/{conv_id}/messages")
def get_messages(conv_id: str, token: str, db: Session = Depends(get_db)):
    get_agent_user(token, db)
    
    conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = db.query(Message).filter(
        Message.conversation_id == conv_id
    ).order_by(Message.created_at).all()
    
    return {
        "conversation": {
            "id": conversation.id,
            "status": conversation.status,
            "product_interest": conversation.product_interest,
            "summary": conversation.summary,
            "visitor": {
                "name": conversation.visitor.name,
                "email": conversation.visitor.email,
                "phone": conversation.visitor.phone,
                "company": conversation.visitor.company,
            } if conversation.visitor else {}
        },
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in messages
        ]
    }

@router.put("/conversations/{conv_id}/lead-status")
def update_lead_status(
    conv_id: str,
    status: str,
    token: str,
    db: Session = Depends(get_db)
):
    get_agent_user(token, db)
    conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Not found")
    conversation.lead_status = LeadStatus(status)
    db.commit()
    return {"message": "Lead status updated"}

@router.get("/stats")
def get_lead_stats(token: str, db: Session = Depends(get_db)):
    get_agent_user(token, db)
    
    total = db.query(Conversation).count()
    escalated = db.query(Conversation).filter(
        Conversation.status == ConversationStatus.escalated
    ).count()
    live = db.query(Conversation).filter(
        Conversation.status == ConversationStatus.live
    ).count()
    closed = db.query(Conversation).filter(
        Conversation.status == ConversationStatus.closed
    ).count()
    
    # Top product interests
    from sqlalchemy import func
    top_products = db.query(
        Conversation.product_interest,
        func.count(Conversation.id).label('count')
    ).filter(
        Conversation.product_interest.isnot(None)
    ).group_by(Conversation.product_interest).order_by(desc('count')).limit(5).all()
    
    return {
        "total_conversations": total,
        "escalated": escalated,
        "live": live,
        "closed": closed,
        "top_products": [{"product": p, "count": c} for p, c in top_products]
    }

@router.get("/agents/online")
def get_online_agents(token: str, db: Session = Depends(get_db)):
    get_agent_user(token, db)
    from websocket.manager import manager
    online_ids = manager.get_online_agents()
    agents = db.query(User).filter(User.id.in_(online_ids)).all()
    return [{"id": a.id, "name": a.name} for a in agents]
