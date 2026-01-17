#!/bin/bash

# Discord Bot Starter/Restarter for KGC-3
# Usage: ./start-bot.sh [--status|--stop|--restart]

# Always use absolute path to KGC-3 hooks directory
SCRIPT_DIR="/root/LABS/KGCERP/KGC-3/.claude/hooks"
LOG_FILE="/tmp/discord-bot-kgc3.log"
PID_FILE="/tmp/discord-bot-kgc3.pid"

# Load token from .env file if exists
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if bot is running
is_running() {
  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      return 0
    fi
  fi
  # Fallback: check by process name
  pgrep -f "node.*discord-bot.js" > /dev/null 2>&1
}

# Get bot PID
get_pid() {
  if [ -f "$PID_FILE" ]; then
    cat "$PID_FILE"
  else
    pgrep -f "node.*discord-bot.js" 2>/dev/null | head -1
  fi
}

# Status
status() {
  if is_running; then
    pid=$(get_pid)
    echo -e "${GREEN}Bot is RUNNING${NC} (PID: $pid)"
    echo ""
    echo "Recent logs:"
    tail -5 "$LOG_FILE" 2>/dev/null || echo "No logs available"
  else
    echo -e "${RED}Bot is NOT running${NC}"
  fi
}

# Stop bot
stop_bot() {
  if is_running; then
    pid=$(get_pid)
    echo -e "${YELLOW}Stopping bot (PID: $pid)...${NC}"
    kill "$pid" 2>/dev/null
    pkill -f "node.*discord-bot.js" 2>/dev/null
    rm -f "$PID_FILE"
    sleep 1
    echo -e "${GREEN}Bot stopped${NC}"
  else
    echo -e "${YELLOW}Bot is not running${NC}"
  fi
}

# Start bot
start_bot() {
  if is_running; then
    echo -e "${YELLOW}Bot is already running (PID: $(get_pid))${NC}"
    return 1
  fi

  # Check token
  if [ -z "$DISCORD_BOT_TOKEN" ]; then
    echo -e "${RED}ERROR: DISCORD_BOT_TOKEN not set!${NC}"
    echo ""
    echo "Set it via:"
    echo "  1. Environment: export DISCORD_BOT_TOKEN=your_token"
    echo "  2. Or create .env file: echo 'DISCORD_BOT_TOKEN=your_token' > $SCRIPT_DIR/.env"
    return 1
  fi

  echo -e "${YELLOW}Starting Discord bot...${NC}"

  cd "$SCRIPT_DIR"
  nohup node discord-bot.js > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"

  sleep 2

  if is_running; then
    echo -e "${GREEN}Bot started successfully!${NC} (PID: $(get_pid))"
    echo ""
    echo "Log file: $LOG_FILE"
    echo "View logs: tail -f $LOG_FILE"
  else
    echo -e "${RED}Failed to start bot!${NC}"
    echo "Check logs: cat $LOG_FILE"
    return 1
  fi
}

# Main
case "${1:-start}" in
  --status|-s|status)
    status
    ;;
  --stop|stop)
    stop_bot
    ;;
  --restart|-r|restart)
    stop_bot
    sleep 1
    start_bot
    ;;
  --help|-h|help)
    echo "Discord Bot Manager for KGC-3"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start the bot (default)"
    echo "  stop      Stop the bot"
    echo "  restart   Restart the bot"
    echo "  status    Check if bot is running"
    echo "  help      Show this help"
    ;;
  start|*)
    start_bot
    ;;
esac
