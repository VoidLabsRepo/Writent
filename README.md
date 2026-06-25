<div align="center">

<img src="logo.svg" alt="Writent" width="400">

### *The Most Humanly AI Writer Agent*

Multi-agent AI research pipeline that writes publication-ready articles with zero AI slop.

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat&logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue)](LICENSE)

</div>

---

## What is Writent?

Writent is a multi-agent AI article writing platform. Give it a topic, and a pipeline of specialized agents researches, outlines, writes, formats, and promotes your article — all while sounding like a real person wrote it.

No "delving into", no "tapestry of", no symmetrical conclusions. Just good writing.

### Three Writing Modes

| Mode | Word Count | Research | Best For |
|------|-----------|----------|----------|
| **Casual** | 1,500–2,500 | None | Personal blog posts, opinions, experiences |
| **Serious** | 2,500–4,000 | Light (1–2 agents) | Technology deep-dives, paper summaries, focused analysis |
| **Deep Research** | 4,000–6,000 | Full (3–5 agents) | Comprehensive data-rich articles, comparisons, investigations |

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- An [OpenCode](https://opencode.ai) API key (or any OpenAI-compatible API)

### Local Setup

```bash
git clone https://github.com/VoidLabsRepo/Writent.git
cd Writent

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
playwright install chromium --with-deps
cp .env.example .env   # Add your API key
cd ..

# Frontend
cd frontend
npm install
cd ..

# Start everything
chmod +x start.sh
./start.sh
```

- **Frontend**: http://localhost:3006
- **Backend API**: http://localhost:4006
- **API Docs**: http://localhost:4006/docs

### Docker Setup

```bash
git clone https://github.com/VoidLabsRepo/Writent.git
cd Writent

# Create your env file
cp backend/.env.example .env
# Edit .env with your API key

docker compose up --build
```

- **Frontend**: http://localhost:3006
- **Backend API**: http://localhost:4006
- **API Docs**: http://localhost:4006/docs

---

## How It Works

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Input                            │
│              (topic + mode + optional instructions)       │
└──────────────────────┬──────────────────────────────────┘
                       │
           ┌───────────▼───────────┐
           │      Ideation         │  Refine topic, angle, audience
           └───────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        │         Serious/Deep        │
        ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │  Notes  │   │  Plan    │   │ Research │  3-5 parallel agents
   └────┬────┘   └────┬─────┘   └────┬─────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
           ┌───────────▼───────────┐
           │    Synthesize Findings │  Combine agent briefings
           └───────────┬───────────┘
                       │
           ┌───────────▼───────────┐
           │       Outline         │  Section-by-section structure
           └───────────┬───────────┘
                       │
           ┌───────────▼───────────┐
           │     Write Article     │  Mode-specific prompts + tone
           └───────────┬───────────┘
                       │
           ┌───────────▼───────────┐
           │      Format HTML      │  Medium-compatible output
           └───────────┬───────────┘
                       │
           ┌───────────▼───────────┐
           │    Social Media Posts  │  X, LinkedIn, Threads
           └───────────────────────┘
```

### Pipeline Steps by Mode

| Step | Casual | Serious | Deep Research |
|------|:------:|:-------:|:-------------:|
| Ideation | ✅ | ✅ | ✅ |
| Research Notes | — | ✅ | ✅ |
| Research Plan | — | ✅ | ✅ |
| Web Research (parallel agents) | — | ✅ (1–2) | ✅ (3–5) |
| Media Collection | — | — | ✅ |
| Citations | — | ✅ | ✅ |
| Outline | ✅ | ✅ | ✅ |
| Writing | ✅ | ✅ | ✅ |
| Formatting | ✅ | ✅ | ✅ |
| Social Media | ✅ | ✅ | ✅ |

### Anti-AI-Slop Prompts

Every writing mode enforces:
- No formulaic structure (varied section openings)
- No tables for 2–3 item comparisons (prose only)
- No symmetrical conclusions
- No vague attribution ("research shows..." → named sources)
- No banned AI words (delve, tapestry, leverage, ecosystem, etc.)
- Emotional range and genuine opinion

---

## Project Structure

```
writent/
├── backend/
│   ├── agents/              # Pipeline agents
│   │   ├── orchestrator.py  # Pipeline controller + step routing
│   │   ├── ideation.py      # Topic refinement
│   │   ├── notes_agent.py   # Research todo creation
│   │   ├── research_planner.py  # Research strategy
│   │   ├── researcher.py    # Web research + synthesis
│   │   ├── writer.py        # Outline + article writing
│   │   ├── formatter.py     # Markdown → Medium HTML
│   │   ├── social_media.py  # X/LinkedIn/Threads posts
│   │   ├── media_collector.py   # Image/video search
│   │   ├── citation_collector.py # Source collection
│   │   └── reviewer.py      # Quality review (unused)
│   ├── prompts/             # LLM prompt templates (per mode)
│   ├── models/              # SQLAlchemy + Pydantic schemas
│   ├── tools/               # LLM client, browser, search
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings
│   └── pyproject.toml       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # UI components
│   │   ├── hooks/           # WebSocket hook
│   │   └── lib/             # API client + types
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── start.sh
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp backend/.env.example .env
```

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `OPENCODE_API_KEY` | ✅ | — | Your OpenCode API key |
| `OPENCODE_BASE_URL` | — | `https://opencode.ai/zen/go/v1` | API base URL (works with any OpenAI-compatible endpoint) |
| `OPENCODE_MODEL` | — | `mimo-v2.5` | Primary model |
| `OPENCODE_FALLBACK_MODEL` | — | `deepseek-v4-flash` | Fallback model if primary fails |
| `DATABASE_URL` | — | `sqlite+aiosqlite:///./writent.db` | Database connection string |
| `MAX_RESEARCH_AGENTS` | — | `3` | Max parallel research agents |
| `BROWSER_TIMEOUT_MS` | — | `30000` | Browser page load timeout |
| `MAX_BROWSER_CONTEXTS` | — | `5` | Max concurrent browser contexts |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy, Pydantic |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| LLM | OpenAI-compatible API (MiMo 2.5 / DeepSeek) |
| Browser | Playwright (parallel multi-agent web browsing) |
| Search | DuckDuckGo (via ddgs) |
| Database | SQLite with WAL mode |
| Real-time | WebSocket pipeline updates |

---

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
