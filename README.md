# CLAIM — Claude AI Memory

Two-tier persistent memory plugin for Claude Code with Obsidian vault integration.

## What It Does

**Tier 1 — Auto-Memory** (`.claude/memory/`)
Typed markdown files auto-loaded every session. Four built-in types (`user`, `feedback`, `project`, `reference`) plus custom types. Claude captures memories autonomously at natural conversation breakpoints.

**Tier 2 — Obsidian Vault**
Structured knowledge store with `_registry.md` index. Plans, services, tickets, architecture decisions, incidents, runbooks — all cross-linked with `[[wikilinks]]`.

Memory shapes how Claude behaves. The vault stores what you know.

## Install

```bash
# Add the marketplace
claude plugin marketplace add github.com/kuldeepluvani/claim

# Install the plugin
claude plugin install claim@claim-marketplace
```

## Setup

After installing, run in any Claude Code session:

```
/claim-init ~/path/to/your/obsidian/vault
```

This creates vault folders, initializes the registry, and sets up the memory index.

## What You Get

| Component | Type | Description |
|:---|:---|:---|
| `claim-memory` | rule | Core memory system — types, capture, indexing |
| `claim-vault` | rule | Obsidian integration — folders, registry, linking |
| `/claim-init` | command | One-time setup |
| `/claim-status` | command | Health check across both tiers |
| `/claim-prune` | command | Clean up stale memories |
| `memory-manager` | agent | Bulk ops — prune, consolidate, audit, migrate |
| `memory-prune` | skill | Systematic memory cleanup |
| `vault-sync` | skill | Reconcile registry with actual vault contents |
| `claim-sweep` | hook | Every 10 prompts, triggers memory sweep |

## Configuration

Edit the config block at the top of `rules/claim-memory.md`:

```yaml
claim-config:

  # --- Vault ---
  vault_path: ~/Documents/Obsidian/MyVault
  vault_folders:
    - Services
    - Tickets
    - Plans
    - Architecture
    - Incidents
    - Runbooks

  # --- Capture Behavior ---
  capture_mode: autonomous   # autonomous | confirm
  save_mode: background      # background | inline

  # --- Sweep ---
  sweep_interval: 10         # prompts between sweeps (0 = disabled)

  # --- Custom Types ---
  custom_types: []

  # --- Index ---
  max_index_lines: 200       # prune warning threshold
```

| Setting | Options | Default | Description |
|:---|:---|:---|:---|
| `capture_mode` | `autonomous`, `confirm` | `autonomous` | Whether Claude saves silently or asks first |
| `save_mode` | `background`, `inline` | `background` | Background agent (no interruption) or inline writes |
| `sweep_interval` | `0-N` | `10` | Prompts between sweeps. `0` disables periodic sweep |
| `max_index_lines` | `N` | `200` | MEMORY.md size before prune warning |
| `custom_types` | list | `[]` | User-defined memory types beyond the 4 built-in |

### Custom Memory Types

```yaml
custom_types:
  - name: recipe
    description: "Reusable patterns and solutions"
    when_to_save: "When a non-obvious solution works"
    body_structure: "Pattern, Context, Example"
```

## How It Works

```
User sends message
       ↓
[claim-sweep hook] — increments counter in ~/.claim/.sweep-state
       ↓
Every 10th message → injects [CLAIM MEMORY SWEEP] into context
       ↓
Claude sees reminder → follows claim-memory rules → saves memories
       ↓
Real-time capture handles the other 9 messages via trigger signals
```

Two layers:
1. **Real-time** — Claude detects corrections, preferences, decisions and saves immediately
2. **Periodic sweep** — hook mechanically fires every 10 prompts as a safety net

## Requirements

- [Claude Code](https://claude.ai/claude-code)
- [Obsidian](https://obsidian.md) vault (any vault works)

## License

MIT
