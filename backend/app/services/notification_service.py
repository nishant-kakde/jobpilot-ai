import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import Notification

logger = logging.getLogger("jobpilot.notifications")

class NotificationService:
    @staticmethod
    async def create_in_app_notification(
        db: AsyncSession,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "job_match",
        link_url: Optional[str] = None
    ) -> Notification:
        """
        Creates an in-app notification record.
        """
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            link_url=link_url,
            is_read=False
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)
        return notif

    @staticmethod
    async def send_email(to_email: str, subject: str, html_body: str) -> bool:
        """
        Sends email via configured SMTP server or logs delivery.
        """
        if not settings.EMAIL_ENABLED or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.info(f"[Email Notification Demo/Logged] To: {to_email} | Subject: {subject}")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = to_email

            part = MIMEText(html_body, "html")
            msg.attach(part)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())
            return True
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            return False

    @staticmethod
    async def send_telegram_message(chat_id: str, message: str) -> bool:
        """
        Sends Telegram notification using official Bot API.
        """
        token = settings.TELEGRAM_BOT_TOKEN
        if not token or not chat_id:
            logger.info(f"[Telegram Notification Demo/Logged] ChatID: {chat_id} | Message: {message}")
            return True

        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"})
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Failed to send Telegram notification: {e}")
            return False

notification_service = NotificationService()
