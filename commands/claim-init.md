# /claim-init

Initialize the CLAIM memory system.

## Usage

```
/claim-init [vault_path]
```

## Steps

1. **Get vault path** — use argument, or read from config, or ask the user. Must be an existing directory.
2. **Validate vault** — confirm directory exists (check for `.obsidian/` or any `.md` files).
3. **Update config** — set `vault_path` in `rules/claim-memory.md` config block.
4. **Create vault folders** — for each folder in `vault_folders` config, create if missing:
   - `Services/`, `Tickets/`, `Plans/`, `Architecture/`, `Incidents/`, `Runbooks/`
5. **Initialize registry** — create `_registry.md` at vault root if it doesn't exist:

```markdown
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
```

6. **Initialize MEMORY.md** — create `.claude/memory/MEMORY.md` if it doesn't exist:

```markdown
# Memory Index

## User

## Feedback

## Project

## Reference
```

7. **Report** — confirm: vault path, folders created, registry status, memory index status.

## Idempotent

Safe to run again — only creates what's missing, never overwrites.
