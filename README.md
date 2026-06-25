# Writent

Multi-agent AI article writer. Researches, writes, reviews, and formats publication-ready articles with zero AI slop.

## Quick Start

```bash
chmod +x start.sh
./start.sh
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Architecture

```
User Input → Ideation → Parallel Research (3-5 agents) → Media + Citations
    → Writer Agent → Review Agent → Formatter → Social Media Posts → Done
```

- **Backend**: Python + FastAPI + LangGraph
- **Frontend**: Next.js + React + Tailwind
- **LLM**: OpenCode Go API (MiMo 2.5)
- **Browser**: Playwright (parallel multi-agent web browsing)
- **Database**: SQLite (crash-recoverable pipeline state)

## Pipeline Steps

1. **Ideation** — Refine topic and angle
2. **Research** — 3 agents browse from different angles simultaneously
3. **Media** — Find images and videos
4. **Citations** — Collect all sources
5. **Outline** — Structure the article
6. **Writing** — Write the full article (anti-AI-slop enforced)
7. **Review** — Quality check with auto-revision (max 2 retries)
8. **Formatting** — Medium-ready HTML
9. **Social Media** — X/Twitter, LinkedIn, Threads posts

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp backend/.env.example backend/.env
# Edit with your OpenCode Go API key
```

| Variable | Description |
|----------|-------------|
| `OPENCODE_API_KEY` | Your OpenCode Go API key |
| `OPENCODE_BASE_URL` | API base URL (default: `https://opencode.ai/zen/go/v1`) |
| `OPENCODE_MODEL` | Model ID (default: `mimo-v2.5`) |
| `DATABASE_URL` | SQLite database path |
