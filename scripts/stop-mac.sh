#!/usr/bin/env bash
# Stops the Prelegal container and deletes the image. The data volume is kept.
set -euo pipefail

IMAGE_NAME="prelegal"
CONTAINER_NAME="prelegal"

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker rmi "$IMAGE_NAME" >/dev/null 2>&1 || true

echo "Prelegal stopped. Image removed, data volume kept."
