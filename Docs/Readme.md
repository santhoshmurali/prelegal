# Prelegal

A platform for drafting common legal agreements.

## Layout

- `frontend/`: Next.js app, built as a static export into `frontend/out`.
- `backend/`: FastAPI app (uv project). Serves `/api/*` and the static frontend.
- `templates/`: Legal templates shared by the frontend.
- `scripts/`: Start and stop scripts for Docker.
- `Dockerfile`: Two stages. Builds the frontend, then runs the backend on port 8000.

## Current milestone: Foundation V1 (PL-5)

- Fake login at `/`. No credentials are checked; sign in opens the platform.
- Platform at `/platform/` (the Mutual NDA creator, unchanged).
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
