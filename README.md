# JobPilot AI — Autonomous AI Job Search & Application Platform

JobPilot AI is a production-ready, full-stack web application designed to help job seekers find matching opportunities across global and regional job boards, evaluate explainable compatibility scores, generate truthfully tailored ATS-compliant resumes and cover letters, assist with application autofill under explicit user consent, and track applications through an 11-stage pipeline.

---

## 🌟 Key Features

1. **User Authentication & Profile Management**: Secure JWT authentication, password hashing, and master profile management with contact info, compensation preferences, and work modes.
2. **Master Resume Upload & Parsing**: Secure PDF/DOCX upload and automated structured entity extraction.
3. **Multi-Source Job Adapters**: Modular integration adapters for LinkedIn, Indeed, Naukri, Google Jobs, Company Career Pages (Greenhouse, Lever, Workday), and universal Manual Import.
4. **Explainable AI Job Matching**: Weighted 5-criteria compatibility score (Skills 35%, Experience 25%, Education 15%, Location 15%, Preferences 10%) with transparent gap explanations.
5. **Job Description Analyzer**: Deep extractor for required/preferred skills, technical keywords, soft skills, and responsibilities.
6. **AI Resume Tailoring Engine (Highest Priority)**: Rewrites summaries, prioritizes verified skills, polishes bullet points with natural keywords, computes ATS readability scores, and exports clean PDF and DOCX documents (`Data_Analyst_Company_Resume.pdf`).
7. **Strict Factual Guardrails**: Master profile is the sole source of truth — never hallucinates degrees, companies, credentials, or metrics.
8. **Cover Letter Generator**: Job-specific personalized letters with selectable tone.
9. **Screening Question Assistant**: Generates structured answers to common screening questions (STAR method) while flagging sensitive eligibility queries for manual confirmation.
10. **Browser-Assisted Autofill Assistant**: Safe form field mapping with mandatory user review and explicit consent before recording submission.
11. **Application Pipeline Tracker**: Complete 11-stage pipeline (Saved, Interested, Preparing, Ready to Apply, Applied, Assessment, Interview, Shortlisted, Offer, Rejected, Withdrawn) with Kanban and Table views, timeline audit logs, and CSV export.
12. **Interview Preparation Assistant**: Schedules interview rounds, generates custom HR, Technical, and Behavioral questions with talking points, and provides interactive checklists.
13. **AI Career Copilot**: Real-time conversational counselor anchored in user telemetry and active job context.
14. **Dashboard & Analytics**: Real-time KPI cards, weekly application cadence, source distribution, match score distributions, and funnel conversions.
15. **Daily Search Automation**: Scheduled search sweeps across job portals with in-app, email, and Telegram alerts.
16. **Privacy & GDPR Compliance**: Full personal data export bundle (JSON) and permanent account erasure.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, Uvicorn
- **Database**: SQLite (Zero-config local development) / PostgreSQL (Production)
- **Document Generation**: ReportLab (ATS PDF) & python-docx (DOCX)
- **AI Engine**: Multi-provider abstraction layer (Built-in Intelligent Engine, OpenAI GPT-4o, Google Gemini, Anthropic Claude)
- **Containerization**: Docker & Docker Compose

---

## 🚀 Quick Start Guide

### 1. Backend Setup

```bash
cd backend

# Option A: Run directly with Python
python -m uvicorn app.main:app --reload --port 8000

# Interactive API Swagger Documentation
# Open: http://localhost:8000/docs
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Open: http://localhost:5173
```

### 3. Demo Credentials

The system automatically initializes a rich, verified demonstration account:
- **Email**: `demo@jobpilot.ai`
- **Password**: `password123`

---

## 🧪 Testing & Verification

Run the comprehensive pytest suite covering auth, parsing, matching, tailoring, document generation, and API integration:

```bash
cd backend
python -m pytest tests/ -v
# Result: 15 passed in ~5 seconds
```

Run frontend production build verification:

```bash
cd frontend
npm run build
# Result: tsc -b && vite build completed with 0 errors
```

---

## ⚙️ Configuration (.env)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SECRET_KEY` | JWT signing key | Pre-configured dev key |
| `DATABASE_URL` | Database connection string | `sqlite+aiosqlite:///./jobpilot.db` |
| `AI_PROVIDER` | AI provider (`built-in`, `openai`, `gemini`, `anthropic`) | `built-in` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | Optional |
| `GEMINI_API_KEY` | Google Gemini API key (if using Gemini) | Optional |
| `ANTHROPIC_API_KEY`| Anthropic Claude API key (if using Claude) | Optional |
| `REDIS_URL` | Redis broker URL for async queue | `redis://localhost:6379/0` (Optional) |
| `EMAIL_ENABLED` | SMTP email notifications | `false` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot alerts | Optional |

See `.env.example` for all optional and required settings.

---

## 🛡️ Architectural Guardrails & Current Limitations

1. **Anti-Hallucination Policy**: The candidate's master profile and verified resume are the single source of truth. Under no circumstance does the AI invent degrees, companies, credentials, projects, or metrics.
2. **Consent-Gated Automation**: All browser autofill workflows require explicit candidate review and approval before any submission is recorded. Unverified outcomes remain flagged as *Pending Verification*.
3. **No CAPTCHA / Anti-Bot Bypassing**: JobPilot AI complies with site security policies. It will never attempt to bypass CAPTCHA, Cloudflare challenges, or portal MFA. When automated access is constrained, the Universal Manual Import or direct portal launchpad is used.
4. **Third-Party Job Portal Rates**: Live search depends on public feeds and supported APIs. Portal rate-limits are handled with graceful fallback and cached listings.

---

## 🐳 Docker Deployment

To launch the complete containerized stack (PostgreSQL, Redis, FastAPI backend, and Nginx frontend):

```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API & Swagger: `http://localhost:8000/docs`

