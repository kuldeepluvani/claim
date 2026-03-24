# /claim-prune

Clean up stale, outdated, or duplicate memories.

## Usage

```
/claim-prune [--dry-run]
```

- `--dry-run` — show what would change without making changes (default: false)

## Steps

1. **Load** — read MEMORY.md and all referenced memory files
2. **Evaluate each memory:**

| Type | Staleness Check |
|:---|:---|
| user | Still true? Role/preference changes. Rarely stale. |
| feedback | Correction still relevant? Tool/pattern still exists? |
| project | Project still active? Status changed? |
| reference | Resource still exists? URL/path valid? |

3. **Categorize** — Keep, Update, Remove, or Merge
4. **Execute** (unless `--dry-run`):
   - Remove: delete file + remove MEMORY.md line
   - Update: edit file + update MEMORY.md description if changed
   - Merge: combine into one, delete duplicate, update MEMORY.md
5. **Report:**

```
Pruned: 3 removed, 2 updated, 1 merged
- REMOVED: project_old.md (completed 2 months ago)
- UPDATED: project_current.md (status → in-progress)
- MERGED: user_prefs.md + user_style.md → user_prefs.md
```

## Safety

- Never auto-remove `user` type without confirmation — hard to reconstruct
- Verify staleness against current code/state before removing
- If unsure, flag for review instead of deleting
