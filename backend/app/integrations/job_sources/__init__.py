from typing import Dict, List, Any
from app.integrations.job_sources.base import JobSourceAdapter
from app.integrations.job_sources.greenhouse import GreenhouseAdapter
from app.integrations.job_sources.lever import LeverAdapter
from app.integrations.job_sources.ashby import AshbyAdapter
from app.integrations.job_sources.rss import RSSJobAdapter
from app.integrations.job_sources.email_alerts import EmailAlertsAdapter
from app.integrations.job_sources.company_career import CompanyCareerAdapter
from app.integrations.job_sources.manual_import import ManualImportAdapter
from app.integrations.job_sources.google_jobs import GoogleJobsAdapter
from app.integrations.job_sources.linkedin import LinkedInAdapter
from app.integrations.job_sources.indeed import IndeedAdapter
from app.integrations.job_sources.naukri import NaukriAdapter

adapters: Dict[str, JobSourceAdapter] = {
    # 1. Official Public Board APIs & Permitted Feeds (Enabled by default)
    "Greenhouse": GreenhouseAdapter(),
    "Lever": LeverAdapter(),
    "Ashby": AshbyAdapter(),
    "RSS Job Feeds": RSSJobAdapter(),
    "Email Alerts": EmailAlertsAdapter(),
    "Company Career Pages": CompanyCareerAdapter(),
    "Manual Import": ManualImportAdapter(),
    "Google Jobs": GoogleJobsAdapter(),

    # 2. Scraping-based adapters (Disabled by default per ToS guardrails)
    "LinkedIn": LinkedInAdapter(),
    "Indeed": IndeedAdapter(),
    "Naukri": NaukriAdapter(),
}

def get_all_adapters() -> List[Dict[str, Any]]:
    return [adapter.get_source_info() for adapter in adapters.values()]

def get_enabled_adapters() -> Dict[str, JobSourceAdapter]:
    return {name: adapter for name, adapter in adapters.items() if adapter.is_enabled}

def get_adapter(name: str) -> JobSourceAdapter:
    return adapters.get(name, adapters["Manual Import"])
