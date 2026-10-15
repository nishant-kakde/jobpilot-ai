from abc import ABC, abstractmethod
from typing import Optional

class StorageService(ABC):
    @abstractmethod
    async def save_file(self, content: bytes, destination_key: str, content_type: str = "application/octet-stream") -> str:
        """
        Saves file content to the storage backend.
        Returns the persistent identifier or URI / local path.
        """
        pass

    @abstractmethod
    async def get_file(self, file_key_or_path: str) -> bytes:
        """
        Retrieves file content as bytes.
        """
        pass

    @abstractmethod
    async def delete_file(self, file_key_or_path: str) -> bool:
        """
        Deletes the file from storage.
        """
        pass

    @abstractmethod
    def get_url(self, file_key_or_path: str) -> str:
        """
        Returns URL or downloadable path for the file.
        """
        pass
