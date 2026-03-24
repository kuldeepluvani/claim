# /claim-status

Show CLAIM memory system health.

## Usage

```
/claim-status
```

## Steps

1. **Read MEMORY.md** — count memories by type
2. **Validate memory files** — every index entry has a corresponding file
3. **Check staleness** — flag memories older than 14 days (file modification time)
4. **Read vault registry** — count entries by section
5. **Check vault integrity** — files referenced in registry exist
6. **Report:**

```
CLAIM Status
━━━━━━━━━━━━

Tier 1 — Memory (.claude/memory/)
  user:      2
  feedback:  5
  project:   3
  reference: 1
  ─────────
  total:     11
  stale:     2 (>14 days)
  orphaned:  0 (index → missing file)

Tier 2 — Vault (~/.../MyVault)
  Services:     4
  Tickets:      6
  Plans:        3
  Architecture: 1
  Incidents:    0
  Runbooks:     2
  ─────────
  registry:     16
  orphaned:     0 (registry → missing file)
```

7. **Recommendations** if issues found:
   - Stale → review and update or remove
   - Orphaned → remove from index/registry
   - Missing folders → run `/claim-init`
   - Empty sections → note which types unused
