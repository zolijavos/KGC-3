#!/bin/bash
# ==============================================================================
# KGC ERP v7.0 - Deployment Health Check Script
# Usage: ./scripts/health-check.sh [domain]
# Example: ./scripts/health-check.sh demo-kgc.mflerp.com
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default domain
DOMAIN="${1:-localhost:3000}"
PROTOCOL="https"

# Use http for localhost
if [[ "$DOMAIN" == localhost* ]]; then
    PROTOCOL="http"
fi

BASE_URL="${PROTOCOL}://${DOMAIN}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KGC ERP Health Check${NC}"
echo -e "${BLUE}Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check endpoint
check_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"

    printf "%-30s" "$name..."

    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$response" == "$expected_status" ]; then
        echo -e "${GREEN}OK${NC} (HTTP $response)"
        return 0
    elif [ "$response" == "000" ]; then
        echo -e "${RED}FAIL${NC} (Connection refused/timeout)"
        return 1
    else
        echo -e "${YELLOW}WARN${NC} (HTTP $response, expected $expected_status)"
        return 1
    fi
}

# Function to check JSON API endpoint
check_api() {
    local name="$1"
    local url="$2"

    printf "%-30s" "$name..."

    response=$(curl -s --connect-timeout 5 --max-time 10 "$url" 2>/dev/null)
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$http_code" == "200" ]; then
        # Try to parse as JSON
        if echo "$response" | jq . > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC} (HTTP $http_code, valid JSON)"
            return 0
        else
            echo -e "${YELLOW}WARN${NC} (HTTP $http_code, invalid JSON)"
            return 1
        fi
    elif [ "$http_code" == "000" ]; then
        echo -e "${RED}FAIL${NC} (Connection refused/timeout)"
        return 1
    else
        echo -e "${YELLOW}WARN${NC} (HTTP $http_code)"
        return 1
    fi
}

# Track failures
FAILURES=0

echo -e "${BLUE}--- Frontend Checks ---${NC}"
check_endpoint "Frontend (index)" "$BASE_URL/" || ((FAILURES++))
check_endpoint "Frontend (health)" "$BASE_URL/health" || ((FAILURES++))
check_endpoint "Favicon" "$BASE_URL/favicon.ico" || ((FAILURES++))

echo ""
echo -e "${BLUE}--- API Checks ---${NC}"
check_endpoint "API Health" "$BASE_URL/api/v1/health" || ((FAILURES++))
check_endpoint "API Ready" "$BASE_URL/api/v1/ready" || ((FAILURES++))
check_endpoint "Swagger Docs" "$BASE_URL/api/docs" || ((FAILURES++))

echo ""
echo -e "${BLUE}--- Auth Endpoints ---${NC}"
check_endpoint "Auth Login (POST)" "$BASE_URL/api/v1/auth/login" "401" || ((FAILURES++))

echo ""
echo -e "${BLUE}--- Docker Containers (if local) ---${NC}"
if command -v docker &> /dev/null; then
    printf "%-30s" "Docker daemon..."
    if docker info > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"

        echo ""
        echo "Container status:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | grep -E "kgc|caddy|postgres" || echo "No KGC containers found"
    else
        echo -e "${YELLOW}WARN${NC} (Docker not accessible)"
    fi
else
    echo "Docker CLI not available"
fi

echo ""
echo -e "${BLUE}--- SSL Certificate ---${NC}"
if [[ "$PROTOCOL" == "https" ]]; then
    printf "%-30s" "SSL Certificate..."
    cert_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    if [ -n "$cert_info" ]; then
        expiry=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
        echo -e "${GREEN}OK${NC} (expires: $expiry)"
    else
        echo -e "${YELLOW}WARN${NC} (Could not verify)"
    fi
else
    echo "Skipped (HTTP only)"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}$FAILURES check(s) failed${NC}"
    exit 1
fi
