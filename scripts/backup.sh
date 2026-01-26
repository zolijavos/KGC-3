#!/bin/bash
# ==============================================================================
# KGC ERP v7.0 - Database Backup Script
# Epic 33-5: Production Setup (ADR-045)
# ==============================================================================
#
# Usage:
#   ./scripts/backup.sh [staging|production]
#
# Creates PostgreSQL dump of all KGC databases.
# Recommended: Run via cron daily.
#
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-staging}"
BACKUP_DIR="${BACKUP_DIR:-/opt/kgc-erp/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d-%H%M%S)

echo -e "${YELLOW}==================================================${NC}"
echo -e "${YELLOW}KGC ERP Backup - $ENVIRONMENT${NC}"
echo -e "${YELLOW}==================================================${NC}"
echo -e "Date: $DATE"
echo -e "Backup dir: $BACKUP_DIR"
echo ""

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# List of databases to backup (container:database format)
# Container names match docker-compose service names with kgc- prefix
DATABASES=(
    "db:kgc_erp"
    "twenty-db:twenty"
    "chatwoot-db:chatwoot_production"
    "horilla-db:horilla"
)

# Backup each database
for db_entry in "${DATABASES[@]}"; do
    CONTAINER="${db_entry%%:*}"
    DB_NAME="${db_entry##*:}"
    BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-${DATE}.sql.gz"

    # Full container name with kgc- prefix
    FULL_CONTAINER="kgc-$CONTAINER"

    echo -e "${YELLOW}Backing up $DB_NAME from $FULL_CONTAINER...${NC}"

    if docker ps --format '{{.Names}}' | grep -q "^${FULL_CONTAINER}$"; then
        docker exec "$FULL_CONTAINER" pg_dump -U postgres "$DB_NAME" | gzip > "$BACKUP_FILE"

        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}Created: $BACKUP_FILE ($SIZE)${NC}"
    else
        echo -e "${RED}WARNING: Container $FULL_CONTAINER not running, skipping${NC}"
    fi
done

# Cleanup old backups
echo ""
echo -e "${YELLOW}Cleaning up backups older than $RETENTION_DAYS days...${NC}"
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | while read -r file; do
    echo -e "Deleted: $file"
done

# List remaining backups
echo ""
echo -e "${GREEN}Current backups:${NC}"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}Backup complete!${NC}"
echo -e "${GREEN}==================================================${NC}"
