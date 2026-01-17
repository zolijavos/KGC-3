#!/bin/bash
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Discord Bot Integration for Claude Code
# Sends permission requests with interactive buttons
# Bot must be running: npm start (in this directory)

HOOKS_DIR="$(dirname "$0")"
REQUESTS_DIR="$HOOKS_DIR/requests"
RESPONSES_DIR="$HOOKS_DIR/responses"

# Ensure directories exist
mkdir -p "$REQUESTS_DIR" "$RESPONSES_DIR"

# Read hook input from stdin
hook_input=$(cat)

# Extract hook event
hook_event=$(echo "$hook_input" | jq -r '.hook_event_name // "Unknown"')

# Only process PreToolUse events (permission requests)
if [ "$hook_event" != "PreToolUse" ]; then
  exit 0
fi

# Generate unique request ID
request_id="req_$(date +%s%N)_$$"

# Write request file for the bot
echo "$hook_input" | jq '. + {"request_id": "'"$request_id"'"}' > "$REQUESTS_DIR/$request_id.json"

# Wait for response (max 300 seconds / 5 minutes)
response_file="$RESPONSES_DIR/$request_id.json"
timeout=300
elapsed=0

while [ ! -f "$response_file" ] && [ $elapsed -lt $timeout ]; do
  sleep 0.5
  elapsed=$((elapsed + 1))
done

# Check if we got a response
if [ -f "$response_file" ]; then
  decision=$(jq -r '.decision // "timeout"' "$response_file")
  user_message=$(jq -r '.message // ""' "$response_file")
  rm -f "$response_file"

  case "$decision" in
    approve|approve_always)
      # Allow the action
      exit 0
      ;;
    reject)
      # Block the action with user message
      if [ -n "$user_message" ] && [ "$user_message" != "null" ]; then
        echo "{\"error\": \"Discord: $user_message\"}" >&2
      else
        echo '{"error": "Action rejected via Discord"}' >&2
      fi
      exit 1
      ;;
    timeout)
      # Timeout - default to allow
      exit 0
      ;;
  esac
else
  # No response - timeout, default allow
  exit 0
fi
