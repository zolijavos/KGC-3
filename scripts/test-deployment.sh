#!/bin/bash
#
# KGC ERP - Local Deployment Testing
#
# Usage:
#   ./scripts/test-deployment.sh                    # Full test (config + build + health)
#   ./scripts/test-deployment.sh --config-only      # Config validation only
#   ./scripts/test-deployment.sh --build-only       # Build images only
#   ./scripts/test-deployment.sh --stack            # Start full stack test
#   ./scripts/test-deployment.sh --clean            # Cleanup test containers
#
# This script validates the deployment configuration locally
# before pushing changes to CI.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_DIR="infra/docker/full-stack"
COMPOSE_FILE="docker-compose.demo.yml"
PROJECT_NAME="kgc-test"

# Parse arguments
CONFIG_ONLY=false
BUILD_ONLY=false
STACK_TEST=false
CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --config-only)
            CONFIG_ONLY=true
            shift
            ;;
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --stack)
            STACK_TEST=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--config-only] [--build-only] [--stack] [--clean]"
            echo ""
            echo "Options:"
            echo "  --config-only  Validate config files only (no builds)"
            echo "  --build-only   Build Docker images only"
            echo "  --stack        Start and test full Docker Compose stack"
            echo "  --clean        Cleanup test containers and volumes"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}KGC ERP - Deployment Testing${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Cleanup function
cleanup() {
    echo -e "${YELLOW}Cleaning up test resources...${NC}"
    cd "$COMPOSE_DIR" 2>/dev/null || true
    docker compose -p "$PROJECT_NAME" down -v --remove-orphans 2>/dev/null || true
    docker rmi kgc-api:test kgc-web:test 2>/dev/null || true
    rm -f .env.test 2>/dev/null || true
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Handle --clean flag
if [ "$CLEAN" = true ]; then
    cleanup
    exit 0
fi

# Trap for cleanup on error
trap cleanup EXIT

# ================================================
# Step 1: Config Validation
# ================================================
echo -e "${YELLOW}[1/4] Validating configuration files...${NC}"
echo ""

# Check Docker Compose syntax (create temp env file for validation)
echo "Checking docker-compose.demo.yml..."
cd "$COMPOSE_DIR"

# Create minimal env file for syntax validation
cat > .env.validation << 'EOF'
DEMO_DOMAIN=localhost
ADMIN_EMAIL=test@example.com
KGC_DB_USER=kgc
KGC_DB_PASSWORD=test_password
KGC_DB_NAME=kgc_test
KGC_DB_PORT=5432
JWT_SECRET=test_jwt_secret
JWT_REFRESH_SECRET=test_jwt_refresh
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_CONSOLE_PORT=9001
VITE_API_URL=http://localhost/api
VITE_APP_NAME=KGC_TEST
VITE_APP_VERSION=test
EOF

if docker compose -f "$COMPOSE_FILE" --env-file .env.validation config --quiet 2>/dev/null; then
    echo -e "${GREEN}✅ docker-compose.demo.yml syntax is valid${NC}"
    rm -f .env.validation
else
    echo -e "${RED}❌ docker-compose.demo.yml syntax error${NC}"
    docker compose -f "$COMPOSE_FILE" --env-file .env.validation config 2>&1 | head -20
    rm -f .env.validation
    exit 1
fi

# Check Caddyfile (basic syntax check)
echo "Checking Caddyfile.demo..."
if [ -f "Caddyfile.demo" ]; then
    # Basic check - look for common issues
    if grep -q '{$' Caddyfile.demo && grep -q '}' Caddyfile.demo; then
        echo -e "${GREEN}✅ Caddyfile.demo structure looks valid${NC}"
    else
        echo -e "${YELLOW}⚠️ Caddyfile.demo may have issues${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Caddyfile.demo not found${NC}"
fi

# Check deploy.sh syntax
cd - > /dev/null
echo "Checking scripts/deploy.sh..."
if bash -n scripts/deploy.sh 2>/dev/null; then
    echo -e "${GREEN}✅ deploy.sh syntax is valid${NC}"
else
    echo -e "${RED}❌ deploy.sh syntax error${NC}"
    exit 1
fi

# Check rollback.sh if exists
if [ -f "scripts/rollback.sh" ]; then
    echo "Checking scripts/rollback.sh..."
    if bash -n scripts/rollback.sh 2>/dev/null; then
        echo -e "${GREEN}✅ rollback.sh syntax is valid${NC}"
    else
        echo -e "${YELLOW}⚠️ rollback.sh has syntax issues${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ Configuration validation passed${NC}"

if [ "$CONFIG_ONLY" = true ]; then
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}Config validation complete!${NC}"
    echo -e "${GREEN}================================================${NC}"
    trap - EXIT  # Disable cleanup trap
    exit 0
fi

# ================================================
# Step 2: Docker Image Build
# ================================================
echo ""
echo -e "${YELLOW}[2/4] Building Docker images...${NC}"
echo ""

echo "Building kgc-api:test..."
if docker build -t kgc-api:test -f apps/kgc-api/Dockerfile . 2>&1 | tail -20; then
    echo -e "${GREEN}✅ kgc-api:test built successfully${NC}"
else
    echo -e "${RED}❌ kgc-api build failed${NC}"
    exit 1
fi

echo ""
echo "Building kgc-web:test..."
if docker build -t kgc-web:test \
    --build-arg VITE_API_URL=http://localhost:3000/api \
    --build-arg VITE_APP_NAME=KGC_ERP_TEST \
    -f apps/kgc-web/Dockerfile . 2>&1 | tail -20; then
    echo -e "${GREEN}✅ kgc-web:test built successfully${NC}"
else
    echo -e "${RED}❌ kgc-web build failed${NC}"
    exit 1
fi

echo ""
docker images | grep kgc

if [ "$BUILD_ONLY" = true ]; then
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}Docker build complete!${NC}"
    echo -e "${GREEN}================================================${NC}"
    trap - EXIT  # Disable cleanup trap (keep images)
    exit 0
fi

# ================================================
# Step 3: Container Health Test
# ================================================
echo ""
echo -e "${YELLOW}[3/4] Testing container health...${NC}"
echo ""

# Test kgc-web standalone
echo "Starting kgc-web container..."
docker run -d --name kgc-web-test -p 8080:80 kgc-web:test

echo "Waiting for kgc-web health check..."
TIMEOUT=60
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    if curl -sf http://localhost:8080/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ kgc-web is healthy after ${ELAPSED}s${NC}"
        break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -n "."
done
echo ""

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}❌ kgc-web health check failed${NC}"
    docker logs kgc-web-test
    exit 1
fi

# Verify response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ kgc-web returns HTTP 200${NC}"
else
    echo -e "${RED}❌ kgc-web returned HTTP $HTTP_CODE${NC}"
fi

# Stop test container
docker stop kgc-web-test > /dev/null
docker rm kgc-web-test > /dev/null

if [ "$STACK_TEST" = false ]; then
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}Container health test complete!${NC}"
    echo -e "${GREEN}================================================${NC}"
    trap - EXIT
    exit 0
fi

# ================================================
# Step 4: Full Stack Test
# ================================================
echo ""
echo -e "${YELLOW}[4/4] Testing full Docker Compose stack...${NC}"
echo ""

cd "$COMPOSE_DIR"

# Create test environment file
cat > .env.test << 'EOF'
DEMO_DOMAIN=localhost
ADMIN_EMAIL=test@example.com
KGC_DB_USER=kgc
KGC_DB_PASSWORD=test_password_123
KGC_DB_NAME=kgc_test
KGC_DB_PORT=5433
JWT_SECRET=test_jwt_secret_local
JWT_REFRESH_SECRET=test_jwt_refresh_local
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_CONSOLE_PORT=9002
VITE_API_URL=http://localhost/api
VITE_APP_NAME=KGC_ERP_TEST
VITE_APP_VERSION=test
EOF

echo "Starting infrastructure services (db, redis, minio)..."
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" --env-file .env.test up -d kgc-db kgc-redis kgc-minio

echo "Waiting for services to be healthy..."
sleep 15

# Check PostgreSQL
echo "Checking PostgreSQL..."
if docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec -T kgc-db pg_isready -U kgc; then
    echo -e "${GREEN}✅ PostgreSQL is healthy${NC}"
else
    echo -e "${RED}❌ PostgreSQL health check failed${NC}"
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" logs kgc-db
    exit 1
fi

# Check Redis
echo "Checking Redis..."
if docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec -T kgc-redis redis-cli ping; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${RED}❌ Redis health check failed${NC}"
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" logs kgc-redis
    exit 1
fi

# Show running containers
echo ""
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Full stack test complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Infrastructure services are running. You can:"
echo "  - Connect to PostgreSQL: localhost:5433"
echo "  - Connect to Redis: localhost:6379"
echo "  - Access MinIO console: http://localhost:9002"
echo ""
echo "To stop services: ./scripts/test-deployment.sh --clean"

# Don't cleanup on successful stack test
trap - EXIT
