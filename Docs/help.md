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

## Chat with Mr. Legal

1. Open the platform and click **Chat with Mr. Legal** in the bottom-right corner.
2. Describe the deal in your own words, for example "We want an NDA with Acme Ltd for evaluating a partnership, under Delaware law."
3. Mr. Legal replies with a numbered list of the details it still needs. Answer them in one message.
4. The form and preview update as Mr. Legal fills in fields. Edit any field by hand at any time.
5. Refreshing the page clears the conversation. The form values are kept only while the page stays open.

Mr. Legal is not a lawyer and does not give legal advice. It only helps with the Mutual NDA.

The chat needs `OPENROUTER_API_KEY` in `.env`. The start scripts pass `.env` into the container.

## Troubleshooting

- **`docker build` fails with `UnknownIssuer` while downloading Python packages**:
  your network or antivirus re-signs HTTPS traffic with its own root certificate, and
  the build container does not trust it. Turn off HTTPS scanning for the build, or add
  the certificate to the image.
- **Port 8000 is busy**: stop the other process, or run the stop script first.
