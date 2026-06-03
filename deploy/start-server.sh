#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed."
  exit 1
fi

docker compose up -d --build
docker compose ps

echo
echo "Waiting for API health check..."
attempt=0
until curl --fail --silent http://127.0.0.1:${API_PORT:-80}/api/health; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo
    echo "API startup timed out. Run: docker compose logs api"
    exit 1
  fi
  sleep 2
done

echo
echo "BGM Player API is ready."
