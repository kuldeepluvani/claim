---
description: CLAIM vault — Obsidian integration, folder routing, registry discipline, frontmatter templates
alwaysApply: true
---

# CLAIM — Vault (Obsidian)

Memory shapes how you behave. The vault stores what the user knows.

## Vault Path

Read from `vault_path` in `claim-memory.md` config block. If empty, ask the user and update the config before any vault operation.

## Registry-First Search

| Priority | Source | When |
|:---|:---|:---|
| 1 | `_registry.md` | Always first — find what exists |
| 2 | Specific note | Registry summary insufficient |
| 3 | Codebase `Grep`/`Glob` | Current code state needed |
| 4 | Cross-reference | Answer spans multiple notes |

**Never blind-glob the vault.** Registry first, always.

## Folder Routing

Route by content type. Never create notes in vault root.

| Folder | Content | Naming |
|:---|:---|:---|
| `Services/` | One living note per repo | `<repo-name>.md` |
| `Tickets/` | Issue tracker tickets | `<ID> <Short Title>.md` |
| `Architecture/` | Cross-repo decisions, ADRs | Descriptive name |
| `Incidents/` | Incidents in subfolders | `<YYYY-MM-DD-brief>/00_postmortem.md` |
| `Runbooks/` | Operational procedures | Descriptive name |
| `Plans/` | Implementation plans, proposals | `YYYY-MM-DD <Feature Name>.md` |

Users configure additional folders via `vault_folders` in config.

## Frontmatter Templates

### Service
```yaml
---
tags: [service]
repo: <repo-name>
team: <team>
language: <lang>
related: ["[[other-service]]"]
---
```

### Ticket
```yaml
---
tags: [ticket]
ticket_id: <ID>
status: <in-progress|done|blocked>
service: "[[<repo-name>]]"
date: YYYY-MM-DD
---
```

### Architecture Decision
```yaml
---
tags: [architecture]
decision: <title>
services: ["[[service-a]]", "[[service-b]]"]
date: YYYY-MM-DD
status: <proposed|accepted|superseded>
---
```

### Incident
```yaml
---
tags: [incident]
severity: <P0-P3>
services: ["[[service-a]]"]
date: YYYY-MM-DD
resolved: <true|false>
---
```

### Plan
```yaml
---
tags: [plan]
status: <proposed|approved|in-progress|implemented|abandoned>
services: ["[[service-a]]"]
date: YYYY-MM-DD
---
```

## Linking Rules

- Every ticket → its service: `service: "[[repo-name]]"`
- Every incident → affected services + related tickets
- Every ADR → all impacted services
- First time in a repo → check `Services/<repo-name>.md` exists; if not, create skeleton

## Write Discipline

Every vault write = **two operations**:
1. Write/update the note
2. Update `_registry.md` (add or modify the row)

Both required. Never one without the other.

## Registry Format

Single markdown file at vault root. One Read → full map.

```markdown
# Vault Registry

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

## Plans Override

All implementation plans go to vault `Plans/`, never in-repo `docs/` directories. The vault is the single source of truth.
