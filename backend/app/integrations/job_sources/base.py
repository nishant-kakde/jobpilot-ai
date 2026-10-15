import asyncio
import datetime
import logging
import random
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

from app.schemas.canonical_job import CanonicalJob

logger = logging.getLogger("jobpilot.adapters")

class JobSourceAdapter(ABC):
    source_name: str = "Base"
    integration_type: str = "Permitted Feed / API"
    status_label: str = "Active"
    is_automated_apply_supported: bool = False
    auth_required: bool = False
    is_enabled: bool = True
    terms_warning: Optional[str] = None

    # Rate limiting & resilience settings
    rate_limit_per_minute: int = 30
    _last_call_time: float = 0.0
    _call_lock: Optional[asyncio.Lock] = None

    # Health metrics
    last_sync_at: Optional[datetime.datetime] = None
    last_error: Optional[str] = None
    total_requests: int = 0
    failed_requests: int = 0

    def __init__(self):
        self._call_lock = asyncio.Lock()

    async def _throttle(self):
        """Enforce per-source rate limiting."""
        if not self._call_lock:
            self._call_lock = asyncio.Lock()
        async with self._call_lock:
            min_interval = 60.0 / max(self.rate_limit_per_minute, 1)
            now = asyncio.get_event_loop().time()
            elapsed = now - self._last_call_time
            if elapsed < min_interval:
                await asyncio.sleep(min_interval - elapsed)
            self._last_call_time = asyncio.get_event_loop().time()

    async def execute_with_retry(self, coro_fn, *args, max_retries: int = 3, **kwargs):
        """Executes coroutine with rate limiting and exponential backoff + jitter."""
        if not self.is_enabled:
            return None

        self.total_requests += 1
        await self._throttle()

        delay = 1.0
        for attempt in range(1, max_retries + 1):
            try:
                result = await coro_fn(*args, **kwargs)
                self.last_sync_at = datetime.datetime.now(datetime.timezone.utc)
                self.last_error = None
                return result
            except Exception as err:
                self.last_error = str(err)
                logger.warning(
                    f"[{self.source_name}] Attempt {attempt}/{max_retries} failed: {err}"
                )
                if attempt == max_retries:
                    self.failed_requests += 1
                    raise
                jitter = random.uniform(0.1, 0.5)
                await asyncio.sleep(delay + jitter)
                delay *= 2

    @abstractmethod
    async def search_jobs(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def fetch_job_details(self, job_url_or_id: str) -> Optional[Dict[str, Any]]:
        pass

    def get_health_status(self) -> Dict[str, Any]:
        status = "healthy"
        if not self.is_enabled:
            status = "disabled"
        elif self.failed_requests > 0 and self.total_requests > 0:
            error_rate = self.failed_requests / self.total_requests
            if error_rate > 0.5:
                status = "error"
            elif error_rate > 0.1:
                status = "degraded"

        return {
            "source_name": self.source_name,
            "status": status,
            "is_enabled": self.is_enabled,
            "total_requests": self.total_requests,
            "failed_requests": self.failed_requests,
            "last_sync_at": self.last_sync_at.isoformat() if self.last_sync_at else None,
            "last_error": self.last_error,
            "rate_limit_per_minute": self.rate_limit_per_minute,
        }

    def get_source_info(self) -> Dict[str, Any]:
        return {
            "source_name": self.source_name,
            "integration_type": self.integration_type,
            "status_label": self.status_label if self.is_enabled else "Disabled (ToS Restricted)",
            "is_automated_apply_supported": self.is_automated_apply_supported,
            "auth_required": self.auth_required,
            "is_enabled": self.is_enabled,
            "terms_warning": self.terms_warning,
            "health": self.get_health_status(),
        }
