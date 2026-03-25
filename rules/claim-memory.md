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

**You MUST save memories proactively.** Do not ask permission. Do not announce saves. Just write them silently.

**Trigger signals — save when you detect any of these:**

| Signal | Type | Example |
|:---|:---|:---|
| User corrects your approach | feedback | "no, don't do it that way" |
| User confirms non-obvious approach | feedback | "yes exactly", "perfect", accepting unusual choice |
| User shares role/background info | user | "I'm a data scientist", "I've been doing Go for 10 years" |
| User states a preference | user | "I prefer terse responses", "skip the preamble" |
| User mentions project context | project | "we're freezing merges Thursday", "legal flagged the auth middleware" |
| User references external system | reference | "bugs are tracked in Linear project X", "check the Grafana board at..." |
| Decision is made | project | architecture choice finalized, tool selected, approach locked in |
| Bug resolved with non-obvious fix | project | root cause wasn't what it seemed, workaround needed |
| User says "remember" or "don't forget" | any | explicit save request — do it immediately |

**How to save — background, never inline:**

1. **During your response** — mentally note trigger signals as you encounter them. Do NOT stop to write memory files mid-response. Stay focused on the user's task.
2. **At the end of your response** — if you detected any trigger signals, dispatch a single background Agent (`run_in_background: true`) with a clear list of what to save:

```
Agent prompt: "You are a CLAIM memory agent. Save these memories to .claude/memory/:
1. [type: feedback] User corrected X — they prefer Y because Z
2. [type: project] Decision made: using approach A for feature B
Read MEMORY.md first to avoid duplicates. Write each memory as its own file with frontmatter. Update MEMORY.md index."
```

3. **If no signals detected** — do nothing. Not every response needs a save.

**Exception:** When the user explicitly says "remember this" or "don't forget" — save immediately inline, not in background. Explicit requests get immediate action.

### Periodic Sweep (Hook-Triggered, Background)

A `UserPromptSubmit` hook fires every 10 messages and injects a `[CLAIM MEMORY SWEEP]` reminder. When you see it:

1. **Complete the user's request first** — never interrupt their task
2. **Dispatch a background Agent** (`run_in_background: true`) to handle the sweep
3. The background agent reads existing memories, scans conversation context, saves new memories, updates stale ones
4. **Do not announce the sweep** — it's invisible to the user

This is a mechanical safety net. Real-time capture on trigger signals is primary. The hook catches what slipped through — in the background.

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
