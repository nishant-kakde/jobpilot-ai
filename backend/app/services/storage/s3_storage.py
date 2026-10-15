import os
import logging
from typing import Optional
from app.core.config import settings
from app.services.storage.base import StorageService
from app.services.storage.local_storage import LocalStorageService

logger = logging.getLogger("jobpilot.storage.s3")

class S3StorageService(StorageService):
    def __init__(self):
        self.bucket = settings.S3_BUCKET_NAME
        self.local_fallback = LocalStorageService()
        self._s3_client = None

        if settings.S3_ACCESS_KEY_ID and settings.S3_SECRET_ACCESS_KEY:
            try:
                import boto3
                self._s3_client = boto3.client(
                    "s3",
                    endpoint_url=settings.S3_ENDPOINT_URL,
                    aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                    region_name=settings.S3_REGION,
                )
            except Exception as e:
                logger.warning(f"Could not initialize S3 client: {e}. Falling back to local storage.")
                self._s3_client = None

    async def save_file(self, content: bytes, destination_key: str, content_type: str = "application/octet-stream") -> str:
        if self._s3_client:
            try:
                self._s3_client.put_object(
                    Bucket=self.bucket,
                    Key=destination_key,
                    Body=content,
                    ContentType=content_type,
                )
                return f"s3://{self.bucket}/{destination_key}"
            except Exception as e:
                logger.error(f"S3 put_object failed: {e}. Falling back to local storage.")

        return await self.local_fallback.save_file(content, destination_key, content_type)

    async def get_file(self, file_key_or_path: str) -> bytes:
        if self._s3_client and file_key_or_path.startswith("s3://"):
            try:
                key = file_key_or_path.replace(f"s3://{self.bucket}/", "")
                response = self._s3_client.get_object(Bucket=self.bucket, Key=key)
                return response["Body"].read()
            except Exception as e:
                logger.error(f"S3 get_object failed: {e}")

        return await self.local_fallback.get_file(file_key_or_path)

    async def delete_file(self, file_key_or_path: str) -> bool:
        if self._s3_client and file_key_or_path.startswith("s3://"):
            try:
                key = file_key_or_path.replace(f"s3://{self.bucket}/", "")
                self._s3_client.delete_object(Bucket=self.bucket, Key=key)
                return True
            except Exception as e:
                logger.error(f"S3 delete_object failed: {e}")

        return await self.local_fallback.delete_file(file_key_or_path)

    def get_url(self, file_key_or_path: str) -> str:
        if self._s3_client and file_key_or_path.startswith("s3://"):
            key = file_key_or_path.replace(f"s3://{self.bucket}/", "")
            return self._s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=3600,
            )
        return self.local_fallback.get_url(file_key_or_path)
