# CLAIM — Claude AI Memory

Single-file, self-bootstrapping, multi-vault persistent memory for [Claude Code](https://claude.ai/claude-code).

## Install

```bash
curl -sL https://raw.githubusercontent.com/kuldeepluvani/claim/main/claim.md \
  -o ~/.claude/rules/claim.md
```

That's it. One file. No dependencies.

## First Run

Start any Claude Code session. Claude detects the empty config and walks you through interactive setup:

```
curl claim.md → ~/.claude/rules/
     ↓
Claude reads it → empty config detected → interactive setup
     ↓
Vaults configured → folders created → registries initialized → sweep hook installed
     ↓
Every session: autonomous capture on triggers + sweep safety net
```

You pick your vault paths, folder structure, routing keywords, and capture preferences. Claude creates everything.

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

### Multi-Vault Example

```yaml
vaults:
  - name: Work
    path: ~/Documents/Obsidian/Work
    purpose: "Engineering — services, tickets, incidents"
    routes: [service, repo, ticket, jira, incident]
    folders: [Services, Tickets, Plans, Architecture, Daily]

  - name: Personal
    path: ~/Documents/Obsidian/Personal
    purpose: "Personal projects, hobbies, life"
    routes: [project, tool, app]
    folders: [Projects, Daily, Plans]

default_vault: Personal
```

Routes use semantic keyword matching — content about services, repos, or tickets goes to Work; project and tool notes go to Personal. No manual sorting.

## Requirements

- [Claude Code](https://claude.ai/claude-code)
- A folder for your vault (Obsidian recommended, but `.obsidian/` not required)

## License

MIT

## Author

[Kuldeep Luvani](https://github.com/kuldeepluvani)
