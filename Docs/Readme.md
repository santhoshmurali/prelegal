# Prelegal

A platform for drafting common legal agreements.

## Layout

- `frontend/`: Next.js app, built as a static export into `frontend/out`.
- `backend/`: FastAPI app (uv project). Serves `/api/*` and the static frontend.
- `templates/`: Legal templates shared by the frontend.
- `scripts/`: Start and stop scripts for Docker.
- `Dockerfile`: Two stages. Builds the frontend, then runs the backend on port 8000.

## Current milestone: Mr. Legal chat (PL-6)

- Floating "Mr. Legal" chat on `/platform/`, scoped to the Mutual NDA.
- Mr. Legal fills the NDA form from the conversation. The preview updates live, and the form stays editable.
- Chat endpoint `POST /api/chat/mutual-nda` calls `openai/gpt-oss-120b` on CoreWeave via OpenRouter. It needs `OPENROUTER_API_KEY` in `.env`.
- Field extraction is not reliable on every turn. See `Docs/lessons-learnt.md`.

## Foundation V1 (PL-5)

- Fake login at `/`. No credentials are checked; sign in opens the platform.
- Temporary SQLite database, created from scratch when missing. Path set by `DATABASE_PATH`.
- Health check at `/api/health`.

## Running locally

Backend tests:

```bash
cd backend
uv run pytest
```

Frontend tests and build:

```bash
cd frontend
npm test
npm run build
```

Docker (see `Docs/help.md` for the steps per platform):

```powershell
scripts\start-windows.ps1
```

Open http://localhost:8000.
