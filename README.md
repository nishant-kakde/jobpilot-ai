# JobPilot AI — Autonomous AI Job Search & Career Automation Platform

JobPilot AI is a production-ready, full-stack career acceleration platform designed to assist job seekers across every step of their career journey: finding matching opportunities across global and regional job boards, evaluating explainable compatibility scores, generating truthfully tailored ATS-compliant resumes and cover letters, interactive mock interview practice with STAR framework evaluation, personalized 30/60/90-day learning roadmaps, and consent-gated application tracking through an 11-stage pipeline.

---

## 🌟 Key Capabilities & Modules

### 1. Unified Multi-Provider AI Architecture (`backend/app/ai/`)
- **Multi-Provider Abstraction**: Switch seamlessly between **OpenAI** (GPT-4o, GPT-4o-mini, o1-mini), **Google Gemini** (Gemini 1.5 Flash, Pro), **Anthropic Claude** (Claude 3.5 Haiku, Sonnet), and the **Built-in Heuristic Engine** (zero external key required, offline-capable).
- **Strict Anti-Hallucination Guard**: The candidate's verified profile is the single source of truth. Never fabricates employers, titles, degrees, certifications, or metrics.
- **Structured Schema Validation**: Pydantic v2 structured output validation with automated JSON repair.
- **Token Telemetry & Cost Accounting**: Live token tracking and USD cost calculations persisted in generation logs.
- **Embeddings & Vector Search**: 128-dimensional cosine similarity vectorizer and document ranking engine.

### 2. Specialized Autonomous AI Agents
- **`JobDiscoveryAgent`**: Extracts required/preferred skills, experience years, work mode, and key takeaways from raw job descriptions.
- **`JobMatchingAgent`**: Computes transparent, explainable 5-factor compatibility scores:
  - Skills (35%)
  - Experience (25%)
  - Education (15%)
  - Location (15%)
  - Preferences (10%)
- **`ResumeAgent`**: ATS keyword optimization, action-verb enhancement, and truth-preserving bullet rewriting.
- **`CoverLetterAgent`**: Personalized company cover letters with selectable tone (Professional, Conversational, Enthusiastic, Executive).
- **`CareerAdvisorAgent`**: Multi-turn persistent career counselor anchored in verified profile credentials and target job context.
- **`InterviewAgent`**: Question generation and real-time STAR framework answer evaluation.
- **`ApplicationAgent`**: Consent-gated field mapping and screening answer suggestions.

### 3. Interactive Mock Interview Studio
- Interactive practice studio for Technical, Behavioral, Situational, and HR rounds.
- Real-time scoring on technical accuracy, communication clarity, and STAR method compliance.
- Provides immediate constructive feedback, improvement areas, and improved model answers.

### 4. Personalized 30/60/90-Day AI Career Roadmaps
- Input current skills and target role (e.g. Data Analyst, Machine Learning Engineer, Senior Full-Stack).
- Generates critical skill gap analysis, weekly study plans, milestone deliverables, and portfolio project suggestions.
- Interactive progress slider allowing candidates to track readiness over time.

### 5. Natural Language Semantic Job Search & Recommendations
- Search jobs naturally: *"Find remote Python jobs requiring SQL and Power BI"*.
- AI Profile Recommendations ranked using verified candidate profile telemetry.

### 6. Document Generation & ATS Optimization
- Clean exports in standard **PDF** (via ReportLab) and **DOCX** (via python-docx).
- Professional ATS-friendly styling, custom contact headers, and skill categorization.

### 7. Application Pipeline Tracker & Autofill Assistant
- 11-stage application pipeline: Saved, Interested, Preparing, Ready to Apply, Applied, Assessment, Interview, Shortlisted, Offer, Rejected, Withdrawn.
- Kanban board, Table view, timeline audit logs, and CSV export.
- Consent-gated browser autofill helper requiring explicit confirmation prior to recording submission.

### 8. AI Provider Configuration & Usage Telemetry
- Configure LLM backend, active models, and securely store AES-256 encrypted custom API keys.
- Real-time dashboard showing total calls, tokens consumed, estimated cost ($ USD), and module breakdown.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, Uvicorn
- **Database**: SQLite (Zero-config local development) / PostgreSQL (Production)
- **Document Generation**: ReportLab (ATS PDF) & python-docx (DOCX)
- **AI Engine**: Modular AI Orchestrator supporting OpenAI, Gemini, Claude, and Built-in Heuristics
- **Migrations**: Alembic with full version history
- **Containerization**: Docker & Docker Compose

---

## 🚀 Quick Start Guide

### 1. Backend Setup

```bash
cd backend

# Option A: Run directly with Python virtual environment
.\.venv\Scripts\activate   # Windows
# source .venv/bin/activate # Linux/macOS

# Run FastAPI with Uvicorn
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

The database automatically initializes a rich, verified demonstration account:
- **Email**: `demo@jobpilot.ai`
- **Password**: `password123`

---

## 🧪 Testing & Verification

Run the comprehensive pytest suite covering auth, parsing, matching, tailoring, mock interview studio, roadmaps, semantic search, and API integration:

```bash
cd backend
python -m pytest tests/ -v
# Result: 32 passed in ~12 seconds
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
| `OPENAI_API_KEY` | OpenAI API key (optional) | None |
| `OPENAI_MODEL` | OpenAI model override | `gpt-4o-mini` |
| `GEMINI_API_KEY` | Google Gemini API key (optional) | None |
| `GEMINI_MODEL` | Google Gemini model override | `gemini-1.5-flash` |
| `ANTHROPIC_API_KEY`| Anthropic Claude API key (optional) | None |
| `ANTHROPIC_MODEL` | Anthropic Claude model override | `claude-3-5-haiku-20241022` |
| `REDIS_URL` | Redis broker URL for async queue | `redis://localhost:6379/0` (Optional) |
| `EMAIL_ENABLED` | SMTP email notifications | `false` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot alerts | Optional |

See `.env.example` for all optional and required settings.

---

## 🛡️ Architectural Guardrails

1. **Anti-Hallucination Policy**: The candidate's master profile and verified resume are the single source of truth. Under no circumstance does the AI invent degrees, companies, credentials, projects, or metrics.
2. **Consent-Gated Automation**: All browser autofill workflows require explicit candidate review and approval before any submission is recorded.
3. **No CAPTCHA / Anti-Bot Bypassing**: JobPilot AI complies with site security policies. It will never attempt to bypass CAPTCHA, Cloudflare challenges, or portal MFA. Universal Manual Import is provided for restricted portals.
4. **Transparent Compatibility**: Compatibility scoring is computed deterministically using the weighted 5-factor model, not fabricated by LLMs.
