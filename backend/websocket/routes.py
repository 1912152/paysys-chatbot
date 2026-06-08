from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Conversation, Message, ConversationStatus, Visitor
from websocket.manager import manager
from services.ai_service import generate_bot_response, detect_product_interest, generate_conversation_summary
from services.notification_service import notify_escalation
from sqlalchemy.sql import func
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws/visitor/{session_id}")
async def visitor_websocket(websocket: WebSocket, session_id: str, db: Session = Depends(get_db)):
    await manager.connect_visitor(websocket, session_id)
    
    # Get or create conversation
    conversation = db.query(Conversation).join(Visitor).filter(
        Visitor.session_id == session_id,
        Conversation.status != ConversationStatus.closed
    ).first()

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            msg_type = payload.get("type")

            # --- BOT CHAT ---
            if msg_type == "chat_message":
                user_message = payload.get("message", "").strip()
                if not user_message:
                    continue

                # Save visitor message
                if conversation:
                    db_msg = Message(
                        conversation_id=conversation.id,
                        sender="visitor",
                        content=user_message
                    )
                    db.add(db_msg)
                    db.commit()

                # If conversation is in live mode, route to agent
                if conversation and conversation.status == ConversationStatus.live:
                    agent_id = manager.get_agent_for_conversation(conversation.id)
                    if agent_id:
                        await manager.send_to_agent(agent_id, {
                            "type": "visitor_message",
                            "conversation_id": conversation.id,
                            "session_id": session_id,
                            "message": user_message
                        })
                    continue

                # Get bot response
                history = []
                if conversation:
                    msgs = db.query(Message).filter(
                        Message.conversation_id == conversation.id
                    ).order_by(Message.created_at).all()
                    history = [{"role": "user" if m.sender == "visitor" else "assistant", "content": m.content} for m in msgs[:-1]]

                bot_response, should_escalate, sources = generate_bot_response(user_message, history, db)

                # Save bot message
                if conversation:
                    bot_msg = Message(
                        conversation_id=conversation.id,
                        sender="bot",
                        content=bot_response,
                        metadata={"sources": [s["source_name"] for s in sources]}
                    )
                    db.add(bot_msg)
                    db.commit()

                # Send response to visitor
                await manager.send_to_visitor(session_id, {
                    "type": "bot_response",
                    "message": bot_response,
                    "should_escalate": should_escalate
                })

            # --- ESCALATION ---
            elif msg_type == "escalate":
                lead_data = payload.get("lead", {})
                
                if not conversation:
                    continue

                # Update visitor info
                visitor = db.query(Visitor).filter(Visitor.session_id == session_id).first()
                if visitor:
                    visitor.name = lead_data.get("name", visitor.name)
                    visitor.email = lead_data.get("email", visitor.email)
                    visitor.phone = lead_data.get("phone", visitor.phone)
                    visitor.company = lead_data.get("company", visitor.company)

                # Detect product interest
                msgs = db.query(Message).filter(Message.conversation_id == conversation.id).all()
                history = [{"role": m.sender, "content": m.content} for m in msgs]
                product_interest = detect_product_interest(history)
                
                if visitor:
                    visitor.product_interest = product_interest
                
                conversation.status = ConversationStatus.escalated
                conversation.product_interest = product_interest
                conversation.escalated_at = func.now()

                # Generate summary
                summary = generate_conversation_summary(history)
                conversation.summary = summary
                db.commit()

                # Notify all online agents via WebSocket
                await manager.broadcast_to_all_agents({
                    "type": "new_escalation",
                    "conversation_id": conversation.id,
                    "visitor": {
                        "name": lead_data.get("name"),
                        "email": lead_data.get("email"),
                        "company": lead_data.get("company"),
                        "product_interest": product_interest
                    },
                    "summary": summary
                })

                # Send WhatsApp + Email notification
                notify_escalation(
                    {**lead_data, "product_interest": product_interest},
                    summary
                )

                await manager.send_to_visitor(session_id, {
                    "type": "escalation_confirmed",
                    "message": "Our team has been notified. An agent will be with you shortly!"
                })

            # --- VISITOR INIT ---
            elif msg_type == "init":
                # Create visitor + conversation if not exists
                visitor = db.query(Visitor).filter(Visitor.session_id == session_id).first()
                if not visitor:
                    visitor = Visitor(session_id=session_id)
                    db.add(visitor)
                    db.commit()
                    db.refresh(visitor)
                
                if not conversation:
                    conversation = Conversation(visitor_id=visitor.id)
                    db.add(conversation)
                    db.commit()
                    db.refresh(conversation)

                await manager.send_to_visitor(session_id, {
                    "type": "ready",
                    "conversation_id": conversation.id
                })

    except WebSocketDisconnect:
        manager.disconnect_visitor(session_id)
    except Exception as e:
        logger.error(f"Visitor WS error: {e}")
        manager.disconnect_visitor(session_id)


@router.websocket("/ws/agent/{agent_id}")
async def agent_websocket(websocket: WebSocket, agent_id: str, db: Session = Depends(get_db)):
    await manager.connect_agent(websocket, agent_id)
    
    # Mark agent online
    from db.models import User
    agent = db.query(User).filter(User.id == agent_id).first()
    if agent:
        agent.is_online = True
        db.commit()

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            msg_type = payload.get("type")

            # --- AGENT TAKES CONVERSATION ---
            if msg_type == "take_conversation":
                conv_id = payload.get("conversation_id")
                conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
                
                if conversation:
                    conversation.status = ConversationStatus.live
                    conversation.assigned_agent_id = agent_id
                    db.commit()
                    manager.assign_agent_to_conversation(conv_id, agent_id)

                    # Get visitor session
                    visitor = db.query(Visitor).filter(Visitor.id == conversation.visitor_id).first()
                    
                    if visitor:
                        await manager.send_to_visitor(visitor.session_id, {
                            "type": "agent_joined",
                            "message": f"You're now connected with a Paysys Labs representative. How can I help you?"
                        })
                    
                    await manager.send_to_agent(agent_id, {
                        "type": "conversation_taken",
                        "conversation_id": conv_id
                    })

            # --- AGENT SENDS MESSAGE ---
            elif msg_type == "agent_message":
                conv_id = payload.get("conversation_id")
                message = payload.get("message", "").strip()
                
                if not message or not conv_id:
                    continue

                # Save message
                db_msg = Message(
                    conversation_id=conv_id,
                    sender="agent",
                    content=message
                )
                db.add(db_msg)
                db.commit()

                # Get visitor session_id
                conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
                if conversation:
                    visitor = db.query(Visitor).filter(Visitor.id == conversation.visitor_id).first()
                    if visitor:
                        await manager.send_to_visitor(visitor.session_id, {
                            "type": "agent_message",
                            "message": message
                        })

            # --- CLOSE CONVERSATION ---
            elif msg_type == "close_conversation":
                conv_id = payload.get("conversation_id")
                conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
                if conversation:
                    conversation.status = ConversationStatus.closed
                    conversation.closed_at = func.now()
                    db.commit()
                    
                    visitor = db.query(Visitor).filter(Visitor.id == conversation.visitor_id).first()
                    if visitor:
                        await manager.send_to_visitor(visitor.session_id, {
                            "type": "conversation_closed",
                            "message": "Thank you for contacting Paysys Labs. Have a great day!"
                        })

    except WebSocketDisconnect:
        manager.disconnect_agent(agent_id)
        if agent:
            agent.is_online = False
            db.commit()
    except Exception as e:
        logger.error(f"Agent WS error: {e}")
        manager.disconnect_agent(agent_id)
        if agent:
            agent.is_online = False
            db.commit()
