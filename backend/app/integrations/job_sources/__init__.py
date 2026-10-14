from typing import Dict, List, Any
from app.integrations.job_sources.base import JobSourceAdapter
from app.integrations.job_sources.linkedin import LinkedInAdapter
from app.integrations.job_sources.indeed import IndeedAdapter
from app.integrations.job_sources.naukri import NaukriAdapter
from app.integrations.job_sources.google_jobs import GoogleJobsAdapter
from app.integrations.job_sources.company_career import CompanyCareerAdapter
from app.integrations.job_sources.manual_import import ManualImportAdapter

adapters: Dict[str, JobSourceAdapter] = {
    "LinkedIn": LinkedInAdapter(),
    "Indeed": IndeedAdapter(),
    "Naukri": NaukriAdapter(),
    "Google Jobs": GoogleJobsAdapter(),
    "Company Career Pages": CompanyCareerAdapter(),
    "Manual Import": ManualImportAdapter(),
}

def get_all_adapters() -> List[Dict[str, Any]]:
    return [adapter.get_source_info() for adapter in adapters.values()]

def get_adapter(name: str) -> JobSourceAdapter:
    return adapters.get(name, adapters["Manual Import"])
