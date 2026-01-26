#!/bin/bash
# ==============================================================================
# KGC ERP v7.0 - Production Deploy Script
# Epic 33-6: Simple CI/CD (ADR-045)
# ==============================================================================
#
# Usage:
#   ./scripts/deploy.sh [staging|production] [commit-sha]
#
# Prerequisites:
#   - SSH key configured for target server
#   - Docker and Docker Compose installed on target
#   - Environment file exists on target server
#
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
COMMIT_SHA="${2:-$(git rev-parse HEAD)}"
SHORT_SHA="${COMMIT_SHA:0:7}"

# Server configuration (override via environment variables)
STAGING_SERVER="${STAGING_SERVER:-deploy@staging.kgc.hu}"
STAGING_PATH="${STAGING_PATH:-/opt/kgc-erp}"
STAGING_HOST="${STAGING_HOST:-staging.kgc.hu}"

PRODUCTION_SERVER="${PRODUCTION_SERVER:-deploy@app.kgc.hu}"
PRODUCTION_PATH="${PRODUCTION_PATH:-/opt/kgc-erp}"
PRODUCTION_HOST="${PRODUCTION_HOST:-api.kgc.hu}"

# Select server based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    SERVER="$PRODUCTION_SERVER"
    DEPLOY_PATH="$PRODUCTION_PATH"
    DEPLOY_HOST="$PRODUCTION_HOST"
    COMPOSE_FILES="docker-compose.yml -f docker-compose.prod.yml"
    ENV_FILE=".env.prod"
else
    SERVER="$STAGING_SERVER"
    DEPLOY_PATH="$STAGING_PATH"
    DEPLOY_HOST="$STAGING_HOST"
    COMPOSE_FILES="docker-compose.yml"
    ENV_FILE=".env.staging"
fi

echo -e "${YELLOW}==================================================${NC}"
echo -e "${YELLOW}KGC ERP Deploy - $ENVIRONMENT${NC}"
echo -e "${YELLOW}==================================================${NC}"
echo -e "Server: ${GREEN}$SERVER${NC}"
echo -e "Path: ${GREEN}$DEPLOY_PATH${NC}"
echo -e "Commit: ${GREEN}$SHORT_SHA${NC}"
echo ""

# Pre-deploy checks
echo -e "${YELLOW}[1/6] Running pre-deploy checks...${NC}"

# Check if we can SSH to the server
if ! ssh -o ConnectTimeout=5 "$SERVER" "echo 'SSH OK'" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to $SERVER${NC}"
    exit 1
fi
echo -e "${GREEN}SSH connection OK${NC}"

# Backup current version
echo -e "${YELLOW}[2/6] Creating backup on server...${NC}"
ssh "$SERVER" "cd $DEPLOY_PATH && \
    if [ -d 'current' ]; then \
        BACKUP_NAME=\"backup-\$(date +%Y%m%d-%H%M%S)\"; \
        cp -r current \"\$BACKUP_NAME\"; \
        echo \"Backup created: \$BACKUP_NAME\"; \
    fi"

# Sync files to server
echo -e "${YELLOW}[3/6] Syncing files to server...${NC}"
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'coverage' \
    --exclude '*.log' \
    --exclude '.env*' \
    --exclude 'dist' \
    ./ "$SERVER:$DEPLOY_PATH/current/"

# Build and deploy on server
echo -e "${YELLOW}[4/6] Building and deploying on server...${NC}"
ssh "$SERVER" "cd $DEPLOY_PATH/current/infra/docker/full-stack && \
    docker compose -f $COMPOSE_FILES --env-file $ENV_FILE pull && \
    docker compose -f $COMPOSE_FILES --env-file $ENV_FILE build --no-cache kgc-api kgc-web && \
    docker compose -f $COMPOSE_FILES --env-file $ENV_FILE up -d"

# Run database migrations
echo -e "${YELLOW}[5/6] Running database migrations...${NC}"
ssh "$SERVER" "cd $DEPLOY_PATH/current/infra/docker/full-stack && \
    docker compose -f $COMPOSE_FILES --env-file $ENV_FILE exec -T kgc-api npx prisma migrate deploy || true"

# Health check
echo -e "${YELLOW}[6/6] Running health checks...${NC}"
sleep 10  # Wait for services to start

# Use HTTPS for production, HTTP for staging
if [[ "$ENVIRONMENT" == "production" ]]; then
    HEALTH_URL="https://$DEPLOY_HOST/health"
else
    HEALTH_URL="http://$DEPLOY_HOST:3000/api/health"
fi

MAX_RETRIES=5
RETRY_COUNT=0
while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}Health check passed!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Health check failed, retrying ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 5
done

if [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; then
    echo -e "${RED}WARNING: Health check failed after $MAX_RETRIES attempts${NC}"
    echo -e "${YELLOW}Rolling back to previous version...${NC}"
    ./scripts/rollback.sh "$ENVIRONMENT"
    exit 1
fi

# Tag successful deployment
echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}Deploy successful!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "Environment: $ENVIRONMENT"
echo -e "Commit: $SHORT_SHA"
echo -e "Time: $(date '+%Y-%m-%d %H:%M:%S')"

# Create deployment tag
git tag -f "deploy-$ENVIRONMENT-$SHORT_SHA" "$COMMIT_SHA" 2>/dev/null || true

exit 0
