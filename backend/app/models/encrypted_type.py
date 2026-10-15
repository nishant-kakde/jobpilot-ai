from sqlalchemy.types import TypeDecorator, String, Text
from app.core.encryption import encryption_service

class EncryptedString(TypeDecorator):
    """
    SQLAlchemy TypeDecorator that encrypts strings before persisting to the DB
    and decrypts upon retrieval.
    """
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return encryption_service.encrypt(value)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return encryption_service.decrypt(value)
        return None

class EncryptedText(TypeDecorator):
    """
    SQLAlchemy TypeDecorator that encrypts text blocks (e.g. resume raw_text)
    before persisting to the DB and decrypts upon retrieval.
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return encryption_service.encrypt(value)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return encryption_service.decrypt(value)
        return None
