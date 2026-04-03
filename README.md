# CLAIM — Claude AI Memory

Single-file, self-bootstrapping, multi-vault persistent memory for [Claude Code](https://claude.ai/claude-code).

## Install

```bash
# Add the marketplace (one-time)
claude plugin marketplace add kuldeepluvani/claim

# Install the plugin
claude plugin install claim@claim-marketplace
```

To uninstall:
```bash
claude plugin uninstall claim@claim-marketplace
```

### Manual install (alternative)

```bash
mkdir -p ~/.claude/rules ~/.claude/commands && \
curl -sL https://raw.githubusercontent.com/kuldeepluvani/claim/main/claim.md -o ~/.claude/rules/claim.md && \
curl -sL https://raw.githubusercontent.com/kuldeepluvani/claim/main/commands/claim-init.md -o ~/.claude/commands/claim-init.md
```

## Setup

After installing, open any Claude Code session and run:

```
/claim-init
```

Claude walks you through interactive setup — one question at a time:

1. How many vaults?
2. Vault name, path, purpose, folders, routing keywords (per vault)
3. Default vault for unmatched content
4. Capture mode (autonomous/confirm), save mode (background/inline)
5. Sweep preferences (prompt interval, time interval)

Claude then creates vault folders, registries, memory index, and the sweep hook. Done.

```
/claim-init → interactive setup → vaults configured → ready
```

Re-run `/claim-init` anytime to add vaults or change settings. It never overwrites existing content.

## What You Get

| Component | What it does |
|:---|:---|
| **Autonomous capture** | Detects corrections, preferences, decisions — saves silently |
| **SE triggers** | Debug breakthroughs, arch decisions, API quirks, deploy patterns, team conventions |
| **Multi-vault routing** | Content routed to the right vault by semantic keyword matching |
| **Registry discipline** | Every vault has `_registry.md` — one Read = full map |
| **Fixed sweep** | Every 10 prompts OR 30 min — safety net for missed captures |
| **`/claim-init`** | Re-run setup, add vaults, update config |
| **`/claim-status`** | Health check — memories, vaults, sweep state |
| **`/claim-prune`** | Clean stale memories, fix registry drift |

## How It Works

**Two-tier memory:**

- **Auto-memory** (`.claude/memory/`) — behavioral observations, user preferences, corrections
- **Obsidian vaults** — structured knowledge: services, tickets, plans, architecture, incidents

Claude captures autonomously as you work. Software engineering triggers fire on debug breakthroughs, architecture decisions, API quirks, deployment patterns, and team conventions. The fixed sweep runs every 10 prompts or 30 minutes (whichever fires first) as a safety net for anything the triggers missed.

## Configuration

All config lives inside `claim.md` itself as YAML in an HTML comment. No extra files.

| Setting | Options | Default |
|:---|:---|:---|
| `capture_mode` | `autonomous`, `confirm` | `autonomous` |
| `save_mode` | `background`, `inline` | `background` |
| `sweep.prompt_interval` | `0-N` | `10` |
| `sweep.time_interval_min` | `0-N` | `30` |
| `max_index_lines` | `N` | `200` |

### Sample Config

After `/claim-init`, the config block inside `claim.md` looks like this:

```yaml
claim-config:

  vaults:
    - name: Work
      path: ~/Documents/Obsidian/Work
      purpose: "Engineering — services, tickets, incidents"
      routes: [service, repo, ticket, jira, incident, architecture, runbook, standup]
      folders: [Services, Tickets, Plans, Architecture, Incidents, Runbooks, Daily]

    - name: Personal
      path: ~/Documents/Obsidian/Personal
      purpose: "Personal projects, hobbies, life"
      routes: [project, tool, app, daily, journal]
      folders: [Projects, Daily, Plans]

  default_vault: Personal

  # Capture behavior
  capture_mode: autonomous    # autonomous = saves silently | confirm = asks first
  save_mode: background       # background = batched at end | inline = immediate

  # Fixed sweep — safety net for missed captures
  sweep:
    enabled: true
    prompt_interval: 10       # every N prompts (0 = disable)
    time_interval_min: 30     # OR every M minutes (0 = disable)

  # Memory index size
  max_index_lines: 200
```

Routes use semantic keyword matching — content about services, repos, or tickets goes to Work; project and tool notes go to Personal. No manual sorting.

## Requirements

- [Claude Code](https://claude.ai/claude-code)
- A folder for your vault (Obsidian recommended, but `.obsidian/` not required)

## License

MIT

## Author

[Kuldeep Luvani](https://github.com/kuldeepluvani)
