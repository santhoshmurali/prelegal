# Prelegal

A platform for drafting common legal agreements.

## Layout

- `frontend/`: Next.js app, built as a static export into `frontend/out`.
- `backend/`: FastAPI app (uv project). Serves `/api/*` and the static frontend.
- `templates/`: Legal templates, and `documents.json`, the registry of supported documents and their fields.
- `scripts/`: Start and stop scripts for Docker.
- `Dockerfile`: Two stages. Builds the frontend, then runs the backend on port 8000.

## Current milestone: Multiple users, steps 1-3 of 4 (PL-8)

- Saved documents (`/api/documents`, owner-only): drafts are saved as Mr. Legal picks a document and as values change. Reopen one from "My documents" or with `/platform/?doc=<id>`.

- Sign in with a session cookie (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`). Passwords are salted scrypt hashes.
- The admin is seeded once from `SEED_USERNAME` / `SEED_PASSWORD` when the `users` table is empty.
- `POST /api/chat` requires a signed-in session.
- Sign up at `/signup/` (`POST /api/auth/signup`). New accounts are active and signed in at once.
- Admin page `/admin/` lists accounts and activates or deactivates them (`/api/admin/*`, admin only).
- Still to come: the visual polish with the disclaimer (step 4).

## Mr. Legal for all supported documents (PL-7)

- The platform is a chat with Mr. Legal beside a live preview. The chat replaces the form.
- Mr. Legal introduces itself and lists the supported documents. It picks the document from the conversation and fills in its fields as the user answers.
- Each supported document uses a shared field list in `templates/documents.json`. The Mutual NDA keeps its own cover page.
- Requests for unsupported documents get limited help: Mr. Legal asks questions and drafts the closest supported document, saying which one and why.
- Chat endpoint `POST /api/chat` calls `openai/gpt-oss-120b` on CoreWeave via OpenRouter. It needs `OPENROUTER_API_KEY` in `.env`.
- Field extraction is not reliable on every turn. See `Docs/lessons-learnt.md`.

## Foundation V1 (PL-5)

- Login at `/`. The fake login from V1 is replaced by real sign-in in PL-8.
- Temporary SQLite database, created from scratch when missing. Path set by `DATABASE_PATH`.
- Health check at `/api/health`.

## Running locally

Backend tests:

```bash
cd backend
uv run pytest
```

Backend tests in Docker, with the live LLM tests and the registry check (see `Docs/help.md`):

```powershell
docker run --rm --env-file .env -e RUN_LIVE_TESTS=1 -v "${PWD}\backend\tests:/app/backend/tests:ro" -v "${PWD}\catalog.json:/app/catalog.json:ro" prelegal sh -c "uv run pytest -v -p no:cacheprovider"
```

Live LLM tests (need `OPENROUTER_API_KEY`):

```bash
RUN_LIVE_TESTS=1 uv run pytest tests/test_chat_live.py
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
