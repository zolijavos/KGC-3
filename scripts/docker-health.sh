#!/bin/bash
# ==============================================================================
# KGC ERP v7.0 - Docker Health Check
# Run this on the deployment server to check container status
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KGC ERP Docker Health Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed${NC}"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker daemon is not running${NC}"
    exit 1
fi

echo -e "${GREEN}Docker daemon: OK${NC}"
echo ""

# Container status
echo -e "${BLUE}--- Container Status ---${NC}"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -20
echo ""

# Check specific containers
CONTAINERS=("kgc-api" "kgc-web" "caddy" "postgres")
FAILURES=0

echo -e "${BLUE}--- Container Health ---${NC}"
for container in "${CONTAINERS[@]}"; do
    printf "%-20s" "$container..."

    status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no_healthcheck")

    if [ "$status" == "running" ]; then
        if [ "$health" == "healthy" ] || [ "$health" == "no_healthcheck" ]; then
            echo -e "${GREEN}OK${NC} ($status)"
        else
            echo -e "${YELLOW}WARN${NC} ($status, health: $health)"
            ((FAILURES++))
        fi
    elif [ "$status" == "not_found" ]; then
        echo -e "${YELLOW}NOT FOUND${NC}"
    else
        echo -e "${RED}FAIL${NC} ($status)"
        ((FAILURES++))
    fi
done

echo ""

# Recent logs for failed containers
if [ $FAILURES -gt 0 ]; then
    echo -e "${BLUE}--- Recent Error Logs ---${NC}"
    for container in "${CONTAINERS[@]}"; do
        status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
        if [ "$status" != "running" ] && [ "$status" != "not_found" ]; then
            echo -e "${YELLOW}$container logs:${NC}"
            docker logs --tail=20 "$container" 2>&1 | tail -10
            echo ""
        fi
    done
fi

# Disk space
echo -e "${BLUE}--- Disk Space ---${NC}"
df -h / | tail -1
echo ""

# Docker disk usage
echo -e "${BLUE}--- Docker Disk Usage ---${NC}"
docker system df 2>/dev/null || echo "Could not get Docker disk usage"
echo ""

# Memory usage
echo -e "${BLUE}--- Memory Usage ---${NC}"
free -h | head -2
echo ""

echo -e "${BLUE}========================================${NC}"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}All containers healthy${NC}"
    exit 0
else
    echo -e "${RED}$FAILURES container(s) unhealthy${NC}"
    exit 1
fi
