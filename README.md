<p align="center">
  <h1 align="center">CLAIM</h1>
  <p align="center"><strong>Claude AI Memory</strong></p>
  <p align="center">Single-file, self-bootstrapping, multi-vault persistent memory for Claude Code</p>
</p>

<p align="center">
  <a href="https://github.com/kuldeepluvani/claim/blob/main/LICENSE"><img src="https://img.shields.io/github/license/kuldeepluvani/claim?style=flat-square&color=blue" alt="License"></a>
  <a href="https://github.com/kuldeepluvani/claim/releases"><img src="https://img.shields.io/github/v/release/kuldeepluvani/claim?style=flat-square&color=green&label=version" alt="Version"></a>
  <a href="https://github.com/kuldeepluvani/claim/stargazers"><img src="https://img.shields.io/github/stars/kuldeepluvani/claim?style=flat-square&color=yellow" alt="Stars"></a>
  <a href="https://github.com/kuldeepluvani/claim/issues"><img src="https://img.shields.io/github/issues/kuldeepluvani/claim?style=flat-square" alt="Issues"></a>
  <a href="https://github.com/kuldeepluvani/claim/pulls"><img src="https://img.shields.io/github/issues-pr/kuldeepluvani/claim?style=flat-square" alt="PRs"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-lightgrey?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/claude%20code-plugin-purple?style=flat-square" alt="Claude Code Plugin">
  <img src="https://img.shields.io/badge/obsidian-compatible-7C3AED?style=flat-square" alt="Obsidian Compatible">
</p>

<p align="center">
  <a href="#install">Install</a> &bull;
  <a href="#setup">Setup</a> &bull;
  <a href="#how-it-works">How It Works</a> &bull;
  <a href="#configuration">Configuration</a> &bull;
  <a href="#commands">Commands</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

---

## Why CLAIM?

Claude Code forgets everything between sessions. CLAIM fixes that.

- **One file.** No CLI tools, no npm, no Docker. Just a markdown file that teaches Claude how to remember.
- **Self-bootstrapping.** Claude itself runs the setup. No installer needed.
- **Multi-vault.** Route work notes to one vault, personal notes to another. Semantic matching, not manual sorting.
- **Two-tier memory.** Thin behavioral layer (preferences, corrections) + deep knowledge store (Obsidian vaults).
- **Software engineer-first.** Specialized triggers for debug breakthroughs, arch decisions, API quirks, deploy patterns.

---

## Install

### Plugin (recommended)

```bash
# Add the marketplace (one-time)
claude plugin marketplace add kuldeepluvani/claim

# Install
claude plugin install claim@claim-marketplace
```

```bash
# Uninstall
claude plugin uninstall claim@claim-marketplace
```

### Manual (alternative)

```bash
mkdir -p ~/.claude/rules ~/.claude/commands && \
curl -sL https://raw.githubusercontent.com/kuldeepluvani/claim/main/claim.md -o ~/.claude/rules/claim.md && \
curl -sL https://raw.githubusercontent.com/kuldeepluvani/claim/main/commands/claim-init.md -o ~/.claude/commands/claim-init.md
```

---

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

Claude creates vault folders, registries, memory index, and the sweep hook.

Re-run `/claim-init` anytime to add vaults or change settings. Idempotent — never overwrites existing content.

---

## How It Works

```
                    CLAIM
                      |
          +-----------+-----------+
          |                       |
      Memory                   Vault
   (~/.claude/memory/)      (Obsidian vaults)
          |                       |
    Behavioral layer        Knowledge store
    - user profile          - services, tickets
    - feedback/prefs        - architecture decisions
                            - incidents, runbooks
                            - project context
                            - API quirks, patterns
```

**Memory is the router. Vault is the brain.**

| Layer | What it stores | Loaded |
|:---|:---|:---|
| **Memory** | User profile, feedback, corrections | Every session (thin) |
| **Vault** | Services, tickets, plans, architecture, incidents, references | On demand via registry |

### Capture Triggers

CLAIM captures autonomously as you work:

| Trigger | Destination | Example |
|:---|:---|:---|
| User corrects approach | Memory | "no, don't do it that way" |
| User confirms approach | Memory | "yes exactly", "perfect" |
| Root cause found | Vault | Bug cause + initial misdirection |
| Architecture decision | Vault | Choice + alternatives + why |
| API quirk discovered | Vault | "returns 200 empty body, not 401" |
| Deploy pattern learned | Vault | "uses bumpversion, never manual" |
| Team convention | Memory | "PRs need JIRA ID prefix" |

### Fixed Sweep

Safety net that fires on **whichever comes first**:
- Every N prompts (default: 10)
- Every M minutes (default: 30)

Catches what real-time triggers missed during flow state.

---

## Commands

| Command | Description |
|:---|:---|
| `/claim-init` | Run or re-run setup. Add vaults, update config. |
| `/claim-status` | Health check — memories, vaults, sweep state, config. |
| `/claim-prune` | Clean stale memories, consolidate duplicates, audit registries. |

---

## Configuration

All config lives inside `claim.md` as YAML in an HTML comment. No extra files.

| Setting | Options | Default | Description |
|:---|:---|:---|:---|
| `capture_mode` | `autonomous`, `confirm` | `autonomous` | Save silently or ask first |
| `save_mode` | `background`, `inline` | `background` | Batch at end or save immediately |
| `sweep.enabled` | `true`, `false` | `true` | Enable/disable fixed sweep |
| `sweep.prompt_interval` | `0-N` | `10` | Prompts between sweeps (0 = disable) |
| `sweep.time_interval_min` | `0-N` | `30` | Minutes between sweeps (0 = disable) |
| `max_index_lines` | `N` | `200` | MEMORY.md prune warning threshold |

### Sample Config

After `/claim-init`, the config block inside `claim.md`:

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

  capture_mode: autonomous    # autonomous = saves silently | confirm = asks first
  save_mode: background       # background = batched at end | inline = immediate

  sweep:
    enabled: true
    prompt_interval: 10       # every N prompts (0 = disable)
    time_interval_min: 30     # OR every M minutes (0 = disable)

  max_index_lines: 200
```

Routes use **semantic keyword matching** — content about services, repos, or tickets goes to Work; project and tool notes go to Personal. No manual sorting.

---

## Requirements

| Requirement | Required | Notes |
|:---|:---|:---|
| [Claude Code](https://claude.ai/claude-code) | Yes | CLI v2.0+ |
| [Obsidian](https://obsidian.md) | Recommended | Any folder works, `.obsidian/` not required |
| macOS or Linux | Yes | POSIX-compatible sweep hook |

---

## Project Structure

```
claim/
  .claude-plugin/       # Claude Code plugin manifests
  .cursor-plugin/       # Cursor plugin manifests
  commands/
    claim-init.md       # /claim-init command
    claim-status.md     # /claim-status command
    claim-prune.md      # /claim-prune command
  claim.md              # THE file — rules, config, bootstrap, memory, vault, sweep
  README.md
  LICENSE
```

---

## Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit with [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`)
4. Open a PR against `main`

### Ideas for contribution

- Additional capture triggers for other roles (data science, DevOps, PM)
- Vault templates for different workflows
- Integration with other note-taking tools beyond Obsidian

---

## License

[MIT](LICENSE)

---

<p align="center">
  Built by <a href="https://github.com/kuldeepluvani">Kuldeep Luvani</a>
</p>
