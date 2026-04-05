import type { ClaimConfig } from "../shared/types";

export function generateVaultSection(config: ClaimConfig): string {
  const { entries } = config.vaults;

  if (!entries || entries.length === 0) {
    return "## Vault System\n\nNo vaults configured. Run `claim init` and edit `~/.claim/config.toml` to add vault entries.\n";
  }

  const lines: string[] = ["## Vault System\n"];
  lines.push(`Default vault: **${config.vaults.default}**\n`);

  for (const vault of entries) {
    lines.push(`### ${vault.name}`);
    lines.push(`- **Path:** \`${vault.path}\``);
    lines.push(`- **Purpose:** ${vault.purpose}`);
    if (vault.routes.length > 0) {
      lines.push("- **Routes:**");
      for (const route of vault.routes) {
        lines.push(`  - \`${route.match.join(", ")}\` → \`${route.folder}/\``);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function generateRulesFile(config: ClaimConfig): string {
  const sections: string[] = [];

  // Frontmatter
  sections.push(`---
alwaysApply: true
---`);

  // Title
  sections.push("# CLAIM — Developer Knowledge OS");
  sections.push(
    "CLAIM captures developer observations, decisions, and discoveries during coding sessions and stores them for future context retrieval.\n"
  );

  // Memory Capture
  sections.push(`## Memory Capture

### What to Capture
- **Decisions:** Architecture choices, trade-offs evaluated, alternatives rejected
- **Discoveries:** Bugs found and root causes, undocumented behaviors, performance insights
- **Errors:** Repeated failures with solutions, environment-specific issues
- **Summaries:** Session outcomes, what was accomplished, what remains

### What NOT to Capture
- Syntax errors and typos (ephemeral, no lasting value)
- Temporary debug output or console.log additions
- Boilerplate code or easily Googled documentation
- Secrets, tokens, credentials, or private keys

### How to Save
Write memory files to \`~/.claude/memory/\` with descriptive filenames and YAML frontmatter:

\`\`\`yaml
---
tags: [memory-type]
date: YYYY-MM-DD
related: ["context"]
---
\`\`\`

Observations are automatically captured by CLAIM hooks — no manual action needed for tool-use events.`);

  // Vault System
  sections.push(generateVaultSection(config));

  // Search Protocol
  sections.push(`## Search Protocol

| Priority | Source | When | Cost |
|:---------|:-------|:-----|:-----|
| 1 | \`_registry.md\` | Always first — find what exists, where, summary | 1 Read |
| 2 | Specific note | Registry summary insufficient | 1 Read |
| 3 | Codebase \`Grep\`/\`Glob\` | Current code state needed | 1-2 calls |
| 4 | Cross-reference | Answer spans multiple services/tickets | Parallel Reads |

**Registry-first. Never blind-glob the vault.**`);

  // Write Discipline
  sections.push(`## Write Discipline

Every vault write is **two operations**:
1. Write or update the target note
2. Update \`_registry.md\` — add a new row or modify the existing entry

Never write to a vault without updating the registry.`);

  // Status Footer
  sections.push(`## CLAIM Status

- **Worker URL:** \`http://localhost:${config.claim.port}\`
- **Data dir:** \`${config.claim.data_dir}\`
- **Capture mode:** \`${config.capture.mode}\``);

  return sections.join("\n\n") + "\n";
}
