import base64
import logging
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings

logger = logging.getLogger("jobpilot.encryption")

class PIIEncryptionService:
    def __init__(self, key: Optional[str] = None):
        key = key or settings.PII_ENCRYPTION_KEY
        # Ensure key is valid 32-byte urlsafe base64
        try:
            # If key cannot be directly used, ensure valid Fernet key
            self._fernet = Fernet(key.encode("utf-8") if isinstance(key, str) else key)
        except Exception:
            # Derive deterministic 32-byte key from whatever string was given
            derived = base64.urlsafe_b64encode(key.encode("utf-8").ljust(32)[:32])
            self._fernet = Fernet(derived)

    def encrypt(self, plain_text: Optional[str]) -> Optional[str]:
        if plain_text is None:
            return None
        if not plain_text:
            return ""
        try:
            encrypted_bytes = self._fernet.encrypt(plain_text.encode("utf-8"))
            return encrypted_bytes.decode("utf-8")
        except Exception as e:
            logger.error(f"Encryption failure: {e}")
            return plain_text

    def decrypt(self, cipher_text: Optional[str]) -> Optional[str]:
        if cipher_text is None:
            return None
        if not cipher_text:
            return ""
        try:
            decrypted_bytes = self._fernet.decrypt(cipher_text.encode("utf-8"))
            return decrypted_bytes.decode("utf-8")
        except (InvalidToken, Exception):
            # Gracefully handle unencrypted legacy data during migration
            return cipher_text

encryption_service = PIIEncryptionService()
