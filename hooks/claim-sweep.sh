#!/bin/bash
# claim-sweep.sh — CLAIM memory sweep trigger
# Fires on every UserPromptSubmit. Every Nth prompt, injects a memory sweep reminder.
# N is read from claim-config.sweep_interval (default: 10, 0 = disabled).
set -euo pipefail
trap '{ echo "{\"suppressOutput\":true}"; exit 0; }' ERR

CLAIM_DIR="${HOME}/.claim"
STATE_FILE="${CLAIM_DIR}/.sweep-state"
CONFIG_FILE="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}/rules/claim-memory.md"

# Ensure directory exists
mkdir -p "$CLAIM_DIR"

# Read stdin (Claude Code sends JSON context)
INPUT=$(cat)

# Read sweep_interval from config (default: 10)
SWEEP_INTERVAL=10
if [ -f "$CONFIG_FILE" ]; then
  PARSED=$(grep -oP 'sweep_interval:\s*\K[0-9]+' "$CONFIG_FILE" 2>/dev/null || echo "10")
  [ -n "$PARSED" ] && SWEEP_INTERVAL="$PARSED"
fi

# If sweep is disabled (0), exit silently
if [ "$SWEEP_INTERVAL" -eq 0 ]; then
  echo '{"suppressOutput":true}'
  exit 0
fi

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

# Check if sweep is due
REMAINDER=$(( PROMPT_COUNT % SWEEP_INTERVAL ))

if [ "$REMAINDER" -eq 0 ]; then
  # Update state with sweep timestamp
  cat > "$STATE_FILE" <<EOF
{"prompt_count":${PROMPT_COUNT},"last_sweep_ts":${NOW},"sweep_interval":${SWEEP_INTERVAL}}
EOF

  # Inject sweep reminder — instructs Claude to dispatch a background agent
  CONTEXT="[CLAIM MEMORY SWEEP] You have exchanged ${PROMPT_COUNT} messages this session (sweep every ${SWEEP_INTERVAL}). IMPORTANT: Do NOT interrupt the user's current task. Complete the user's request first. Then, check save_mode in claim-config. If background: dispatch a background Agent (run_in_background: true) to scan the last ${SWEEP_INTERVAL} exchanges and save any new memories (user preferences, corrections, confirmed approaches, project context, decisions, external references). If inline: save directly. The agent should read .claude/memory/MEMORY.md first to avoid duplicates, write each memory as its own file with frontmatter (name, description, type), and update MEMORY.md index. Do not announce this sweep to the user."

  # Escape for JSON
  CONTEXT=$(echo "$CONTEXT" | sed 's/"/\\"/g' | tr '\n' ' ')

  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$CONTEXT"
else
  # Update state silently
  cat > "$STATE_FILE" <<EOF
{"prompt_count":${PROMPT_COUNT},"last_sweep_ts":${LAST_SWEEP_TS},"sweep_interval":${SWEEP_INTERVAL}}
EOF

  echo '{"suppressOutput":true}'
fi
