---
name: memory-prune
description: Prune stale, outdated, or duplicate memories from both CLAIM tiers. Use when memory count is high, entries feel outdated, or user asks to clean up.
---

# Memory Prune

Systematically review and clean the CLAIM memory system.

## Process

### 1. Load State
- Read `MEMORY.md` index and each referenced file
- Note file modification dates via `ls -l`

### 2. Evaluate Each Memory

| Type | Check |
|:---|:---|
| user | Still true? Role/preference changes? Rarely stale. |
| feedback | Correction still relevant? Tool/pattern exists? |
| project | Project active? Status changed? Check dates. |
| reference | Resource exists? URL/path valid? |

### 3. Categorize
- **Keep** — accurate and useful
- **Update** — partially stale, refresh
- **Remove** — fully outdated or superseded
- **Merge** — two memories, same topic

### 4. Execute

Removals: delete file, remove MEMORY.md line.
Updates: edit file, update MEMORY.md description if changed.
Merges: combine content, delete duplicate, update MEMORY.md.

### 5. Report

```
Pruned: N removed, N updated, N merged
- REMOVED: file.md (reason)
- UPDATED: file.md (what changed)
- MERGED: a.md + b.md → a.md
```

## Safety
- Never auto-remove `user` type without confirmation
- Verify against current state before removing
- If unsure → flag for review, don't delete
