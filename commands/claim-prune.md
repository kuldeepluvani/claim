# /claim-prune

Interactive cleanup for CLAIM memory and vault systems. Read `~/.claude/rules/claim.md` config for vault definitions.

Show findings for each category and **confirm before acting**.

## Steps

1. **Stale memories:** Check if referenced file paths still exist, projects still active, tools still in use. Propose removal for each stale entry.
2. **Duplicates:** Find memories with similar descriptions or overlapping content. Propose consolidation.
3. **Registry audit** (per vault): Entries without matching files, files without registry entries. Fix discrepancies.
4. **MEMORY.md line count:** If over `max_index_lines` threshold, suggest pruning oldest or least-relevant entries.

## Output

Report everything changed. Flag items needing human review with a clear marker.
