#!/usr/bin/env bash
# Builds the image and starts the Prelegal container on http://localhost:8000.
set -euo pipefail

IMAGE_NAME="prelegal"
CONTAINER_NAME="prelegal"
VOLUME_NAME="prelegal-data"

cd "$(dirname "$0")/.."

docker build -t "$IMAGE_NAME" .
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER_NAME" -p 8000:8000 -v "$VOLUME_NAME:/app/data" "$IMAGE_NAME" >/dev/null

echo "Prelegal is running at http://localhost:8000"
