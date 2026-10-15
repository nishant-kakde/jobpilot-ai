import os
import aiofiles
from app.core.config import settings
from app.services.storage.base import StorageService

class LocalStorageService(StorageService):
    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve_path(self, file_key_or_path: str) -> str:
        if os.path.isabs(file_key_or_path):
            return file_key_or_path
        return os.path.join(self.base_dir, file_key_or_path)

    async def save_file(self, content: bytes, destination_key: str, content_type: str = "application/octet-stream") -> str:
        target_path = self._resolve_path(destination_key)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(content)
        return target_path

    async def get_file(self, file_key_or_path: str) -> bytes:
        target_path = self._resolve_path(file_key_or_path)
        if not os.path.exists(target_path):
            raise FileNotFoundError(f"File not found: {target_path}")
        with open(target_path, "rb") as f:
            return f.read()

    async def delete_file(self, file_key_or_path: str) -> bool:
        target_path = self._resolve_path(file_key_or_path)
        if os.path.exists(target_path):
            os.remove(target_path)
            return True
        return False

    def get_url(self, file_key_or_path: str) -> str:
        return self._resolve_path(file_key_or_path)
