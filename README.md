# Paysys Labs AI Chatbot System

Complete AI chatbot with RAG knowledge base, live agent escalation, admin panel, and embeddable widget.

---

## System Overview

| Panel | URL | Who Uses It |
|-------|-----|-------------|
| Chat Widget | Embedded on paysyslabs.com | Website Visitors |
| Admin Panel | /admin | Content Manager |
| Agent Panel | /agent | Sales Team (5 agents) |

---

## Quick Start (Local)

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env — add your GROQ_API_KEY
pip install -r requirements.txt
python main.py
```

Backend runs at: http://localhost:8000
API Docs: http://localhost:8000/docs

### 2. Seed Paysys Knowledge Base

```bash
cd backend
python seed_knowledge.py
```

This fetches all 18 Paysys pages and loads them into ChromaDB.

### 3. Run Frontend Apps

```bash
# Widget (port 3000)
cd frontend/widget && npm install && npm start

# Admin Panel (port 3001)
cd frontend/admin && npm install && PORT=3001 npm start

# Agent Panel (port 3002)
cd frontend/agent && npm install && PORT=3002 npm start
```

### 4. Docker (All at once)

```bash
docker-compose up --build
```

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@paysyslabs.com | Admin@123 |
| Agent 1 | agent1@paysyslabs.com | Agent@123 |
| Agent 2 | agent2@paysyslabs.com | Agent@123 |

**Change these immediately in production!**

---

## Railway Deployment (Free MVP)

### Step 1 — Deploy Backend

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `backend` folder
3. Add these environment variables in Railway dashboard:

```
GROQ_API_KEY=your_key_here
AI_PROVIDER=groq
AI_MODEL=llama-3.3-70b-versatile
SECRET_KEY=generate-a-random-32-char-string
DATABASE_URL=sqlite:///./paysys_chatbot.db
ALLOWED_ORIGINS=["https://paysyslabs.com","https://your-frontend-url.railway.app"]
```

4. Railway gives you a URL like: `https://paysys-bot-backend.railway.app`

### Step 2 — Deploy Frontends

Deploy each frontend folder separately on Railway (or Vercel/Netlify):

For each frontend, set:
```
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_WS_URL=wss://your-backend.railway.app
```

### Step 3 — Seed Knowledge Base

After backend is live:
```bash
cd backend
# Update .env with Railway DATABASE_URL if using Postgres
python seed_knowledge.py
```

Or call the API directly to add URLs via Admin Panel.

---

## WordPress Embed

Add this single line before `</body>` in your WordPress theme footer:

```html
<script src="https://your-backend.railway.app/widget.js"></script>
```

**WordPress Steps:**
1. Appearance → Theme Editor → footer.php
2. Paste the script tag before `</body>`
3. Save — chat bubble appears immediately

---

## Adding Content (Admin Panel)

1. Login at `/admin` with admin credentials
2. **Add URL** — paste any Paysys product page URL → auto-scraped
3. **Upload File** — drag & drop PDF or DOCX
4. **Bot Overrides** — set exact responses for specific questions

---

## Switching AI Model (Groq → GPT-4o-mini)

In `.env`:
```
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=your_key
```

Cost comparison:
- Groq (free tier): Rs. 0/month — for MVP
- GPT-4o-mini: ~Rs. 1,200/month — for production

---

## Project Structure

```
paysys-chatbot/
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── db/
│   │   ├── models.py              # All DB tables
│   │   └── database.py            # DB connection
│   ├── core/
│   │   ├── config.py              # Settings
│   │   └── auth.py                # JWT auth
│   ├── services/
│   │   ├── ai_service.py          # AI + RAG logic
│   │   ├── rag_engine.py          # ChromaDB operations
│   │   └── notification_service.py # WhatsApp + Email
│   ├── websocket/
│   │   ├── manager.py             # WS connection manager
│   │   └── routes.py              # WS endpoints
│   ├── api/routes/
│   │   ├── auth.py                # Login endpoints
│   │   ├── knowledge.py           # KB management
│   │   └── leads.py               # Leads + conversations
│   └── seed_knowledge.py          # One-time KB seeder
│
├── frontend/
│   ├── widget/                    # Embeddable chat bubble
│   ├── admin/                     # Knowledge base manager
│   └── agent/                     # Live chat panel
│
└── docker-compose.yml
```
