import { Database } from "bun:sqlite";
import { runMigrations } from "./migrations";
import type { Observation, Session } from "../shared/types";

export class ClaimDatabase {
  private db: Database;

  constructor(path: string) {
    this.db = new Database(path, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL");
    runMigrations(this.db);
  }

  listTables(): string[] {
    const rows = this.db
      .query("SELECT name FROM sqlite_master WHERE type='table' OR type='virtual table' ORDER BY name")
      .all() as { name: string }[];
    return rows.map((r) => r.name);
  }

  insertObservation(obs: Observation): void {
    this.db
      .query(
        `INSERT INTO observations (id, session_id, timestamp, type, category, tool_name, file_path, content, compressed, repo, branch, is_swept, is_private)
         VALUES ($id, $session_id, $timestamp, $type, $category, $tool_name, $file_path, $content, $compressed, $repo, $branch, $is_swept, $is_private)`
      )
      .run({
        $id: obs.id,
        $session_id: obs.session_id,
        $timestamp: obs.timestamp,
        $type: obs.type,
        $category: obs.category,
        $tool_name: obs.tool_name,
        $file_path: obs.file_path,
        $content: obs.content,
        $compressed: obs.compressed,
        $repo: obs.repo,
        $branch: obs.branch,
        $is_swept: obs.is_swept ? 1 : 0,
        $is_private: obs.is_private ? 1 : 0,
      });
  }

  getObservation(id: string): Observation | null {
    const row = this.db
      .query("SELECT * FROM observations WHERE id = $id")
      .get({ $id: id }) as Record<string, unknown> | null;

    if (!row) return null;

    return {
      ...row,
      is_swept: row.is_swept === 1,
      is_private: row.is_private === 1,
    } as Observation;
  }

  insertSession(session: { id: string; repo: string | null; branch: string | null; started_at: string }): void {
    this.db
      .query(
        `INSERT INTO sessions (id, repo, branch, started_at)
         VALUES ($id, $repo, $branch, $started_at)`
      )
      .run({
        $id: session.id,
        $repo: session.repo,
        $branch: session.branch,
        $started_at: session.started_at,
      });
  }

  getSession(id: string): Session | null {
    const row = this.db
      .query("SELECT * FROM sessions WHERE id = $id")
      .get({ $id: id }) as Session | null;

    return row ?? null;
  }

  endSession(id: string, summary: string, knowledgeType: string): void {
    const countRow = this.db
      .query("SELECT COUNT(*) as count FROM observations WHERE session_id = $id")
      .get({ $id: id }) as { count: number };

    this.db
      .query(
        `UPDATE sessions SET ended_at = $ended_at, summary = $summary, knowledge_type = $knowledge_type, observation_count = $count
         WHERE id = $id`
      )
      .run({
        $id: id,
        $ended_at: new Date().toISOString(),
        $summary: summary,
        $knowledge_type: knowledgeType,
        $count: countRow.count,
      });
  }

  search(query: string, limit: number = 20): Observation[] {
    const rows = this.db
      .query(
        `SELECT o.* FROM observations o
         JOIN observations_fts fts ON o.rowid = fts.rowid
         WHERE observations_fts MATCH $query AND o.is_private = 0
         ORDER BY fts.rank
         LIMIT $limit`
      )
      .all({ $query: query, $limit: limit }) as Record<string, unknown>[];

    return rows.map((row) => ({
      ...row,
      is_swept: row.is_swept === 1,
      is_private: row.is_private === 1,
    })) as Observation[];
  }

  getRecentObservations(repo: string, limit: number = 50): Observation[] {
    const rows = this.db
      .query(
        `SELECT * FROM observations WHERE repo = $repo AND is_private = 0
         ORDER BY timestamp DESC LIMIT $limit`
      )
      .all({ $repo: repo, $limit: limit }) as Record<string, unknown>[];

    return rows.map((row) => ({
      ...row,
      is_swept: row.is_swept === 1,
      is_private: row.is_private === 1,
    })) as Observation[];
  }

  getRecentSessions(limit: number = 10): Session[] {
    return this.db
      .query("SELECT * FROM sessions ORDER BY started_at DESC LIMIT $limit")
      .all({ $limit: limit }) as Session[];
  }

  getObservationsBySession(sessionId: string): Observation[] {
    const rows = this.db
      .query(
        `SELECT * FROM observations WHERE session_id = $id AND is_private = 0
         ORDER BY timestamp ASC`
      )
      .all({ $id: sessionId }) as Record<string, unknown>[];

    return rows.map((row) => ({
      ...row,
      is_swept: row.is_swept === 1,
      is_private: row.is_private === 1,
    })) as Observation[];
  }

  getTimeline(from?: string, to?: string, limit: number = 50): Observation[] {
    const conditions: string[] = ["is_private = 0"];
    const params: Record<string, unknown> = { $limit: limit };

    if (from) {
      conditions.push("timestamp >= $from");
      params.$from = from;
    }
    if (to) {
      conditions.push("timestamp <= $to");
      params.$to = to;
    }

    const where = conditions.join(" AND ");
    const rows = this.db
      .query(`SELECT * FROM observations WHERE ${where} ORDER BY timestamp DESC LIMIT $limit`)
      .all(params) as Record<string, unknown>[];

    return rows.map((row) => ({
      ...row,
      is_swept: row.is_swept === 1,
      is_private: row.is_private === 1,
    })) as Observation[];
  }

  getObservationsByIds(ids: string[]): Observation[] {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$id${i}`).join(", ");
    const params: Record<string, unknown> = {};
    ids.forEach((id, i) => { params[`$id${i}`] = id; });

    const rows = this.db
      .query(`SELECT * FROM observations WHERE id IN (${placeholders}) AND is_private = 0`)
      .all(params) as Record<string, unknown>[];

    return rows.map((row) => ({
      ...row,
      is_swept: row.is_swept === 1,
      is_private: row.is_private === 1,
    })) as Observation[];
  }

  getSessionsByRepo(repo: string, limit: number = 5): Session[] {
    return this.db
      .query("SELECT * FROM sessions WHERE repo = $repo ORDER BY started_at DESC LIMIT $limit")
      .all({ $repo: repo, $limit: limit }) as Session[];
  }

  getCounts(): { observations: number; sessions: number } {
    const obs = this.db.query("SELECT COUNT(*) as count FROM observations").get() as { count: number };
    const sess = this.db.query("SELECT COUNT(*) as count FROM sessions").get() as { count: number };
    return { observations: obs.count, sessions: sess.count };
  }

  close(): void {
    this.db.close();
  }
}
