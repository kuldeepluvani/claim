---
description: CLAIM — Claude AI Memory. Autonomous capture, typed memories, multi-vault Obsidian integration.
alwaysApply: true
---

# CLAIM — Claude AI Memory

<!--
claim-config:

  vaults: []

  # --- Capture Behavior ---
  capture_mode: autonomous    # autonomous | confirm
  save_mode: background       # background | inline

  # --- Fixed Sweep ---
  sweep:
    enabled: true
    prompt_interval: 10       # every N prompts (0 = disable)
    time_interval_min: 30     # OR every M minutes (0 = disable)

  # --- Index ---
  max_index_lines: 200
-->

Memory shapes how you behave. Vaults store what the user knows. This file configures both.

---

## First-Run Setup

If `vaults` in the config above is empty (`[]`), run the setup flow before doing anything else. Do NOT skip this — the system does not work without configured vaults.

### Preflight Checks

Before starting the interactive setup, run these checks silently and report results:

1. **Claude Code version** — run `claude --version` to confirm CLI is available
2. **Obsidian CLI** — run `which obsidian` or check if Obsidian is installed (`/Applications/Obsidian.app` on macOS, `which obsidian` on Linux). If not found, warn: "Obsidian not detected. CLAIM works with any folder, but Obsidian is recommended for full vault features (wikilinks, graph view, search). Continue anyway?"
3. **Existing config** — check if `~/.claude/memory/MEMORY.md` already exists (migration from v1 or prior setup). If so, note it will be preserved.
4. **Write permissions** — confirm `~/.claude/rules/claim.md` is writable (needed to update config in-place)

If all checks pass, proceed. If Obsidian is missing, let the user decide whether to continue or install it first.

### Interactive Setup

Ask ONE question at a time. Wait for each answer before proceeding.

**Step 1:** "How many vaults do you use?" (Obsidian vaults or any folders for structured notes)

**Step 2** (repeat for each vault):
1. "Vault name?" — short label (e.g. "Zefr", "Personal")
2. "Vault path?" — absolute path (e.g. `~/Documents/Obsidian/MyVault`). Validate it exists. If it does not, offer to create it.
3. "Purpose? (one line)" — e.g. "Zefr engineering work", "Personal projects and hobbies"
4. "What folders should this vault have?" — comma-separated (e.g. Services, Tickets, Plans, Daily)
5. "Routing keywords? What content goes here?" — semantic match keywords (e.g. service, jira, ticket, incident)

**Step 3:** "Which vault should catch unmatched content?" — set as `default_vault`.

**Step 4:** Capture preferences:
- "Capture mode: Autonomous (saves silently) or Confirm (asks first)?" — default: autonomous
- "Save mode: Background (non-interruptive) or Inline (immediate)?" — default: background
- "Enable fixed memory sweep?" — default: yes
  - If yes: "Sweep every N prompts?" — default: 10
  - If yes: "Sweep time interval (minutes)?" — default: 30

**After collecting all answers, execute these steps:**

1. **Update config** — Use the Edit tool to update the `claim-config` comment block in THIS file (`~/.claude/rules/claim.md`). Fill in the `vaults` array. Each vault entry:
   ```yaml
   vaults:
     - name: VaultName
       path: /absolute/path/to/vault
       purpose: "One-line purpose"
       folders: [Services, Tickets, Plans, Daily]
       routes: [service, jira, ticket, incident]
   ```

2. **Create vault folders** — Run `mkdir -p` for every folder in every vault.

3. **Create `_registry.md`** at each vault root if it does not exist:
   ```markdown
   # Vault Registry

   > One Read call -> full map.

   ## [FolderName]
   | Note | Summary | Updated |
   |:-----|:--------|:--------|
   ```
   Repeat the `## [FolderName]` section for each folder configured in that vault.

4. **Create `~/.claude/memory/MEMORY.md`** if missing:
   ```markdown
   # Memory Index

   ## User

   ## Feedback

   ## Project

   ## Reference
   ```

5. **Generate `~/.claude/hooks/claim-sweep.sh`** — write the sweep hook script (see Fixed Sweep section). Make it executable with `chmod +x`.

6. **Register the sweep hook** in `~/.claude/settings.json` — read existing file first, merge the CLAIM hook entry into the `UserPromptSubmit` array. Never overwrite existing hooks.

---

## Memory System

**Capture Mode** — read `capture_mode` from config above:
- `autonomous` (default): Save silently. No announcement, no asking, no confirmation. Just write.
- `confirm`: Propose the memory — "I'd save this as a [type] memory: [one-line]. OK?" Only save after explicit approval.
- **Exception for both modes:** when user says "remember this" or "don't forget" — save immediately inline, always, regardless of mode.

**Save Mode** — read `save_mode` from config above:
- `background` (default): During your response, mentally note trigger signals. Do NOT stop mid-response to save. At the END, dispatch a single background Agent (`run_in_background: true`) with a clear list of what to save. Format the agent prompt: *"You are a CLAIM memory agent. Save these memories to ~/.claude/memory/: 1. [type: feedback] ... 2. [type: project] ... Read MEMORY.md first to avoid duplicates."*
- `inline`: Save directly using Write/Edit tools as triggers fire. Immediate but interruptive.
- If no triggers detected in a response, do nothing. Not every response needs a save.

**Memory Types:**

| Type | What it stores | When to save | Body structure |
|:--|:--|:--|:--|
| `user` | Role, goals, preferences, expertise | When you learn about the user | Free-form |
| `feedback` | How user wants you to work — corrections AND confirmations (save what worked too, not just failures) | When user corrects or confirms your approach | Rule first, then `**Why:**` line, then `**How to apply:**` line |
| `project` | Ongoing work, decisions, bugs, context not derivable from code/git | When you learn who/what/why/when | Fact first, then `**Why:**` and `**How to apply:**` lines. Convert relative dates ("next Thursday") to absolute dates. |
| `reference` | Pointers to external systems, tools, infra | When external resource/tool discovered | Location + purpose |

**Memory File Format** — two steps, BOTH required:

**Step 1:** Write file to `~/.claude/memory/` with frontmatter:
```markdown
---
name: {{memory name}}
description: {{one-line — specific enough to judge relevance in future sessions}}
type: {{user | feedback | project | reference}}
---

{{content}}
```

**Step 2:** Add a pointer in `MEMORY.md`. The index contains ONLY links + brief descriptions (one line, under 150 chars) — never content directly. Organize by topic, not chronologically.

**What NOT to Save:**
- Code patterns, architecture, file paths — derivable from reading code
- Git history — `git log` / `git blame` are authoritative
- Debug solutions — fix is in the code, commit message has context
- Anything already in `CLAUDE.md` or `claim.md` config
- Ephemeral task details

**Staleness:**
Memories are point-in-time snapshots. Before acting on one:
- File path → check it exists
- Function/flag → grep for it
- Conflicts with current state → trust what you observe now, update the stale memory

**Index Discipline:**
- Keep `MEMORY.md` under `max_index_lines` from config (default 200) — it loads into context every session
- Update or remove wrong/outdated memories when you encounter them
- Check for existing memories before creating duplicates

---

## Capture Triggers

### Core Triggers (always active)

| Signal | Type | Example |
|:--|:--|:--|
| User corrects your approach | `feedback` | "no, don't do it that way" |
| User confirms non-obvious approach | `feedback` | "yes exactly", "perfect", accepting an unusual choice |
| User shares role/background | `user` | "I'm a data scientist", "I've been doing Go for 10 years" |
| User states preference | `user` | "I prefer terse responses", "skip the preamble" |
| Project context shared | `project` | "we're freezing merges Thursday", "legal flagged the auth middleware" |
| External system reference | `reference` | "bugs tracked in Linear project X" |
| Decision finalized | `project` | Architecture choice locked in, tool selected |
| Explicit "remember" / "don't forget" | any | Immediate save, always — overrides both capture modes |

### Software Engineering Triggers (active by default)

| Signal | Type | What to capture |
|:--|:--|:--|
| Root cause found after debugging | `project` | Actual cause + what it looked like initially — capture the misdirection pattern, not just the fix |
| Architecture decision made | `project` | Choice, alternatives rejected, and WHY — "chose Kafka over SQS because ordering matters" |
| Dependency/tooling discovery | `reference` | "this library handles X better than Y" or "avoid Z, breaks on ARM" |
| Environment/infra quirk | `reference` | "service needs --memory 2Gi or OOMs on large payloads" |
| API behavior learned the hard way | `reference` | "endpoint returns 200 empty body when unauth, not 401" |
| Performance finding | `project` | "query slow because missing composite index on (tenant_id, created_at)" |
| Deploy/release pattern | `reference` | "this repo uses bumpversion, never manual version edits" |
| Service interaction discovered | `reference` | "service A webhooks to B, if B down retries 3x then dead-letters" |
| Team convention learned | `feedback` | "PRs need JIRA ID prefix", "no force-push to main" |
| Security pattern | `reference` | "mTLS required between pods", "tokens expire in 15m" |
| Code review feedback received | `feedback` | Recurring review patterns — "team prefers composition over inheritance here" |
| Incident learning | `project` | What broke, why, what to watch for — not the fix but the CONTEXT |

> These software engineering triggers can be disabled by removing this section from config. They're recommended for any developer.

---

## Vault System

CLAIM supports multiple Obsidian vaults. Each vault is declared in the YAML config with a name, path, purpose, semantic routes, and folder list. Memory (`~/.claude/memory/`) shapes how you behave. Vault notes store what the user knows. Never conflate the two.

### Routing

When you need to write a vault note:

1. Read the `vaults` config block. Each vault has `routes` — a list of semantic match keywords paired with folders.
2. Evaluate the content's **nature** against each vault's routes in declaration order.
3. The `match` keywords are **semantic**, not literal. You match based on what the content is about, not whether the text contains the keyword string. Ask: "is this content about a service/repo/deployment?" — not "does the text contain the word 'service'?"
4. First vault with a matching route wins. Use the vault's folder names as routing targets — a keyword like "ticket" maps to a folder named "Tickets", "service" maps to "Services", etc.
5. If no route matches any vault, use `default_vault` from config.
6. Dynamic folder patterns expand at write time:
   - `{service_name}` — repo name (e.g., `Services/ffmpeg-prototyper`)
   - `{project_name}` — project name (e.g., `Projects/Mycelium`)
   - `{YYYY-MM-DD-brief}` — date + brief slug (e.g., `Incidents/2026-04-03-api-outage`)

Never create notes in a vault root. Always route to a subfolder.

### Registry-First Search

| Priority | Source | When |
|:---|:---|:---|
| 1 | `_registry.md` | Always first — find what exists and where |
| 2 | Specific note | Registry summary is insufficient |
| 3 | Codebase `Grep`/`Glob` | Current code state needed |
| 4 | Cross-reference | Answer spans multiple notes |

Never blind-glob a vault. Read the registry first, always. One Read call gives you the full map.

### Write Discipline

Every vault write is **two operations**:

1. Write or update the note.
2. Update that vault's `_registry.md` — add a new row or modify the existing one.

Both are required. Never do one without the other. If you write a note and skip the registry update, the note is effectively invisible to future searches.

### Registry Format

A single markdown file (`_registry.md`) at each vault root. Default template:

```markdown
# Vault Registry

> One Read call -> full map.

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
```

This is the default. Users can customize sections based on their vault's folders during setup. The only hard requirement is that every note in the vault has a corresponding row here.

### Frontmatter Templates

Every vault note requires YAML frontmatter. Use the appropriate template based on note type.

**Service:**
```yaml
---
tags: [service]
repo: <repo-name>
team: <team>
language: <lang>
related: ["[[other-service]]"]
---
```

**Ticket:**
```yaml
---
tags: [ticket]
ticket_id: <ID>
status: <in-progress|done|blocked>
service: "[[<repo-name>]]"
date: YYYY-MM-DD
---
```

**Architecture Decision:**
```yaml
---
tags: [architecture]
decision: <title>
services: ["[[service-a]]", "[[service-b]]"]
date: YYYY-MM-DD
status: <proposed|accepted|superseded>
---
```

**Incident:**
```yaml
---
tags: [incident]
severity: <P0-P3>
services: ["[[service-a]]"]
date: YYYY-MM-DD
resolved: <true|false>
---
```

**Plan:**
```yaml
---
tags: [plan]
status: <proposed|approved|in-progress|implemented|abandoned>
services: ["[[service-a]]"]
date: YYYY-MM-DD
---
```

### Linking Rules

- Every ticket links to its service: `service: "[[repo-name]]"`
- Every incident links to affected services and related tickets.
- Every architecture decision links to all impacted services.
- First time you touch a repo, check if `Services/<repo-name>/<repo-name>.md` exists. If not, create the folder and a skeleton service note with the frontmatter template above.

### Plans Override

All implementation plans go to the appropriate vault's `Plans/` folder. Never write plans to in-repo `docs/` directories. The vault is the single source of truth for plans — no exceptions.

---

## Fixed Sweep

Safety net that catches memories missed during flow state. Fires on WHICHEVER trigger comes first:
- Every N prompts (default 10)
- Every M minutes since last sweep (default 30)

Read `sweep` config. If `enabled: false`, ignore this section entirely.

### Hook Script

During bootstrap, generate `~/.claude/hooks/claim-sweep.sh` using the Write tool with this content:

```bash
#!/bin/bash
# claim-sweep.sh — CLAIM memory sweep trigger (dual: prompt count + time)
set -euo pipefail
trap '{ echo "{\"suppressOutput\":true}"; exit 0; }' ERR

STATE_DIR="${HOME}/.claim"
STATE_FILE="${STATE_DIR}/.sweep-state"
CONFIG_FILE="${HOME}/.claude/rules/claim.md"

mkdir -p "$STATE_DIR"

# Read config from claim.md
PROMPT_INTERVAL=10
TIME_INTERVAL=30
SWEEP_ENABLED=true

if [ -f "$CONFIG_FILE" ]; then
  PARSED_ENABLED=$(sed -n 's/.*enabled:[[:space:]]*\([a-z]*\).*/\1/p' "$CONFIG_FILE" | head -1)
  [ -n "$PARSED_ENABLED" ] && SWEEP_ENABLED="$PARSED_ENABLED"

  PARSED_PROMPT=$(sed -n 's/.*prompt_interval:[[:space:]]*\([0-9]*\).*/\1/p' "$CONFIG_FILE" | head -1)
  [ -n "$PARSED_PROMPT" ] && PROMPT_INTERVAL="$PARSED_PROMPT"

  PARSED_TIME=$(sed -n 's/.*time_interval_min:[[:space:]]*\([0-9]*\).*/\1/p' "$CONFIG_FILE" | head -1)
  [ -n "$PARSED_TIME" ] && TIME_INTERVAL="$PARSED_TIME"
fi

# Exit if sweep disabled
if [ "$SWEEP_ENABLED" = "false" ]; then
  echo '{"suppressOutput":true}'
  exit 0
fi

NOW=$(date +%s)

# Read state
PROMPT_COUNT=0
LAST_SWEEP_TS=0
if [ -f "$STATE_FILE" ]; then
  PROMPT_COUNT=$(sed -n 's/.*"prompt_count":\([0-9]*\).*/\1/p' "$STATE_FILE" 2>/dev/null || echo 0)
  PROMPT_COUNT=${PROMPT_COUNT:-0}
  LAST_SWEEP_TS=$(sed -n 's/.*"last_sweep_ts":\([0-9]*\).*/\1/p' "$STATE_FILE" 2>/dev/null || echo 0)
  LAST_SWEEP_TS=${LAST_SWEEP_TS:-0}
fi

PROMPT_COUNT=$(( PROMPT_COUNT + 1 ))

# Check triggers
FIRE=false

# Prompt-based trigger
if [ "$PROMPT_INTERVAL" -gt 0 ]; then
  REMAINDER=$(( PROMPT_COUNT % PROMPT_INTERVAL ))
  [ "$REMAINDER" -eq 0 ] && FIRE=true
fi

# Time-based trigger
if [ "$TIME_INTERVAL" -gt 0 ] && [ "$LAST_SWEEP_TS" -gt 0 ]; then
  ELAPSED=$(( NOW - LAST_SWEEP_TS ))
  THRESHOLD=$(( TIME_INTERVAL * 60 ))
  [ "$ELAPSED" -ge "$THRESHOLD" ] && FIRE=true
fi

# First prompt ever — initialize timestamp, don't fire
if [ "$LAST_SWEEP_TS" -eq 0 ]; then
  cat > "$STATE_FILE" <<EOF
{"prompt_count":${PROMPT_COUNT},"last_sweep_ts":${NOW}}
EOF
  echo '{"suppressOutput":true}'
  exit 0
fi

if [ "$FIRE" = "true" ]; then
  cat > "$STATE_FILE" <<EOF
{"prompt_count":${PROMPT_COUNT},"last_sweep_ts":${NOW}}
EOF

  CONTEXT="[CLAIM MEMORY SWEEP] ${PROMPT_COUNT} messages since session start, last sweep $(( (NOW - LAST_SWEEP_TS) / 60 ))m ago. Complete the user's current request first. Then dispatch a background Agent (run_in_background: true) to scan recent exchanges for unsaved memories — corrections, preferences, decisions, context, references. Agent must read ~/.claude/memory/MEMORY.md first to avoid duplicates. Do not announce this sweep."

  CONTEXT=$(echo "$CONTEXT" | sed 's/"/\\"/g' | tr '\n' ' ')
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$CONTEXT"
else
  cat > "$STATE_FILE" <<EOF
{"prompt_count":${PROMPT_COUNT},"last_sweep_ts":${LAST_SWEEP_TS}}
EOF
  echo '{"suppressOutput":true}'
fi
```

Make executable: `chmod +x ~/.claude/hooks/claim-sweep.sh`

### Hook Registration

During bootstrap, merge this into `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/claim-sweep.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

If `settings.json` already exists with other hooks, read existing content and MERGE — add the CLAIM hook entry to the `UserPromptSubmit` array. Do not overwrite other hook entries.

### Sweep Behavior

When you see `[CLAIM MEMORY SWEEP]` injected into context:

1. **Complete the user's current request first.** Never interrupt their task for a sweep.
2. Dispatch a background Agent (`run_in_background: true`) to scan recent exchanges.
3. The agent reads `~/.claude/memory/MEMORY.md` first to avoid duplicates.
4. The agent writes new memory files and updates the MEMORY.md index.
5. **Never announce the sweep to the user.** It is invisible.

---

## Commands

These commands work when the user types them. They are not registered as Claude Code slash commands — they are pattern-matched from user input.

### /claim-init

Re-run the First-Run Setup flow. Safe to run again — it adds new vaults, updates existing config, creates missing folders and registries. It never overwrites existing vault content.

If config already has vaults, show the current config first and ask what to change:
- Add a vault
- Modify a vault (path, folders, routes, purpose)
- Update capture settings (capture_mode, save_mode)
- Regenerate the sweep hook script
- Update sweep intervals

### /claim-status

Run a health check across all configured vaults. Report:

**Per vault:**
- Name, path, purpose
- Folder count: expected vs actual on disk
- Registry entries vs actual note files (detect orphans and missing entries)
- Last modified note (filename + timestamp)

**Memory tier:**
- Total memory files in `~/.claude/memory/`
- Count by type (user, feedback, project, reference)
- MEMORY.md line count vs `max_index_lines` threshold

**Sweep:**
- Read `~/.claim/.sweep-state` — show prompt count, last sweep time (human-readable), configured intervals
- Hook script exists and is executable: yes/no
- Hook registered in settings.json: yes/no

**Config summary:** capture_mode, save_mode, sweep settings, default_vault

### /claim-prune

Interactive cleanup. For each category, show findings and confirm before acting.

1. **Stale memories:** Check if referenced file paths still exist, projects still active, tools still in use. Propose removal for each stale entry.
2. **Duplicates:** Find memories with similar descriptions or overlapping content. Propose consolidation.
3. **Registry audit** (per vault): Entries without matching files, files without registry entries. Fix discrepancies.
4. **MEMORY.md line count:** If over `max_index_lines` threshold, suggest pruning oldest or least-relevant entries.

Report everything changed. Flag items needing human review with a clear marker.
