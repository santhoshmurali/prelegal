# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

Current state: all 11 supported documents are built. The platform is a Mr. Legal AI chat beside a live preview, and the chat fills in the document's fields. Requests for unsupported documents get limited help: Mr. Legal drafts the closest supported document. Fake login only, no document persistence. See "Implementation status" at the end of this file.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github MCP tools


## AI design

When writing code to make calls to LLMs, use your "coreweave-inference" skill to use LiteLLM via OpenRouter to the `openai/gpt-oss-120b` model with CoreWeave as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

Status: built for all supported documents (PL-6, PL-7). `backend/src/prelegal_backend/chat.py` calls `openai/gpt-oss-120b` via LiteLLM and OpenRouter, with CoreWeave as the only provider, and uses Structured Outputs. Reasoning effort is set in the OpenRouter request body, because LiteLLM rejects `reasoning_effort` for this model in the container. Field extraction is not reliable on every turn (see `Docs/lessons-learnt.md`).

Mr. Legal contract (`POST /api/chat`):
- Request: `{messages: [{role, content}], documentId, currentValues}`. The browser sends the full history and the current values on every turn. The backend keeps no state.
- Response: `{reply, documentId, fieldUpdates}`. `documentId` is the chosen supported document, or null. `fieldUpdates` holds only the fields that changed this turn, already validated.
- The model's prompt lists every supported document and its fields. The server drops unknown keys and checks each value against its field: fixed options, whole years, ISO dates, or clean text.
- Unsupported requests: ask questions, then choose the closest supported document and say why. The model never refuses, and never writes document text in chat.
- Upstream rate limits: LiteLLM retries 3 times. If CoreWeave still returns 429, the endpoint answers 503 with "Mr. Legal is busy right now. Please try again in a moment.", and the chat panel shows its "Mr. Legal is unavailable right now. Please try again." message.
- Env: `OPENROUTER_API_KEY` (required), `DOCUMENTS_PATH` (default `../templates/documents.json`), `DATABASE_PATH`, `STATIC_DIR`, `RUN_LIVE_TESTS=1` for the live LLM tests.

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

Jira and git status: PL-5 (Foundation V1), PL-6 (Mr. Legal for the NDA) and PL-7 (all documents) are Done. PR #8 and PR #9 are merged into `main` locally and pushed. PR #8 and #9 are still open on GitHub, since the merges were local.

Testing: run Docker tests from a freshly built image, then stop and wipe the container, image and volume (`scripts/stop-windows-wipe-volumne.ps1`).

Built:
- **Templates (PL-2):** 12 entries in `catalog.json` cover 11 documents. The Mutual NDA is two files (cover page and standard terms).
- **Mutual NDA (PL-4):** `frontend/lib/nda.ts` builds the NDA cover page and document, unchanged in PL-7.
- **Document registry (PL-7):** `templates/documents.json` lists the 11 documents, their template files and their fields. `backend/src/prelegal_backend/documents.py` loads it, and `frontend/lib/templates.ts` reads it at build time. `frontend/lib/documents.ts` maps chat values onto each preview.
- **Platform (PL-4, PL-7):** `/platform/` is a Mr. Legal chat panel (`frontend/components/ChatPanel.tsx`) beside a preview (`frontend/components/DocumentPreview.tsx`), with `Platform.tsx` holding the state. The chat replaces the form. Users cannot edit fields by hand.
- **Foundation V1 (PL-5):** fake login at `/` (`LoginForm.tsx`, no credential check, opens `/platform/`). `backend/src/prelegal_backend/main.py` serves `/api/health` and the static frontend. `db.py` creates the `users` table from scratch at `DATABASE_PATH` (default `data/prelegal.db`; Docker volume `prelegal-data` at `/app/data`).
- **Mr. Legal chat (PL-6, PL-7):** introduces itself, lists the supported documents, asks one question per reply and fills the preview after each answer. Vague answers get a clarifying question. Replies render as Markdown. Chat history lives in the page session only. Backend `POST /api/chat` (no auth yet). Verified in Docker: 10 of 10 end-to-end checks, 23 of 23 backend tests (21 unit, 2 live LLM), 38 of 38 frontend tests, and 5 of 5 three-turn NDA conversations over HTTP. One live run hit an upstream CoreWeave rate limit and returned 503; a rerun passed.
- **Docker and scripts:** two-stage Dockerfile on port 8000. The start scripts pass `.env` into the container. Windows has start, stop and wipe scripts. Mac and Linux have start and stop only.
- **Tests:** backend `cd backend && uv run pytest` (21 unit tests, LLM mocked; the registry is checked against `catalog.json`, so run in Docker with that file mounted, see `Docs/help.md`). Live LLM checks: `RUN_LIVE_TESTS=1 uv run pytest tests/test_chat_live.py` (needs `OPENROUTER_API_KEY`). Frontend `cd frontend && npm test` (Vitest, `__tests__/`).

Not yet built:
- Legal review of the 10 non-NDA field lists in `templates/documents.json`. They were drafted from the template titles and need a lawyer's check.
- Real sign up and sign in. `users.password_hash` exists but is unused.
- `SEED_USERNAME` / `SEED_PASSWORD` admin seeding.
- Document persistence.
- Mac and Linux wipe scripts.
- Mr. Legal reliability: the model sometimes skips a detail the user already gave (e.g. purpose), and it can return invalid JSON at temperature 0. Invalid JSON is not retried, so that turn fails with HTTP 500. Only rate limits are retried.
- Auth on `/api/chat`.

Docs: `Docs/Readme.md` and `Docs/help.md` describe the running milestone.

