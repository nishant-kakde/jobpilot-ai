from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class JobSourceAdapter(ABC):
    source_name: str = "Base"
    integration_type: str = "Permitted Feed / API"
    status_label: str = "Active"
    is_automated_apply_supported: bool = False
    auth_required: bool = False

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

    def get_source_info(self) -> Dict[str, Any]:
        return {
            "source_name": self.source_name,
            "integration_type": self.integration_type,
            "status_label": self.status_label,
            "is_automated_apply_supported": self.is_automated_apply_supported,
            "auth_required": self.auth_required
        }
