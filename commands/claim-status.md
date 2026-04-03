# /claim-status

Run a health check across all CLAIM-configured vaults. Read `~/.claude/rules/claim.md` config for vault definitions.

## Report

**Per vault:**
- Name, path, purpose
- Folder count: expected vs actual on disk
- Registry entries vs actual note files (detect orphans and missing entries)
- Last modified note (filename + timestamp)

**Memory tier:**
- Total memory files in `~/.claude/memory/`
- Count by type (user, feedback)
- MEMORY.md line count vs `max_index_lines` threshold

**Sweep:**
- Read `~/.claim/.sweep-state` — show prompt count, last sweep time (human-readable), configured intervals
- Hook script exists and is executable: yes/no
- Hook registered in settings.json: yes/no

**Config summary:** capture_mode, save_mode, sweep settings, default_vault
