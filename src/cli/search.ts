import { ClaimDatabase } from "../storage/sqlite";
import { PATHS } from "../shared/paths";
import type { Observation, Session } from "../shared/types";

export async function searchCommand(args: string[]): Promise<void> {
  const db = new ClaimDatabase(PATHS.dbFile);

  try {
    if (args.includes("--recent")) {
      const obs = db.getRecentObservations("", 20);
      printObservations(obs);
    } else if (args.includes("--sessions")) {
      const sessions = db.getRecentSessions(10);
      printSessions(sessions);
    } else {
      const query = args.filter((a) => !a.startsWith("--")).join(" ");
      if (!query) {
        console.log("Usage: claim search <query> | --recent | --sessions");
        return;
      }
      const results = db.search(query, 20);
      if (results.length === 0) {
        console.log("  No results found.");
        return;
      }
      printObservations(results);
    }
  } finally {
    db.close();
  }
}

export function printObservations(obs: Observation[]): void {
  for (const o of obs) {
    const time = o.timestamp.slice(0, 19).replace("T", " ");
    const cat = o.category || o.type;
    const repo = o.repo || "-";
    const content = o.content.length > 80 ? o.content.slice(0, 77) + "..." : o.content;
    console.log(`  ${time}  [${cat}]  ${repo}  ${content}`);
  }
  console.log(`\n  ${obs.length} result(s)`);
}

export function printSessions(sessions: Session[]): void {
  for (const s of sessions) {
    const time = s.started_at.slice(0, 19).replace("T", " ");
    const repo = s.repo || "-";
    const summary = s.summary ? s.summary.slice(0, 60) : "(no summary)";
    console.log(`  ${time}  ${repo}  [${s.observation_count} obs]  ${summary}`);
  }
  console.log(`\n  ${sessions.length} session(s)`);
}
