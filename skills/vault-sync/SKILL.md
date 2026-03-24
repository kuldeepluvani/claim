---
name: vault-sync
description: Sync and validate vault integrity — ensure registry matches actual vault contents, fix orphans, update stale entries. Use when vault feels out of sync or after bulk operations.
---

# Vault Sync

Reconcile the vault registry with actual vault contents.

## Process

### 1. Read Registry
- Read `_registry.md` from vault root
- Parse all sections and entries

### 2. Scan Vault Folders
- For each configured vault folder (`Services/`, `Tickets/`, etc.)
- List all `.md` files present
- Read frontmatter of each

### 3. Diff

| Condition | Action |
|:---|:---|
| In registry, file missing | Remove from registry OR flag for review |
| File exists, not in registry | Add to registry with metadata from frontmatter |
| Registry entry outdated (wrong status, etc.) | Update registry from frontmatter |

### 4. Validate Frontmatter
- Each note has required fields for its folder type
- Wikilinks reference notes that exist
- Dates are valid

### 5. Execute Fixes
- Update `_registry.md` with corrections
- Report what changed

### 6. Report

```
Vault Sync Complete
- Added to registry: 3 notes
- Removed from registry: 1 orphan
- Updated: 2 entries (status changed)
- Warnings: 1 note missing frontmatter
```

## Safety
- Never delete vault notes — only update registry
- Flag questionable items for human review
- Idempotent — safe to run repeatedly
