import { ClaimDatabase } from "../storage/sqlite";
import type { Observation } from "../shared/types";

export function claimSearch(db: ClaimDatabase, query: string, limit = 20, repo?: string) {
  if (repo) {
    return db.getRecentObservations(repo, limit).map(compact);
  }
  return db.search(query, limit).map(compact);
}

export function claimTimeline(db: ClaimDatabase, opts: {
  from?: string;
  to?: string;
  session_id?: string;
  limit?: number;
}) {
  if (opts.session_id) {
    return db.getObservationsBySession(opts.session_id).map(compact);
  }
  return db.getTimeline(opts.from, opts.to, opts.limit || 50).map(compact);
}

export function claimGet(db: ClaimDatabase, ids: string[]) {
  return db.getObservationsByIds(ids);
}

function compact(obs: Observation) {
  return {
    id: obs.id,
    timestamp: obs.timestamp,
    type: obs.type,
    category: obs.category,
    tool_name: obs.tool_name,
    repo: obs.repo,
    summary: obs.content?.slice(0, 100) || "",
  };
}
