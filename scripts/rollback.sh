#!/bin/bash
# ==============================================================================
# KGC ERP v7.0 - Rollback Script
# Epic 33-6: Simple CI/CD (ADR-045)
# ==============================================================================
#
# Usage:
#   ./scripts/rollback.sh [staging|production]
#
# Rolls back to the most recent backup on the server.
#
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-staging}"

# Server configuration
STAGING_SERVER="${STAGING_SERVER:-deploy@staging.kgc.hu}"
STAGING_PATH="${STAGING_PATH:-/opt/kgc-erp}"

PRODUCTION_SERVER="${PRODUCTION_SERVER:-deploy@app.kgc.hu}"
PRODUCTION_PATH="${PRODUCTION_PATH:-/opt/kgc-erp}"

if [[ "$ENVIRONMENT" == "production" ]]; then
    SERVER="$PRODUCTION_SERVER"
    DEPLOY_PATH="$PRODUCTION_PATH"
    DEPLOY_HOST="app.kgc.hu"
    COMPOSE_FILES="docker-compose.yml -f docker-compose.prod.yml"
    ENV_FILE=".env.prod"
else
    SERVER="$STAGING_SERVER"
    DEPLOY_PATH="$STAGING_PATH"
    DEPLOY_HOST="staging.kgc.hu"
    COMPOSE_FILES="docker-compose.yml"
    ENV_FILE=".env.staging"
fi

echo -e "${YELLOW}==================================================${NC}"
echo -e "${YELLOW}KGC ERP Rollback - $ENVIRONMENT${NC}"
echo -e "${YELLOW}==================================================${NC}"

# Find latest backup
echo -e "${YELLOW}Finding latest backup...${NC}"
LATEST_BACKUP=$(ssh "$SERVER" "cd $DEPLOY_PATH && ls -td backup-* 2>/dev/null | head -1")

if [[ -z "$LATEST_BACKUP" ]]; then
    echo -e "${RED}ERROR: No backup found on server${NC}"
    exit 1
fi

echo -e "Rolling back to: ${GREEN}$LATEST_BACKUP${NC}"

# Confirm rollback for production
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${RED}WARNING: You are about to rollback PRODUCTION${NC}"
    echo -e "${YELLOW}NOTE: Database migrations are NOT rolled back automatically.${NC}"
    echo -e "${YELLOW}If migrations ran, you may need to manually rollback the database.${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Rollback cancelled."
        exit 0
    fi
fi

# Perform rollback
echo -e "${YELLOW}Performing rollback...${NC}"
ssh "$SERVER" "cd $DEPLOY_PATH && \
    rm -rf current && \
    cp -r '$LATEST_BACKUP' current && \
    cd current/infra/docker/full-stack && \
    docker compose -f $COMPOSE_FILES --env-file $ENV_FILE up -d"

# Health check
echo -e "${YELLOW}Running health check...${NC}"
sleep 10

# Use HTTPS for production, HTTP for staging
# Health endpoint: /api/v1/health (consistent with Dockerfile and docker-compose)
if [[ "$ENVIRONMENT" == "production" ]]; then
    HEALTH_URL="https://$DEPLOY_HOST/api/v1/health"
else
    HEALTH_URL="http://$DEPLOY_HOST:3000/api/v1/health"
fi

if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}Rollback successful! Health check passed.${NC}"
else
    echo -e "${RED}WARNING: Health check failed after rollback${NC}"
    echo -e "${YELLOW}Manual intervention may be required${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}Rollback complete!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "Environment: $ENVIRONMENT"
echo -e "Restored from: $LATEST_BACKUP"
echo -e "Time: $(date '+%Y-%m-%d %H:%M:%S')"
