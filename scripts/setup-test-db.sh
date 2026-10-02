#!/usr/bin/env bash
# Cria (se preciso), migra e popula o banco de testes. Usa TEST_DATABASE_URL ou o Postgres do docker-compose.
set -euo pipefail
cd "$(dirname "$0")/.."

URL="${TEST_DATABASE_URL:-postgres://disc:disc@localhost:5432/disc_test}"
ADMIN_URL="${URL%/*}/postgres"
DB="${URL##*/}"

if command -v psql >/dev/null 2>&1; then
  psql "$ADMIN_URL" -tc "SELECT 1 FROM pg_database WHERE datname='${DB}'" | grep -q 1 \
    || psql "$ADMIN_URL" -c "CREATE DATABASE \"${DB}\""
else
  docker compose exec -T postgres psql -U disc -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB}'" | grep -q 1 \
    || docker compose exec -T postgres psql -U disc -d postgres -c "CREATE DATABASE \"${DB}\""
fi

DATABASE_URL="$URL" pnpm --filter @disc/backend exec prisma migrate deploy

# A migration cria o papel disc_app sem login; aqui (dev/CI) damos senha a ele.
if command -v psql >/dev/null 2>&1; then
  psql "$ADMIN_URL" -c "ALTER ROLE disc_app LOGIN PASSWORD 'disc_app'"
else
  docker compose exec -T postgres psql -U disc -d postgres -c "ALTER ROLE disc_app LOGIN PASSWORD 'disc_app'"
fi

DATABASE_URL="$URL" pnpm --filter @disc/backend exec prisma db seed
