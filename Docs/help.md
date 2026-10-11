# Help

## Start the app with Docker

| Platform | Start | Stop (keep data) | Stop and wipe data |
|----------|-------|------------------|--------------------|
| Windows | `scripts\start-windows.ps1` | `scripts\stop-windows.ps1` | `scripts\stop-windows-wipe-volumne.ps1` |
| Mac | `scripts/start-mac.sh` | `scripts/stop-mac.sh` | not provided |
| Linux | `scripts/start-linux.sh` | `scripts/stop-linux.sh` | not provided |

Then open http://localhost:8000.

The start script builds the image and runs it with the `prelegal-data` volume,
which holds the SQLite database. Stop scripts remove the container and image.
The wipe script also removes the volume, so the database is created fresh next time.

## Sign in

1. Open http://localhost:8000 and sign in with the admin account from `.env`.
2. The admin is created once, on a fresh database, from `SEED_USERNAME` and `SEED_PASSWORD`. Write them without quotes in `.env`, for example `SEED_USERNAME=admin`.
3. Use "Sign out" in the top bar to end the session. A session lasts one hour, then you sign in again.

The platform and the chat need a signed-in session.

### Create an account

Click "Create an account" on the sign-in page. Enter a username and a password of at least 8 characters. You are signed in straight away.

### Manage users (admin only)

The admin sees a "Users" link in the top bar. It lists every account. Use "Deactivate" to stop a user from signing in; their open session ends at once. Use "Activate" to allow them back. The admin cannot deactivate their own account.

**After upgrading from an earlier build:** the database volume from before PL-8 has no admin, and its `users` table lacks the new columns. The container now runs as a non-root user, which cannot write to a volume created by an earlier build either. Run `scripts\stop-windows-wipe-volumne.ps1` and then the start script, so the database is created fresh.

## Draft a document with Mr. Legal

Every document is a draft. The sign-in page and the top of the preview say so. Have a qualified lawyer review a document before anyone signs it.

1. Open the platform. Mr. Legal introduces itself and lists the agreements it supports.
2. Describe what you need, for example "We want an NDA with Acme Ltd for evaluating a partnership, under Delaware law."
3. Mr. Legal asks one question at a time about the next missing detail. Answer it, and the next question follows.
4. The preview on the right fills in after each answer. Download it as Markdown, or print it or save it as PDF.
5. Ask "what can you help with?" at any time to see the supported agreements.

If you ask for an agreement that is not supported, Mr. Legal asks a few questions and drafts the closest supported document. It tells you which one it chose and why, and the draft may need changes.

Refreshing the page clears the conversation. Your saved document reopens from the address (`?doc=<id>`), but the chat starts fresh.

## Saved documents

- Once Mr. Legal picks a document, it is saved to your account. It keeps saving as your answers change.
- The "My documents" panel above the chat lists your drafts, newest first. Click one to reopen it. Its details come back into the preview, and you can carry on with Mr. Legal.
- "New document" starts a blank draft. The draft you were working on is kept.
- Only you can see your drafts. The admin cannot open them.

Mr. Legal is not a lawyer and does not give legal advice.

The chat needs `OPENROUTER_API_KEY` in `.env`. The start scripts pass `.env` into the container.

## Troubleshooting

- **`docker build` fails with `UnknownIssuer` while downloading Python packages**:
  your network or antivirus re-signs HTTPS traffic with its own root certificate, and
  the build container does not trust it. Turn off HTTPS scanning for the build, or add
  the certificate to the image.
- **Cannot sign in as the admin**: check that `SEED_USERNAME` and `SEED_PASSWORD` in `.env` have no quotes, then wipe and restart (the admin is only created on a fresh database).
- **Port 8000 is busy**: stop the other process, or run the stop script first.
- **"Mr. Legal is busy right now"**: the AI provider is rate-limited. Wait a moment and send the message again.
- **Mr. Legal is unavailable**: check that `OPENROUTER_API_KEY` is set in `.env`, then restart the container with the start script.

## Run the tests in Docker

Run the backend tests in a container from the built image. The registry test also needs `catalog.json`, which the image does not contain, so mount it:

```powershell
docker run --rm --env-file .env -e RUN_LIVE_TESTS=1 `
  -v "${PWD}\backend\tests:/app/backend/tests:ro" `
  -v "${PWD}\catalog.json:/app/catalog.json:ro" prelegal `
  sh -c "uv run pytest -v -p no:cacheprovider"
```

Drop `-e RUN_LIVE_TESTS=1` to skip the two live LLM tests.
