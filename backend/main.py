from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from db.database import create_tables
from api.routes import auth, knowledge, leads
from websocket.routes import router as ws_router
from core.config import settings
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Paysys Labs Chatbot API",
    version="1.0.0",
    description="AI-powered chatbot with live agent escalation"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins() + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(knowledge.router)
app.include_router(leads.router)
app.include_router(ws_router)

# Serve uploaded files
os.makedirs("./uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="./uploads"), name="uploads")

@app.on_event("startup")
async def startup():
    logger.info("Starting Paysys Chatbot API...")
    create_tables()
    await create_default_admin()
    logger.info("Ready!")

async def create_default_admin():
    """Create default admin if no users exist"""
    from db.database import SessionLocal
    from db.models import User, UserRole
    from core.auth import hash_password
    
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            admin = User(
                name="Paysys Admin",
                email="admin@paysyslabs.com",
                password_hash=hash_password("Admin@123"),
                role=UserRole.admin
            )
            db.add(admin)
            db.commit()
            logger.info("Default admin created: admin@paysyslabs.com / Admin@123")
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "name": "Paysys Labs Chatbot API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

# Widget.js endpoint - serves the embeddable script
@app.get("/widget.js", response_class=HTMLResponse)
def widget_script():
    script = f"""
(function() {{
    var script = document.createElement('script');
    script.src = '{settings.frontend_url}/widget/bundle.js';
    document.head.appendChild(script);
    
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '{settings.frontend_url}/widget/style.css';
    document.head.appendChild(link);
    
    window.PaysysChat = {{
        apiUrl: '{os.getenv("API_URL", "http://localhost:8000")}',
        wsUrl: '{os.getenv("WS_URL", "ws://localhost:8000")}'
    }};
}})();
"""
    return HTMLResponse(content=script, media_type="application/javascript")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
