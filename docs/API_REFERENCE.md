# JobPilot AI — REST API Reference

The FastAPI backend exposes fully documented REST endpoints compliant with OpenAPI 3.0 / Swagger.
Interactive documentation is available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

All requests accept and return the correlation header `X-Request-ID`.

## Authentication & Security
- `POST /api/auth/register` — Register new user account; returns access token and refresh token. (Rate limit: 10/min)
- `POST /api/auth/login` — Login with email/password; returns access token and refresh token. (Rate limit: 15/min)
- `POST /api/auth/refresh` — Rotate refresh token; returns new access token and rotated refresh token.
- `POST /api/auth/logout` — Revoke active refresh token.
- `GET /api/auth/me` — Return authenticated user profile.

## Master Profile Management
- `GET /api/profile` — Fetch verified master profile with nested skills, experiences, educations, projects. (PII fields transparently decrypted)
- `PUT /api/profile` — Update candidate contact info, preferences, and summary. (Phone and location encrypted at rest)
- `POST /api/profile/skills` — Add verified skill.
- `DELETE /api/profile/skills/{id}` — Delete skill.
- `POST /api/profile/experiences` — Add work experience entry.
- `DELETE /api/profile/experiences/{id}` — Delete work experience entry.
- `POST /api/profile/educations` — Add education entry.
- `DELETE /api/profile/educations/{id}` — Delete education entry.

## Master Resumes & AI Tailoring
- `POST /api/resumes/upload` — Upload PDF/DOCX master resume, parse text into structured entities, persist via `StorageService` (Local or S3).
- `GET /api/resumes` — List uploaded master resumes.
- `POST /api/resumes/tailor` — Generate job-specific tailored resume (rewritten summary, keyword coverage, ATS scoring).
- `GET /api/resumes/versions` — List tailored resume versions.
- `GET /api/resumes/versions/{id}` — Get tailored version details and ATS breakdown.
- `PUT /api/resumes/versions/{id}` — Edit tailored resume content and regenerate documents.
- `GET /api/resumes/versions/{id}/download?format=pdf|docx` — Download compiled PDF or DOCX file.
- `DELETE /api/resumes/{id}` — Delete master resume, purging file from `StorageService` and logging audit event.

## Job Discovery, Adapters & Analysis
- `GET /api/jobs` — Search and filter jobs with keyword, source, work mode, and min match score. Includes `source_urls`, `is_ghost_job`, `ghost_job_reasons`, and `repost_count`.
- `GET /api/jobs/{id}` — Get job details with deep analysis and explainable compatibility breakdown.
- `POST /api/jobs/import` — Import job from URL or pasted description text.
- `POST /api/jobs/{id}/save` — Save/bookmark job.
- `DELETE /api/jobs/{id}/save` — Unsave job.
- `POST /api/jobs/{id}/analyze` — Deep analyze job description.
- `POST /api/jobs/{id}/match` — Calculate multi-criteria explainable compatibility score.
- `GET /api/jobs/sources/adapters` — List registered portal adapters (Greenhouse, Lever, Ashby, RSS, Email Alerts, etc.) with health status, ToS guardrails, and rate limit settings.

## Cover Letters & Screening Q&A
- `POST /api/cover-letters/generate` — Generate tailored cover letter grounded in verified master profile.
- `GET /api/cover-letters` — List generated cover letters.
- `POST /api/applications/questions/generate` — Generate suggested answers to common screening questions.
- `PUT /api/applications/questions/{id}` — Edit user answer.

## Browser-Assisted Autofill & Tracker
- `POST /api/autofill/prepare` — Map candidate data into standard web form field structure.
- `POST /api/autofill/execute` — Execute permitted autofill step or record explicit user approval.
- `GET /api/applications` — List applications across all 11 pipeline statuses.
- `POST /api/applications` — Create new tracked application.
- `PUT /api/applications/{id}` — Update stage, notes, follow-up dates (auto-logs audit event).
- `GET /api/applications/export/csv` — Export complete application history as CSV.

## Background Automation & Scheduled Sweeps
- `POST /api/scheduled/trigger?sync=true|false` — Trigger job sweep and interview/follow-up reminders. When `sync=false`, queues task via ARQ on Redis.

## Interview Preparation & Analytics
- `GET /api/interviews` — List scheduled interview rounds.
- `POST /api/interviews` — Schedule interview round and auto-generate preparation checklist & STAR questions.
- `POST /api/interviews/{id}/generate-prep` — Regenerate interview questions.
- `POST /api/assistant/career` — Conversational AI Career Copilot.
- `GET /api/dashboard/stats` — Platform metrics, weekly activity, and funnel conversions.
- `GET /api/settings/export-data` — GDPR/CCPA data export bundle.
- `GET /api/health` — Platform health, active adapters count, storage backend, and rate limiter status.
