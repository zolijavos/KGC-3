#!/bin/bash
# =============================================================================
# KGC ERP - Environment Management Script
# Usage: ./manage.sh [dev|tst|uat|all] [up|down|restart|logs|status]
# =============================================================================

set -e

ENV=$1
ACTION=$2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 [environment] [action]"
    echo ""
    echo "Environments:"
    echo "  dev     - Development environment (ports 30xx)"
    echo "  tst     - Test environment (ports 31xx)"
    echo "  uat     - UAT environment (ports 32xx)"
    echo "  all     - All environments"
    echo ""
    echo "Actions:"
    echo "  up      - Start environment"
    echo "  down    - Stop environment"
    echo "  restart - Restart environment"
    echo "  logs    - View logs"
    echo "  status  - Show status"
    echo "  ps      - Show running containers"
    echo ""
    echo "Examples:"
    echo "  $0 dev up        # Start DEV environment"
    echo "  $0 tst logs      # View TST logs"
    echo "  $0 all status    # Status of all environments"
    exit 1
}

run_compose() {
    local env=$1
    local action=$2
    local file="$SCRIPT_DIR/docker-compose.${env}.yml"

    if [ ! -f "$file" ]; then
        echo -e "${RED}Error: $file not found${NC}"
        exit 1
    fi

    case $action in
        up)
            echo -e "${GREEN}Starting $env environment...${NC}"
            docker compose -f "$file" up -d
            ;;
        down)
            echo -e "${YELLOW}Stopping $env environment...${NC}"
            docker compose -f "$file" down
            ;;
        restart)
            echo -e "${YELLOW}Restarting $env environment...${NC}"
            docker compose -f "$file" restart
            ;;
        logs)
            docker compose -f "$file" logs -f
            ;;
        status|ps)
            echo -e "${GREEN}=== $env Environment ===${NC}"
            docker compose -f "$file" ps
            ;;
        *)
            usage
            ;;
    esac
}

# Validate arguments
if [ -z "$ENV" ] || [ -z "$ACTION" ]; then
    usage
fi

# Execute
case $ENV in
    dev|tst|uat)
        run_compose $ENV $ACTION
        ;;
    all)
        for env in dev tst uat; do
            run_compose $env $ACTION
            echo ""
        done
        ;;
    *)
        usage
        ;;
esac

echo -e "${GREEN}Done!${NC}"
