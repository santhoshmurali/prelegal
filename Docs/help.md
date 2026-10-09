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

## Troubleshooting

- **`docker build` fails with `UnknownIssuer` while downloading Python packages**:
  your network or antivirus re-signs HTTPS traffic with its own root certificate, and
  the build container does not trust it. Turn off HTTPS scanning for the build, or add
  the certificate to the image.
- **Port 8000 is busy**: stop the other process, or run the stop script first.
