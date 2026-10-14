# JobPilot AI — System Architecture

## Overview
JobPilot AI is an autonomous, full-stack, AI-powered job search and application orchestration platform.
It bridges the gap between job discovery, explainable candidate compatibility, truth-grounded resume tailoring, and consent-gated browser autofill.

```
                      ┌───────────────────────────────────────────────┐
                      │              JobPilot AI React SPA            │
                      │ (Tailwind CSS, TypeScript, Lucide, Recharts)  │
                      └───────────────────────┬───────────────────────┘
                                              │ REST (JSON)
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │               FastAPI Backend                 │
                      │      (JWT Auth, Pydantic, Async Engine)       │
                      └──────────────┬─────────────────┬──────────────┘
                                     │                 │
              ┌──────────────────────┴──────┐   ┌──────┴──────────────────────┐
              │      Services & Adapters    │   │      Storage & Database     │
              ├─────────────────────────────┤   ├─────────────────────────────┤
              │ • AIService (Multi-Provider)│   │ • PostgreSQL / SQLite Async │
              │ • ResumeParser & Generator  │   │ • SQLAlchemy 2.0 ORM        │
              │ • JobMatcher (Weighted)     │   │ • Local File Vault (PDF)    │
              │ • AutofillService (Consent) │   │ • Redis (Background Tasks)  │
              │ • Portal Adapters (5+ APIs) │   └─────────────────────────────┘
              └─────────────────────────────┘
```

## Architectural Tenets

### 1. Strict Factual Grounding (No Hallucinations)
The verified master profile and uploaded master resumes constitute the single source of truth.
The AI tailoring engine reorganizes, emphasizes, and formats verified facts to match job descriptions, but is strictly prohibited from inventing degrees, companies, credentials, metrics, or dates.

### 2. Multi-Provider AI Abstraction Layer
The application implements an intelligent abstraction layer:
- **Built-in Intelligent Engine**: Out-of-the-box NLP heuristics, taxonomy matching, and STAR question generators that require zero external API keys.
- **OpenAI / Google Gemini / Anthropic**: Seamlessly activated when respective API keys are provided in `.env` or settings.

### 3. Consent-Gated Browser Workflow
All browser-assisted application autofill operations are modular and transparent. The system populates standard permitted fields, respects authentication gates, and **never submits any application without explicit user review and authorization**.
