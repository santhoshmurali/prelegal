# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

Current state: the Mutual NDA is built as a form with a floating Mr. Legal AI chat that fills it in. Fake login only, no document persistence. The other 11 document types are not yet wired up. See "Implementation status" at the end of this file.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github MCP tools


## AI design

When writing code to make calls to LLMs, use your "coreweave-inference" skill to use LiteLLM via OpenRouter to the `openai/gpt-oss-120b` model with CoreWeave as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

Status: built for the Mutual NDA (PL-6). `backend/src/prelegal_backend/chat.py` calls `openai/gpt-oss-120b` via LiteLLM and OpenRouter, with CoreWeave as the only provider, and uses Structured Outputs. Reasoning effort is set in the OpenRouter request body, because LiteLLM rejects `reasoning_effort` for this model in the container. Field extraction is not reliable on every turn (see `Docs/lessons-learnt.md`).

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite as a seperate volume and be created from scratch when the Docker container is brought up without volume.  
Use the SEED_USERNAME and SEED_PASSWORD parameters in .env file to create Admin User when the Applicataion is created for first time. *(Not yet implemented.)*  
Provision should be provided allowing for a users table with sign up and sign in. *(Users table done; sign up and sign in not yet built.)*  
The frontend is statically exported (Next.js `output: "export"`) and served by FastAPI. *(Done.)*  
There should be scripts in scripts/ for:  
```bash
# Mac (wipe script not yet provided)
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop & Delete the Image

# Linux (wipe script not yet provided)
scripts/start-linux.sh # Start
scripts/stop-linux.sh # Stop & Delete the Image

# Windows
scripts/start-windows.ps1 # Start
scripts/stop-windows.ps1 # Stop & Delete the Image
scripts/stop-windows-wipe-volumne.ps1 # Stop & Delete the Image and Volumne
```

Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation status (as of 2026-10-11)

Stack: Next.js 16.4 + React 19.3 (`frontend/`, static export), FastAPI on uv (`backend/`), SQLite, Docker.

Built:
- **Templates (PL-2):** 12 agreements in `templates/`, indexed by `catalog.json`.
- **Mutual NDA creator (PL-4):** `/platform/`. `frontend/components/NdaCreator.tsx` is the form and preview, `frontend/lib/nda.ts` builds the document, `frontend/lib/templates.ts` loads terms from `templates/` at build time.
- **Foundation V1 (PL-5):** fake login at `/` (`LoginForm.tsx`, no credential check, opens `/platform/`). `backend/src/prelegal_backend/main.py` serves `/api/health` and the static frontend. `db.py` creates the `users` table from scratch at `DATABASE_PATH` (default `data/prelegal.db`; Docker volume `prelegal-data` at `/app/data`).
- **Mr. Legal chat (PL-6):** floating chat on `/platform/`, Mutual NDA only. It asks one question per reply and fills the form after each answer. Chat history lives in the page session only. Backend `POST /api/chat/mutual-nda` (no auth yet). Verified in Docker: 7 of 7 end-to-end checks, 13 of 13 backend tests (incl. 2 live LLM tests), 38 of 38 frontend tests.
- **Docker and scripts:** two-stage Dockerfile on port 8000. The start scripts pass `.env` into the container. Windows has start, stop and wipe scripts. Mac and Linux have start and stop only.
- **Tests:** backend `cd backend && uv run pytest` (11 unit tests, LLM mocked). Live LLM checks: `RUN_LIVE_TESTS=1 uv run pytest tests/test_chat_live.py` (needs `OPENROUTER_API_KEY`). Frontend `cd frontend && npm test` (Vitest, `__tests__/`).

Not yet built:
- Mr. Legal for the other 11 document types, and help for unsupported ones.
- Real sign up and sign in. `users.password_hash` exists but is unused.
- `SEED_USERNAME` / `SEED_PASSWORD` admin seeding.
- Document persistence.
- Mac and Linux wipe scripts.
- Mr. Legal reliability: the model sometimes skips a detail the user already gave (e.g. purpose), and it can return invalid JSON at temperature 0. No retry is implemented.
- Auth on `/api/chat/mutual-nda`.

Docs: `Docs/Readme.md` and `Docs/help.md` describe the running milestone.

