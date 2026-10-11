# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

Current state: all 11 supported documents are built. The platform is a Mr. Legal AI chat beside a live preview, and the chat fills in the document's fields. Requests for unsupported documents get limited help: Mr. Legal drafts the closest supported document. Users sign up or sign in with a one-hour session cookie. An admin seeded from `.env` manages user activation. Each user's drafts are saved and can be reopened from "My documents" (PL-8 step 3). The visual polish and the draft disclaimer are in place (PL-8 step 4). See "Implementation status" at the end of this file.

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
Use the SEED_USERNAME and SEED_PASSWORD parameters in .env file to create Admin User when the Applicataion is created for first time. *(Done: seeded when the `users` table is empty.)*  
Provision should be provided allowing for a users table with sign up and sign in. *(Done: users table, sign up, sign in, one-hour sessions, admin activate/deactivate.)*  
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

Jira and git status:
- PL-5 (Foundation V1), PL-6 (Mr. Legal for the NDA) and PL-7 (all documents) are Done. PR #8 and PR #9 are merged and closed on GitHub (merged 2026-10-11).
- PL-8 (Support Multiple Users & Final Push) is Done, split into four PRs. Step 1 (PR #10, sign-in and sessions) and step 2 (PR #11, sign-up and admin) are merged into `main` and pushed. PR #10 closed as merged on GitHub. PR #11 was merged locally (`20f9b84`) and commented, then closed on GitHub without the merged flag, because its base was the step-1 branch.
- Step 3 (saved documents, PR #12) and step 4 (visual polish and disclaimer, PR #13) are merged into `main` locally and pushed. PR #13 was commented and closed on GitHub without the merged flag, as PR #11 was. This also merged the PL-8 security review (see Built).
- Colours: `frontend/app/globals.css` defines the CLAUDE.md palette as Tailwind tokens (`text-navy`, `bg-secondary` for submit buttons, `text-primary`, `text-muted`, `accent`). The app is light-only.
- Draft disclaimer: `frontend/components/Disclaimer.tsx`, shown on the sign-in page and under the preview header, kept in printed output.

Testing: run Docker tests from a freshly built image, then stop and wipe the container, image and volume (`scripts/stop-windows-wipe-volumne.ps1`).

Built:
- **Templates (PL-2):** 12 entries in `catalog.json` cover 11 documents. The Mutual NDA is two files (cover page and standard terms).
- **Mutual NDA (PL-4):** `frontend/lib/nda.ts` builds the NDA cover page and document, unchanged in PL-7.
- **Document registry (PL-7):** `templates/documents.json` lists the 11 documents, their template files and their fields. `backend/src/prelegal_backend/documents.py` loads it, and `frontend/lib/templates.ts` reads it at build time. `frontend/lib/documents.ts` maps chat values onto each preview.
- **Platform (PL-4, PL-7):** `/platform/` is a Mr. Legal chat panel (`frontend/components/ChatPanel.tsx`) beside a preview (`frontend/components/DocumentPreview.tsx`), with `Platform.tsx` holding the state. The chat replaces the form. Users cannot edit fields by hand. `MyDocuments.tsx` lists the user's saved drafts above the chat. Opening one loads it with `?doc=<id>` in the address. `Platform.tsx` saves a draft (POST, then PUT) each time a turn picks a document, with the title from the document name and the first party's name. `PlatformShell.tsx` wraps the page: it shows the header with the signed-in username, a Users link for the admin, and Sign out, and it sends signed-out visitors to `/`.
- **Login and sign-up (PL-5, PL-8 steps 1-2):** `/` is the sign-in form (`LoginForm.tsx`). `/signup/` creates an account (`SignupForm.tsx`) and signs it in. Backend `backend/src/prelegal_backend/auth.py`:
  - Passwords are salted scrypt hashes (stdlib `hashlib.scrypt`).
  - Sessions are opaque random tokens. Only their SHA-256 is stored, in the `sessions` table, with `expires_at` one hour after sign in. The cookie is `prelegal_session`, HttpOnly, SameSite=Lax, Max-Age 3600.
  - Logout deletes the session. Deactivated accounts lose their sessions at once, because the session check also requires `is_active`.
  - Endpoints: `POST /api/auth/login`, `POST /api/auth/signup` (201; 409 if the username is taken; 422 if the password is under 8 or over 128 characters), `POST /api/auth/logout` (204), `GET /api/auth/me`.
  - The admin is seeded once from `SEED_USERNAME` / `SEED_PASSWORD` when the `users` table is empty, with `is_admin = 1`.
- **Admin (PL-8 step 2):** `backend/src/prelegal_backend/admin.py`. `GET /api/admin/users` and `PATCH /api/admin/users/{id}` (body `{isActive}`) are admin-only (403 otherwise). The admin cannot deactivate their own account (400). `/admin/` (`AdminPanel.tsx`) lists accounts with Activate and Deactivate buttons and sends non-admins to `/platform/`.
- **Foundation V1 (PL-5):** `backend/src/prelegal_backend/main.py` serves `/api/health`, the auth and admin routers, and the static frontend. `db.py` creates the `users` and `sessions` tables from scratch at `DATABASE_PATH` (default `data/prelegal.db`; Docker volume `prelegal-data` at `/app/data`). Tables are not altered, so a volume created before PL-8 must be wiped.
- **Mr. Legal chat (PL-6, PL-7):** introduces itself, lists the supported documents, asks one question per reply and fills the preview after each answer. Vague answers get a clarifying question. Replies render as Markdown. Chat history lives in the page session only. Backend `POST /api/chat` requires a signed-in session (PL-8 step 1). Requests are capped at 100 messages of 4000 characters, and `documentId` must be a supported id (422 otherwise). Earlier PL-7 Docker verification: 10 of 10 end-to-end checks and 5 of 5 three-turn NDA conversations over HTTP. One live run hit an upstream CoreWeave rate limit and returned 503; a rerun passed.
- **Docker and scripts:** two-stage Dockerfile on port 8000. The app runs as the non-root `app` user, which owns only `/app/data`. The start scripts pass `.env` into the container. Windows has start, stop and wipe scripts. Mac and Linux have start and stop only. `.env` seed values must have no quotes, because Docker `--env-file` keeps them (see `Docs/lessons-learnt.md`).
- **Saved documents (PL-8 step 3):** `backend/src/prelegal_backend/saved_documents.py`, a `documents` table (owner, document id, title, values as JSON, timestamps). `GET /api/documents` lists the user's drafts, newest first. `POST /api/documents` creates one (201). `GET /api/documents/{id}` and `PUT /api/documents/{id}` read and overwrite one. Values go through the chat's validation (`document_updates`), so unknown keys and invalid values are dropped. Drafts belong to their owner only: another user gets 404, and the admin cannot open them. Chat history is not saved. Field values are capped at 2000 characters.
- **Security review (PL-8 final, OWASP Top 10):** reviewed the whole codebase and fixed these:
  - `POST /api/chat` returned HTTP 500 (`KeyError`) when the request named an unknown `documentId` and the model chose none. The id is now validated (422).
  - Chat messages, message length, field value length and password length are now capped.
  - `session_user` and `to_session_user` no longer build the user twice.
  - The container runs as a non-root user.
  - Checked and clean: no raw HTML rendering (`react-markdown` without `rehype-raw`), no `dangerouslySetInnerHTML`, no secrets in git (`.env` is git- and Docker-ignored), `npm audit` reports 0 vulnerabilities, and all admin, draft and chat routes return 401 without a session.
- **Tests:** backend 55 unit tests on host, plus 2 live LLM tests that are skipped without `RUN_LIVE_TESTS=1`. Frontend 53 tests (`cd frontend && npm test`, Vitest, `__tests__/`).

Verified for PL-8:
- Step 1 (PR #10): sign-in, admin seed, cookie lifetime, auth on chat, logout, and sign-in after a container restart.
- Step 2 (PR #11): 15 of 15 checks over HTTP covering sign-up, admin routes, self-deactivation, deactivation ending a live session, reactivation, and the pages. The container log had no errors.
- Final (agent-browser, rebuilt non-root image, evidence in `Docs/e2e/`): admin sign-in and admin page; sign-up; a live chat turn that filled the NDA preview over two turns; the draft saved and reopened with its values; a missing `?doc=999` shows an empty platform; admin deactivation refused sign-in with "This account has been deactivated."; signed-out API calls return 401; and the input caps return 422 against the live container.

Not yet built:
- Legal review of the 10 non-NDA field lists in `templates/documents.json`. They were drafted from the template titles and need a lawyer's check.
- Mac and Linux wipe scripts.
- Mr. Legal reliability: the model sometimes skips a detail the user already gave (e.g. purpose), and it can return invalid JSON at temperature 0. Invalid JSON is not retried, so that turn fails with HTTP 500. Only rate limits are retried.
- Session cleanup: expired rows stay in the `sessions` table. They are ignored, so cleanup is not urgent.
- Login and sign-up have no rate limit (OWASP A07). Scrypt slows guessing, but a limiter is still needed before public use.
- The session cookie has no `Secure` flag, because local runs use plain HTTP. Set it once the app is served over HTTPS.
- Sign-up reveals taken usernames (409), and login answers faster for unknown usernames than for known ones. Both are small leaks.
- Docker base images and the `uv` image are not pinned to versions. Pin them before a production build.

Docs: `Docs/Readme.md` and `Docs/help.md` describe the running milestone.

