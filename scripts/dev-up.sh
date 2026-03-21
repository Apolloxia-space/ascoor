#!/usr/bin/env bash
set -euo pipefail

# Local dev helper: rebuild containers, apply Prisma migrations, show status.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="docker compose"

if [[ "${1:-}" != "--skip-build" ]]; then
  $COMPOSE -f "${ROOT_DIR}/docker-compose.yml" build --progress quiet
fi

$COMPOSE -f "${ROOT_DIR}/docker-compose.yml" up -d

$COMPOSE -f "${ROOT_DIR}/docker-compose.yml" exec -T api sh -c '
  timeout=300
  elapsed=0
  while [ "$elapsed" -lt "$timeout" ]; do
    if [ -x node_modules/.bin/prisma ] && [ -f node_modules/prisma/package.json ]; then
      exit 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo "Timed out waiting for Prisma to be installed in api container." >&2
  echo "Check api container logs for npm install failures." >&2
  exit 1
'

$COMPOSE -f "${ROOT_DIR}/docker-compose.yml" exec -T api npx prisma migrate deploy
