import { ClaimDatabase } from "../storage/sqlite";

interface ContextResult {
  text: string;
  tokens_est: number;
}

export function generateContext(
  db: ClaimDatabase,
  repo: string | null,
  branch: string | null,
  maxTokens: number = 500
): ContextResult {
  // No repo: return minimal context with observation count
  if (!repo || repo === "") {
    const counts = db.getCounts();
    const text = `[CLAIM] Active. ${counts.observations} observations stored.`;
    return { text, tokens_est: Math.ceil(text.length / 4) };
  }

  // Build context string for this repo
  let text = `[CLAIM] You're in ${repo}.`;

  if (branch) {
    text += ` Branch: ${branch}.`;
  }

  // Last session summary
  const sessions = db.getSessionsByRepo(repo, 3);
  if (sessions.length > 0 && sessions[0].summary) {
    const summary = sessions[0].summary.length > 100
      ? sessions[0].summary.slice(0, 100) + "..."
      : sessions[0].summary;
    text += `\nLast session: ${summary}`;
  }

  // Significant recent observations
  const observations = db.getRecentObservations(repo, 20);
  const significantCategories = new Set(["code_change", "deployment", "test"]);

  for (const obs of observations) {
    if (!obs.category || !significantCategories.has(obs.category)) continue;

    const content = obs.content.length > 80
      ? obs.content.slice(0, 80) + "..."
      : obs.content;
    const line = `\n- [${obs.category}] ${content}`;

    // Check token budget before adding
    if (Math.ceil((text.length + line.length) / 4) > maxTokens) {
      break;
    }

    text += line;
  }

  return { text, tokens_est: Math.ceil(text.length / 4) };
}
