from pydantic_settings import BaseSettings
from typing import List
import json
import os

class Settings(BaseSettings):
    # AI
    groq_api_key: str = ""
    openai_api_key: str = ""
    ai_provider: str = "groq"
    ai_model: str = "llama-3.3-70b-versatile"

    # Database
    database_url: str = "sqlite:///./paysys_chatbot.db"

    # ChromaDB
    chroma_persist_dir: str = "./chroma_db"

    # Auth
    secret_key: str = "change-this-secret-key-in-production"
    access_token_expire_minutes: int = 1440

    # Notifications
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = ""
    agent_whatsapp_number: str = ""

    # Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    agent_email: str = ""

    # App
    app_name: str = "Paysys Chatbot"
    frontend_url: str = "http://localhost:3000"
    allowed_origins: str = '["http://localhost:3000","http://localhost:5173"]'

    def get_allowed_origins(self) -> List[str]:
        try:
            return json.loads(self.allowed_origins)
        except:
            return ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
