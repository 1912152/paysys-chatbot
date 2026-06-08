from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from db.database import get_db
from db.models import KnowledgeSource, BotOverride, User
from services.rag_engine import (
    add_to_knowledge_base, remove_from_knowledge_base,
    extract_text_from_pdf, extract_text_from_docx,
    extract_text_from_url, get_knowledge_stats
)
from core.auth import decode_token
import aiofiles
import os
import uuid

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])
UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_admin_user(token: str, db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def process_source_background(source_id: str, text: str, source_name: str, source_type: str, db_url: str):
    """Background task to process and index content"""
    from db.database import SessionLocal
    from db.models import KnowledgeSource
    db = SessionLocal()
    try:
        chunk_count = add_to_knowledge_base(text, source_id, source_name, source_type)
        source = db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
        if source:
            source.status = "active"
            source.chunk_count = chunk_count
            db.commit()
    except Exception as e:
        source = db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
        if source:
            source.status = "failed"
            db.commit()
    finally:
        db.close()

@router.post("/upload-file")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    token: str = Form(...),
    db: Session = Depends(get_db)
):
    admin = get_admin_user(token, db)
    
    if not file.filename.endswith(('.pdf', '.docx', '.txt')):
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, TXT files allowed")
    
    source_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{source_id}_{file.filename}")
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Extract text based on file type
    if file.filename.endswith('.pdf'):
        text = extract_text_from_pdf(file_path)
        source_type = "pdf"
    elif file.filename.endswith('.docx'):
        text = extract_text_from_docx(file_path)
        source_type = "docx"
    else:
        text = content.decode('utf-8')
        source_type = "txt"
    
    # Save to DB
    source = KnowledgeSource(
        id=source_id,
        name=file.filename,
        source_type=source_type,
        source_path=file_path,
        status="processing",
        added_by=admin.id
    )
    db.add(source)
    db.commit()
    
    # Process in background
    background_tasks.add_task(
        process_source_background, source_id, text, file.filename, source_type, ""
    )
    
    return {"message": "File uploaded and processing", "source_id": source_id}

@router.post("/add-url")
async def add_url(
    background_tasks: BackgroundTasks,
    url: str,
    token: str,
    db: Session = Depends(get_db)
):
    admin = get_admin_user(token, db)
    
    source_id = str(uuid.uuid4())
    
    try:
        title, text = extract_text_from_url(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch URL: {str(e)}")
    
    source = KnowledgeSource(
        id=source_id,
        name=title,
        source_type="url",
        source_path=url,
        status="processing",
        added_by=admin.id
    )
    db.add(source)
    db.commit()
    
    background_tasks.add_task(
        process_source_background, source_id, text, title, "url", ""
    )
    
    return {"message": "URL added and processing", "source_id": source_id, "title": title}

@router.get("/sources")
def get_sources(token: str, db: Session = Depends(get_db)):
    get_admin_user(token, db)
    sources = db.query(KnowledgeSource).order_by(KnowledgeSource.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "source_type": s.source_type,
            "source_path": s.source_path,
            "status": s.status,
            "chunk_count": s.chunk_count,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in sources
    ]

@router.delete("/sources/{source_id}")
def delete_source(source_id: str, token: str, db: Session = Depends(get_db)):
    get_admin_user(token, db)
    source = db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    remove_from_knowledge_base(source_id)
    db.delete(source)
    db.commit()
    return {"message": "Source deleted"}

@router.get("/stats")
def get_stats(token: str, db: Session = Depends(get_db)):
    get_admin_user(token, db)
    stats = get_knowledge_stats()
    source_count = db.query(KnowledgeSource).filter(KnowledgeSource.status == "active").count()
    return {**stats, "active_sources": source_count}

# --- BOT OVERRIDES ---
class OverrideCreate(BaseModel):
    trigger_phrase: str
    response: str

@router.post("/overrides")
def create_override(body: OverrideCreate, token: str, db: Session = Depends(get_db)):
    admin = get_admin_user(token, db)
    override = BotOverride(
        trigger_phrase=body.trigger_phrase,
        response=body.response,
        created_by=admin.id
    )
    db.add(override)
    db.commit()
    return {"message": "Override created", "id": override.id}

@router.get("/overrides")
def get_overrides(token: str, db: Session = Depends(get_db)):
    get_admin_user(token, db)
    overrides = db.query(BotOverride).order_by(BotOverride.created_at.desc()).all()
    return [
        {
            "id": o.id,
            "trigger_phrase": o.trigger_phrase,
            "response": o.response,
            "is_active": o.is_active,
            "created_at": o.created_at.isoformat() if o.created_at else None
        }
        for o in overrides
    ]

@router.put("/overrides/{override_id}")
def update_override(override_id: str, body: OverrideCreate, token: str, db: Session = Depends(get_db)):
    get_admin_user(token, db)
    override = db.query(BotOverride).filter(BotOverride.id == override_id).first()
    if not override:
        raise HTTPException(status_code=404, detail="Override not found")
    override.trigger_phrase = body.trigger_phrase
    override.response = body.response
    db.commit()
    return {"message": "Override updated"}

@router.delete("/overrides/{override_id}")
def delete_override(override_id: str, token: str, db: Session = Depends(get_db)):
    get_admin_user(token, db)
    override = db.query(BotOverride).filter(BotOverride.id == override_id).first()
    if not override:
        raise HTTPException(status_code=404, detail="Override not found")
    db.delete(override)
    db.commit()
    return {"message": "Override deleted"}
