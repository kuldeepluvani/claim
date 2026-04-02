#!/bin/bash
# install.sh — Install CLAIM plugin into current project's .claude/ directory
#
# Usage:
#   ./install-claim.sh                          # uses defaults
#   ./install-claim.sh ~/claim-plugin           # custom plugin source
#   ./install-claim.sh ~/claim-plugin ./myproj  # custom source + project dir
#
# Pre-configure by editing claim.config.yaml before running.
set -euo pipefail

PLUGIN_SRC="${1:-$HOME/claim-plugin}"
PROJECT_DIR="${2:-$(pwd)}"
CLAUDE_DIR="${PROJECT_DIR}/.claude"
CONFIG_FILE="${PLUGIN_SRC}/claim.config.yaml"

echo "=== CLAIM Installer ==="
echo "Source:  ${PLUGIN_SRC}"
echo "Target:  ${CLAUDE_DIR}"
echo ""

# Validate source
if [ ! -f "${PLUGIN_SRC}/.claude-plugin/plugin.json" ]; then
  echo "ERROR: Not a valid CLAIM plugin directory (missing .claude-plugin/plugin.json)"
  exit 1
fi

# -------------------------------------------------------
# 1. Read claim.config.yaml (if present)
# -------------------------------------------------------
VAULT_PATH=""
CAPTURE_MODE="autonomous"
SAVE_MODE="background"
SWEEP_INTERVAL="10"
MAX_INDEX_LINES="200"
VAULT_FOLDERS="Services Tickets Plans Architecture Incidents Runbooks"

if [ -f "${CONFIG_FILE}" ]; then
  echo "Reading config from claim.config.yaml..."

  # Parse YAML values (simple key: value parsing — no external YAML lib needed)
  _read_yaml() {
    grep -E "^${1}:" "${CONFIG_FILE}" 2>/dev/null | sed "s/^${1}:[[:space:]]*//" | sed 's/^"//' | sed 's/"$//' | tr -d "'" || echo ""
  }

  RAW_VAULT=$(_read_yaml "vault_path")
  [ -n "$RAW_VAULT" ] && VAULT_PATH="$RAW_VAULT"

  RAW_CAPTURE=$(_read_yaml "capture_mode")
  [ -n "$RAW_CAPTURE" ] && CAPTURE_MODE="$RAW_CAPTURE"

  RAW_SAVE=$(_read_yaml "save_mode")
  [ -n "$RAW_SAVE" ] && SAVE_MODE="$RAW_SAVE"

  RAW_SWEEP=$(_read_yaml "sweep_interval")
  [ -n "$RAW_SWEEP" ] && SWEEP_INTERVAL="$RAW_SWEEP"

  RAW_MAX=$(_read_yaml "max_index_lines")
  [ -n "$RAW_MAX" ] && MAX_INDEX_LINES="$RAW_MAX"

  # Parse vault_folders list (lines starting with "  - ")
  PARSED_FOLDERS=$(grep -E "^  - " "${CONFIG_FILE}" 2>/dev/null | sed 's/^  - //' | head -20 || echo "")
  if [ -n "$PARSED_FOLDERS" ]; then
    VAULT_FOLDERS=$(echo "$PARSED_FOLDERS" | tr '\n' ' ')
  fi

  echo "  vault_path:      ${VAULT_PATH:-<not set>}"
  echo "  capture_mode:    ${CAPTURE_MODE}"
  echo "  save_mode:       ${SAVE_MODE}"
  echo "  sweep_interval:  ${SWEEP_INTERVAL}"
  echo "  max_index_lines: ${MAX_INDEX_LINES}"
  echo "  vault_folders:   ${VAULT_FOLDERS}"
  echo ""
else
  echo "No claim.config.yaml found — using defaults."
  echo ""
fi

# -------------------------------------------------------
# 2. Create .claude structure
# -------------------------------------------------------
mkdir -p "${CLAUDE_DIR}/rules"
mkdir -p "${CLAUDE_DIR}/commands"
mkdir -p "${CLAUDE_DIR}/skills"
mkdir -p "${CLAUDE_DIR}/agents"
mkdir -p "${CLAUDE_DIR}/memory"

# -------------------------------------------------------
# 3. Copy plugin files
# -------------------------------------------------------
echo "Installing rules..."
cp "${PLUGIN_SRC}/rules/claim-memory.md" "${CLAUDE_DIR}/rules/"
cp "${PLUGIN_SRC}/rules/claim-vault.md" "${CLAUDE_DIR}/rules/"

echo "Installing commands..."
cp "${PLUGIN_SRC}/commands/claim-init.md" "${CLAUDE_DIR}/commands/"
cp "${PLUGIN_SRC}/commands/claim-status.md" "${CLAUDE_DIR}/commands/"
cp "${PLUGIN_SRC}/commands/claim-prune.md" "${CLAUDE_DIR}/commands/"

echo "Installing skills..."
cp -r "${PLUGIN_SRC}/skills/memory-prune" "${CLAUDE_DIR}/skills/"
cp -r "${PLUGIN_SRC}/skills/vault-sync" "${CLAUDE_DIR}/skills/"

echo "Installing agents..."
cp "${PLUGIN_SRC}/agents/memory-manager.md" "${CLAUDE_DIR}/agents/"

# -------------------------------------------------------
# 4. Apply config to claim-memory.md
# -------------------------------------------------------
RULES_FILE="${CLAUDE_DIR}/rules/claim-memory.md"

echo "Applying config..."

# Replace vault_path
sed -i "s|vault_path: \"\"|vault_path: \"${VAULT_PATH}\"|" "${RULES_FILE}"

# Replace capture_mode
sed -i "s|capture_mode: autonomous|capture_mode: ${CAPTURE_MODE}|" "${RULES_FILE}"

# Replace save_mode
sed -i "s|save_mode: background|save_mode: ${SAVE_MODE}|" "${RULES_FILE}"

# Replace sweep_interval
sed -i "s|sweep_interval: 10|sweep_interval: ${SWEEP_INTERVAL}|" "${RULES_FILE}"

# Replace max_index_lines
sed -i "s|max_index_lines: 200|max_index_lines: ${MAX_INDEX_LINES}|" "${RULES_FILE}"

# -------------------------------------------------------
# 5. Create vault structure (if vault_path is set)
# -------------------------------------------------------
if [ -n "$VAULT_PATH" ]; then
  # Expand ~ to $HOME
  EXPANDED_VAULT="${VAULT_PATH/#\~/$HOME}"

  if [ -d "$EXPANDED_VAULT" ] || mkdir -p "$EXPANDED_VAULT"; then
    echo "Setting up vault at ${EXPANDED_VAULT}..."

    for FOLDER in $VAULT_FOLDERS; do
      mkdir -p "${EXPANDED_VAULT}/${FOLDER}"
    done

    # Create _registry.md if missing
    if [ ! -f "${EXPANDED_VAULT}/_registry.md" ]; then
      cat > "${EXPANDED_VAULT}/_registry.md" <<'REGISTRY'
# Vault Registry

> One Read call → full map.

## Services
| Repo | Path |
|:---|:---|

## Tickets
| ID | Status | Path |
|:---|:---|:---|

## Plans
| Name | Status | Path |
|:---|:---|:---|

## Architecture
| Decision | Status | Path |
|:---|:---|:---|

## Incidents
| Period | Path |
|:---|:---|

## Runbooks
| Name | Path |
|:---|:---|
REGISTRY
      echo "  Created _registry.md"
    fi

    echo "  Vault folders ready."
  else
    echo "  WARNING: Could not create vault at ${EXPANDED_VAULT} — skipping vault setup."
  fi
else
  echo "  No vault_path set — skipping vault setup. Run /claim-init later."
fi

# -------------------------------------------------------
# 6. Initialize MEMORY.md
# -------------------------------------------------------
MEMORY_FILE="${CLAUDE_DIR}/memory/MEMORY.md"
if [ ! -f "${MEMORY_FILE}" ]; then
  cat > "${MEMORY_FILE}" <<'MEMINDEX'
# Memory Index

## User

## Feedback

## Project

## Reference
MEMINDEX
  echo "  Created MEMORY.md"
fi

# -------------------------------------------------------
# 7. Install hooks
# -------------------------------------------------------
SETTINGS_FILE="${CLAUDE_DIR}/settings.json"
HOOKS_DIR="${CLAUDE_DIR}/hooks"
mkdir -p "${HOOKS_DIR}"

echo "Installing sweep hook..."
cp "${PLUGIN_SRC}/hooks/claim-sweep.sh" "${HOOKS_DIR}/"
chmod +x "${HOOKS_DIR}/claim-sweep.sh"

if [ -f "${SETTINGS_FILE}" ]; then
  EXISTING=$(cat "${SETTINGS_FILE}")
  echo "${EXISTING}" | jq --arg hookpath "${HOOKS_DIR}/claim-sweep.sh" '
    .hooks.UserPromptSubmit = [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": ("CLAUDE_PLUGIN_ROOT=\"" + ($hookpath | split("/hooks/")[0]) + "\" " + $hookpath),
            "timeout": 5000
          }
        ]
      }
    ]
  ' > "${SETTINGS_FILE}"
else
  cat > "${SETTINGS_FILE}" <<EOF
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "CLAUDE_PLUGIN_ROOT=\"${CLAUDE_DIR}\" ${HOOKS_DIR}/claim-sweep.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
EOF
fi

# -------------------------------------------------------
# 8. Summary
# -------------------------------------------------------
echo ""
echo "=== CLAIM installed ==="
echo ""
echo "Config:"
echo "  capture_mode:    ${CAPTURE_MODE}"
echo "  save_mode:       ${SAVE_MODE}"
echo "  sweep_interval:  every ${SWEEP_INTERVAL} prompts"
echo "  vault_path:      ${VAULT_PATH:-<not set — run /claim-init>}"
echo ""
echo "Files:"
echo "  .claude/rules/claim-memory.md     (alwaysApply: true)"
echo "  .claude/rules/claim-vault.md      (alwaysApply: true)"
echo "  .claude/commands/claim-init.md"
echo "  .claude/commands/claim-status.md"
echo "  .claude/commands/claim-prune.md"
echo "  .claude/skills/memory-prune/"
echo "  .claude/skills/vault-sync/"
echo "  .claude/agents/memory-manager.md"
echo "  .claude/hooks/claim-sweep.sh"
echo "  .claude/settings.json"
echo "  .claude/memory/MEMORY.md"
if [ -n "$VAULT_PATH" ]; then
echo "  ${VAULT_PATH}/_registry.md"
fi
echo ""
if [ -n "$VAULT_PATH" ]; then
  echo "Ready! Run: claude"
else
  echo "Next: claude → /claim-init ~/your/vault/path"
fi
echo ""
