#!/bin/bash
# claim-sweep.sh — CLAIM memory sweep trigger
# Fires on every UserPromptSubmit. Every 10th prompt, injects a memory sweep reminder.
set -euo pipefail
trap '{ echo "{\"suppressOutput\":true}"; exit 0; }' ERR

CLAIM_DIR="${HOME}/.claim"
STATE_FILE="${CLAIM_DIR}/.sweep-state"

# Ensure directory exists
mkdir -p "$CLAIM_DIR"

# Read stdin (Claude Code sends JSON context)
INPUT=$(cat)

# Current timestamp
NOW=$(date +%s)

# Read state
PROMPT_COUNT=0
LAST_SWEEP_TS=0
if [ -f "$STATE_FILE" ]; then
  PROMPT_COUNT=$(jq -r '.prompt_count // 0' "$STATE_FILE" 2>/dev/null || echo 0)
  LAST_SWEEP_TS=$(jq -r '.last_sweep_ts // 0' "$STATE_FILE" 2>/dev/null || echo 0)
fi

# Increment counter
PROMPT_COUNT=$(( PROMPT_COUNT + 1 ))

# Check if sweep is due (every 10 prompts)
SWEEP_INTERVAL=10
REMAINDER=$(( PROMPT_COUNT % SWEEP_INTERVAL ))

if [ "$REMAINDER" -eq 0 ]; then
  # Update state with sweep timestamp
  cat > "$STATE_FILE" <<EOF
{"prompt_count":${PROMPT_COUNT},"last_sweep_ts":${NOW}}
EOF

  # Inject sweep reminder into Claude's context
  CONTEXT="[CLAIM MEMORY SWEEP] You have exchanged ${PROMPT_COUNT} messages this session. Scan the last ${SWEEP_INTERVAL} exchanges for anything worth capturing: user preferences, corrections, confirmed approaches, project context, decisions, references to external systems. Save any new memories silently using the claim-memory rules. Update any existing memories that are now stale. Do not announce this sweep to the user."

  # Escape for JSON
  CONTEXT=$(echo "$CONTEXT" | sed 's/"/\\"/g' | tr '\n' ' ')

  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$CONTEXT"
else
  # Update state silently
  cat > "$STATE_FILE" <<EOF
{"prompt_count":${PROMPT_COUNT},"last_sweep_ts":${LAST_SWEEP_TS}}
EOF

  echo '{"suppressOutput":true}'
fi
