# JobPilot AI — System Architecture

## Overview
JobPilot AI is an autonomous, full-stack, AI-powered job search and application orchestration platform.
It bridges the gap between job discovery, explainable candidate compatibility, truth-grounded resume tailoring, and consent-gated browser autofill.

```
                      ┌───────────────────────────────────────────────┐
                      │          JobPilot AI Progressive Web App      │
                      │ (React 19, TypeScript, Lucide, Recharts, PWA) │
                      └───────────────────────┬───────────────────────┘
                                              │ REST (JSON) + X-Request-ID
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │               FastAPI Backend                 │
                      │  (JWT + Refresh Tokens, Rate Limiter, Async)  │
                      └──────────────┬─────────────────┬──────────────┘
                                     │                 │
              ┌──────────────────────┴──────┐   ┌──────┴──────────────────────┐
              │      Services & Adapters    │   │      Storage & Database     │
              ├─────────────────────────────┤   ├─────────────────────────────┤
              │ • AIService (Multi-Provider)│   │ • PostgreSQL / SQLite Async │
              │ • CanonicalJob Normalizer   │   │ • Alembic Database Migration│
              │ • Deduplication & Ghost-Job │   │ • Field-Level Fernet PII    │
              │ • StorageService (Local/S3) │   │ • AuditLog Table            │
              │ • Task Queue (ARQ on Redis) │   │ • Redis Task Broker         │
              │ • Public Board Adapters     │   └─────────────────────────────┘
              │   (Greenhouse, Lever, Ashby,│
              │    RSS Feeds, Email Alerts) │
              └─────────────────────────────┘
```

---

## Architectural Tenets & Engineering Hardening

### 1. Reliable & Legal Data Sourcing
- **Official Public Board APIs**: Dedicated modular adapters for **Greenhouse**, **Lever**, and **Ashby** using their public job-board JSON endpoints.
- **Alternative Feeds**: Universal **RSS / Atom feed ingestion** and candidate **Email Alert parsing**.
- **ToS Guardrails**: Scraping-based adapters (LinkedIn, Indeed, Naukri) are **disabled by default** with explicit terms-of-service warnings in configuration and UI.
- **Canonical Schema**: All incoming opportunities pass through `CanonicalJob` normalization (HTML stripping, work mode harmonization, UTC date parsing).
- **Deduplication Engine**:
  - Exact match via normalized canonical hashes (`title|company|location`).
  - Fuzzy match using string similarity (token sequence ratios).
  - Multi-source merging: Retains a single master job record preserving all discovered `source_urls`.
- **Ghost-Job & Repost Detection**: Flags postings older than `GHOST_JOB_THRESHOLD_DAYS` (default: 45 days) or reposted repetitively without updates (`repost_count >= 3`), providing transparent reasoning tags.

### 2. Security & Data Protection
- **Field-Level PII Encryption**: Sensitive user data (`phone`, `current_city`, and resume `raw_text`) is transparently encrypted at rest using Fernet encryption (`PII_ENCRYPTION_KEY`).
- **Token Security**: Dual-token authentication with 60-minute JWT access tokens and 7-day revolving refresh tokens (`POST /api/auth/refresh`), automatically revoking old tokens on use.
- **Audit Logging**: A centralized `AuditLog` table records security and data operations (`auth.login`, `auth.refresh`, `resume.delete`, `auth.logout`).
- **Endpoint Rate Limiting**: Managed via `slowapi` with per-endpoint thresholds on authentication and file uploads.
- **Abstract File Storage**: Storage operations route through `StorageService`, supporting both `LocalStorageService` (zero-config local dev) and `S3StorageService` (AWS S3, MinIO, Cloudflare R2).

### 3. Background Task Queue & Observability
- **ARQ Task Worker**: Scheduled search sweeps and notification dispatches run as background tasks via ARQ on Redis, with an automatic in-process fallback executor for local development.
- **Correlation Tracking**: `RequestCorrelationMiddleware` attaches an `X-Request-ID` header to all HTTP requests and responses.
- **Structured Observability**: Structured JSON logging formatter (`StructuredJsonFormatter`) and seamless Sentry error monitoring.

### 4. Progressive Web App (PWA)
- Standard Web App Manifest (`manifest.webmanifest`) and Service Worker (`sw.js`) enabling installability, offline static asset caching, and standalone desktop/mobile app experience.
