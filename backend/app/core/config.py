import os
from typing import Optional, List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "JobPilot AI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Security & PII Encryption
    SECRET_KEY: str = "jobpilot_super_secret_jwt_key_change_in_production_987654321"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    PII_ENCRYPTION_KEY: str = "v4kPZ4_JjMhQpT8nO2_s-UaX1f8wR-6vK9yE0zL_3pA="  # 32-url-safe base64 Fernet key

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./jobpilot.db"

    # Task Queue (Redis & ARQ)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage Interface
    STORAGE_BACKEND: str = "local"  # 'local' or 's3'
    S3_ENDPOINT_URL: Optional[str] = None
    S3_BUCKET_NAME: str = "jobpilot-vault"
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_REGION: str = "us-east-1"

    # Observability
    SENTRY_DSN: Optional[str] = None
    LOG_FORMAT: str = "console"  # 'console' or 'json'

    # Legal Data Discovery & Scraping Guardrails
    ENABLE_SCRAPING_SOURCES: bool = False
    GHOST_JOB_THRESHOLD_DAYS: int = 45
    GHOST_JOB_REPOST_THRESHOLD: int = 3
    RATE_LIMIT_DEFAULT: str = "60/minute"

    # AI Configuration
    AI_PROVIDER: str = "built-in"  # built-in, openai, gemini, anthropic
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-5-haiku-20241022"

    # Uploads & Storage
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    EXPORTS_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "exports")

    # Notifications
    EMAIL_ENABLED: bool = False
    EMAIL_PROVIDER: str = "smtp"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "notifications@jobpilot.ai"
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None

    # Playwright
    PLAYWRIGHT_HEADLESS: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure storage directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORTS_DIR, exist_ok=True)
