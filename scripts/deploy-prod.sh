#!/usr/bin/env bash
# deploy-prod.sh — 手动部署生产环境到 jimmyuser2
# 用法: ./scripts/deploy-prod.sh [--skip-tests] [--skip-build]
set -euo pipefail

PROD_HOST="172.30.115.33"
PROD_USER="jimmyuser2"
PROD_DIR="mfs-prod"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

SKIP_TESTS=false
SKIP_BUILD=false
for arg in "$@"; do
    case $arg in
        --skip-tests) SKIP_TESTS=true ;;
        --skip-build) SKIP_BUILD=true ;;
    esac
done

log() { echo "[DEPLOY] $(date '+%H:%M:%S') $*"; }

cd "$PROJECT_DIR"

# --- E2E Tests ---
if [ "$SKIP_TESTS" = false ]; then
    log "Running E2E tests against test environment (localhost:4201)..."
    docker run --rm --network host \
        -v "$(pwd)/e2e:/app" \
        -w /app \
        -e BASE_URL=http://localhost:4201 \
        mcr.microsoft.com/playwright:v1.52.0-noble \
        bash -c "npm ci && npx playwright test"
    log "E2E tests passed."
else
    log "Skipping tests (--skip-tests)."
fi

# --- Build ---
if [ "$SKIP_BUILD" = false ]; then
    log "Building production images..."
    docker compose -f docker-compose.prod.yml build
    log "Build complete."
else
    log "Skipping build (--skip-build)."
fi

# --- DB Migration ---
MIGRATION_FILES=$(ls db/migrations/*.sql 2>/dev/null | sort || true)
if [ -n "$MIGRATION_FILES" ]; then
    log "Running database migrations..."
    for f in $MIGRATION_FILES; do
        log "  Applying: $f"
        scp "$f" "${PROD_USER}@${PROD_HOST}:/tmp/"
        ssh "${PROD_USER}@${PROD_HOST}" \
            "source ~/${PROD_DIR}/.env && docker exec -i mfs-prod-mysql mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" student_db < /tmp/$(basename "$f") && rm /tmp/$(basename "$f")"
    done
    log "Migrations applied."
else
    log "No migrations to apply."
fi

# --- Transfer & Deploy ---
log "Transferring images to production..."
docker save mfs-prod-api mfs-prod-web | ssh "${PROD_USER}@${PROD_HOST}" docker load

log "Restarting services..."
ssh "${PROD_USER}@${PROD_HOST}" "cd ~/${PROD_DIR} && docker compose up -d"

sleep 10
log "Service status:"
ssh "${PROD_USER}@${PROD_HOST}" "cd ~/${PROD_DIR} && docker compose ps"

log "✅ Deployment complete!"
