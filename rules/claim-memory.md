---
description: CLAIM core — autonomous memory capture, typed memories, MEMORY.md index discipline
alwaysApply: true
---

# CLAIM — Claude AI Memory

<!--
claim-config:
  vault_path: ""
  vault_folders:
    - Services
    - Tickets
    - Plans
    - Architecture
    - Incidents
    - Runbooks
  custom_types: []
  # custom_types example:
  #   - name: recipe
  #     description: "Reusable patterns and solutions"
  #     when_to_save: "When a non-obvious solution works"
  #     body_structure: "Pattern, Context, Example"
-->

## Memory System

You have a persistent, file-based memory system at the project-scoped `.claude/memory/` directory. Build this up over time so future conversations have a complete picture of the user, their preferences, and the context behind their work.

### Capture Mode: Autonomous

Save memories silently at natural breakpoints — after decisions, corrections, new context learned. Do not ask permission. Do not announce saves unless directly relevant to the conversation.

### Memory Types

**user** — Role, goals, preferences, knowledge.
- **When to save:** When you learn details about the user's role, preferences, responsibilities, or expertise.
- **How to use:** Tailor behavior — collaborate differently with a senior engineer vs a first-time coder.

**feedback** — How the user wants you to work. Record corrections AND confirmations.
- **When to save:** When the user corrects your approach OR confirms a non-obvious approach worked.
- **How to use:** Follow these so the user never gives the same guidance twice.
- **Body:** Rule first, then `**Why:**` and `**How to apply:**`.

**project** — Ongoing work, goals, decisions, bugs not derivable from code/git.
- **When to save:** When you learn who is doing what, why, or by when. Convert relative dates to absolute.
- **How to use:** Understand broader context behind requests.
- **Body:** Fact/decision first, then `**Why:**` and `**How to apply:**`.

**reference** — Pointers to information in external systems.
- **When to save:** When you learn about resources in external systems and their purpose.
- **How to use:** When the user references an external system.

### Saving a Memory (Two Steps — Both Required)

**Step 1:** Write the memory to its own file with frontmatter:

```markdown
---
name: {{memory name}}
description: {{one-line — specific enough to judge relevance in future sessions}}
type: {{user | feedback | project | reference}}
---

{{content}}
```

**Step 2:** Add a pointer in `MEMORY.md`. The index has only links + brief descriptions — never content directly.

### What NOT to Save

- Code patterns, architecture, file paths — derivable from reading code
- Git history — `git log` / `git blame` are authoritative
- Debug solutions — the fix is in the code
- Anything already in CLAUDE.md
- Ephemeral task details

### When to Access

- When memories seem relevant or user references prior conversations
- **MUST** access when user asks to check, recall, or remember
- If user says ignore memory — don't cite, compare, or mention it

### Staleness

Memories are point-in-time. Before acting on one:
- File path → check it exists
- Function/flag → grep for it
- Conflicts with current state → trust what you observe now, update the stale memory

### Index Discipline

- Organize `MEMORY.md` by topic, not chronologically
- Keep under 200 lines — always loaded into context
- Update or remove wrong/outdated memories
- Check for existing memories before creating duplicates
