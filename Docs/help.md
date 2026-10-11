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

Any username and password opens the platform. Sign-in is a placeholder in V1.

## Draft a document with Mr. Legal

1. Open the platform. Mr. Legal introduces itself and lists the agreements it supports.
2. Describe what you need, for example "We want an NDA with Acme Ltd for evaluating a partnership, under Delaware law."
3. Mr. Legal asks one question at a time about the next missing detail. Answer it, and the next question follows.
4. The preview on the right fills in after each answer. Download it as Markdown, or print it or save it as PDF.
5. Ask "what can you help with?" at any time to see the supported agreements.

If you ask for an agreement that is not supported, Mr. Legal asks a few questions and drafts the closest supported document. It tells you which one it chose and why, and the draft may need changes.

Refreshing the page clears the conversation and the preview.

Mr. Legal is not a lawyer and does not give legal advice.

The chat needs `OPENROUTER_API_KEY` in `.env`. The start scripts pass `.env` into the container.

## Troubleshooting

- **`docker build` fails with `UnknownIssuer` while downloading Python packages**:
  your network or antivirus re-signs HTTPS traffic with its own root certificate, and
  the build container does not trust it. Turn off HTTPS scanning for the build, or add
  the certificate to the image.
- **Port 8000 is busy**: stop the other process, or run the stop script first.
