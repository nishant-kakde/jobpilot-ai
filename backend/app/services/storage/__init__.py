from app.core.config import settings
from app.services.storage.base import StorageService
from app.services.storage.local_storage import LocalStorageService
from app.services.storage.s3_storage import S3StorageService

def get_storage_service() -> StorageService:
    if settings.STORAGE_BACKEND.lower() == "s3":
        return S3StorageService()
    return LocalStorageService()

storage_service = get_storage_service()
