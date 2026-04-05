import type { ObservationType, ObservationCategory } from "../shared/types";

interface Classification {
  type: ObservationType;
  category: ObservationCategory;
}

const BASH_PATTERNS: Array<{ pattern: RegExp; category: ObservationCategory }> = [
  { pattern: /git push|deploy/i, category: "deployment" },
  { pattern: /\btest\b|pytest|jest/i, category: "test" },
  { pattern: /git commit|git add/i, category: "code_change" },
  { pattern: /debug|console\.log/i, category: "debug" },
  { pattern: /gh pr|git diff/i, category: "review" },
];

export function classifyObservation(
  toolName: string,
  _filePath: string | null,
  content: string
): Classification {
  const type: ObservationType = "tool_use";

  if (toolName === "Edit" || toolName === "Write") {
    return { type, category: "code_change" };
  }

  if (toolName === "Bash") {
    for (const { pattern, category } of BASH_PATTERNS) {
      if (pattern.test(content)) {
        return { type, category };
      }
    }
  }

  return { type, category: null };
}
