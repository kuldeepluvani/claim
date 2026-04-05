import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync, existsSync } from "fs";
import { ClaimDatabase } from "../../src/storage/sqlite";

const TEST_DB = "/tmp/claim-test.db";

function cleanup() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = TEST_DB + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
}

describe("ClaimDatabase", () => {
  let db: ClaimDatabase;

  beforeEach(() => {
    cleanup();
    db = new ClaimDatabase(TEST_DB);
  });

  afterEach(() => {
    db.close();
    cleanup();
  });

  it("initializes with all tables", () => {
    const tables = db.listTables();
    expect(tables).toContain("observations");
    expect(tables).toContain("sessions");
    expect(tables).toContain("observations_fts");
  });

  it("inserts and retrieves an observation", () => {
    const obs = {
      id: "obs-1",
      session_id: "sess-1",
      timestamp: new Date().toISOString(),
      type: "discovery" as const,
      category: "debug" as const,
      tool_name: "Read",
      file_path: "/src/index.ts",
      content: "Found a bug in the parser",
      compressed: null,
      repo: "claim",
      branch: "v3",
      is_swept: false,
      is_private: false,
    };

    db.insertObservation(obs);
    const result = db.getObservation("obs-1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("obs-1");
    expect(result!.content).toBe("Found a bug in the parser");
    expect(result!.type).toBe("discovery");
    expect(result!.is_swept).toBe(false);
    expect(result!.is_private).toBe(false);
  });

  it("inserts and retrieves a session", () => {
    const session = {
      id: "sess-1",
      repo: "claim",
      branch: "v3",
      started_at: new Date().toISOString(),
    };

    db.insertSession(session);
    const result = db.getSession("sess-1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("sess-1");
    expect(result!.repo).toBe("claim");
    expect(result!.branch).toBe("v3");
    expect(result!.ended_at).toBeNull();
    expect(result!.summary).toBeNull();
  });

  it("searches observations with FTS", () => {
    const base = {
      session_id: "sess-1",
      timestamp: new Date().toISOString(),
      type: "discovery" as const,
      category: null,
      tool_name: null,
      file_path: null,
      compressed: null,
      repo: "claim",
      branch: "v3",
      is_swept: false,
      is_private: false,
    };

    db.insertObservation({ ...base, id: "obs-1", content: "SQLite migration schema design" });
    db.insertObservation({ ...base, id: "obs-2", content: "React component lifecycle hooks" });

    const results = db.search("SQLite migration");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("obs-1");
  });

  it("excludes private observations from search", () => {
    const base = {
      session_id: "sess-1",
      timestamp: new Date().toISOString(),
      type: "discovery" as const,
      category: null,
      tool_name: null,
      file_path: null,
      compressed: null,
      repo: "claim",
      branch: "v3",
      is_swept: false,
    };

    db.insertObservation({ ...base, id: "obs-1", content: "public database secret", is_private: false });
    db.insertObservation({ ...base, id: "obs-2", content: "private database credential", is_private: true });

    const results = db.search("database");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("obs-1");
  });

  it("counts observations and sessions", () => {
    db.insertObservation({
      id: "obs-1",
      session_id: "sess-1",
      timestamp: new Date().toISOString(),
      type: "tool_use" as const,
      category: null,
      tool_name: "Bash",
      file_path: null,
      content: "ran a command",
      compressed: null,
      repo: "claim",
      branch: "v3",
      is_swept: false,
      is_private: false,
    });

    db.insertSession({
      id: "sess-1",
      repo: "claim",
      branch: "v3",
      started_at: new Date().toISOString(),
    });

    const counts = db.getCounts();
    expect(counts.observations).toBe(1);
    expect(counts.sessions).toBe(1);
  });

  it("returns recent sessions ordered by start time", () => {
    db.insertSession({ id: "sess-1", repo: "claim", branch: "v3", started_at: "2026-04-01T10:00:00Z" });
    db.insertSession({ id: "sess-2", repo: "claim", branch: "v3", started_at: "2026-04-02T10:00:00Z" });
    db.insertSession({ id: "sess-3", repo: "claim", branch: "v3", started_at: "2026-04-03T10:00:00Z" });

    const results = db.getRecentSessions(2);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe("sess-3");
    expect(results[1].id).toBe("sess-2");
  });

  it("returns observations by session excluding private", () => {
    const base = {
      session_id: "sess-1",
      timestamp: "2026-04-01T10:00:00Z",
      type: "discovery" as const,
      category: null,
      tool_name: null,
      file_path: null,
      compressed: null,
      repo: "claim",
      branch: "v3",
      is_swept: false,
    };

    db.insertObservation({ ...base, id: "obs-1", content: "public observation", is_private: false });
    db.insertObservation({ ...base, id: "obs-2", content: "private observation", is_private: true });

    const results = db.getObservationsBySession("sess-1");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("obs-1");
    expect(results[0].is_private).toBe(false);
  });

  it("returns timeline filtered by date range", () => {
    const base = {
      session_id: "sess-1",
      type: "discovery" as const,
      category: null,
      tool_name: null,
      file_path: null,
      compressed: null,
      repo: "claim",
      branch: "v3",
      is_swept: false,
      is_private: false,
    };

    db.insertObservation({ ...base, id: "obs-1", content: "early", timestamp: "2026-04-01T10:00:00Z" });
    db.insertObservation({ ...base, id: "obs-2", content: "middle", timestamp: "2026-04-02T10:00:00Z" });
    db.insertObservation({ ...base, id: "obs-3", content: "late", timestamp: "2026-04-03T10:00:00Z" });

    const results = db.getTimeline("2026-04-01T12:00:00Z", "2026-04-02T12:00:00Z");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("obs-2");
  });

  it("returns observations by IDs", () => {
    const base = {
      session_id: "sess-1",
      timestamp: "2026-04-01T10:00:00Z",
      type: "discovery" as const,
      category: null,
      tool_name: null,
      file_path: null,
      compressed: null,
      repo: "claim",
      branch: "v3",
      is_swept: false,
      is_private: false,
    };

    db.insertObservation({ ...base, id: "obs-1", content: "first" });
    db.insertObservation({ ...base, id: "obs-2", content: "second" });
    db.insertObservation({ ...base, id: "obs-3", content: "third" });

    const results = db.getObservationsByIds(["obs-1", "obs-3"]);
    expect(results.length).toBe(2);
    const ids = results.map((r) => r.id).sort();
    expect(ids).toEqual(["obs-1", "obs-3"]);
  });

  it("returns sessions by repo", () => {
    db.insertSession({ id: "sess-1", repo: "claim", branch: "v3", started_at: "2026-04-01T10:00:00Z" });
    db.insertSession({ id: "sess-2", repo: "other-repo", branch: "main", started_at: "2026-04-02T10:00:00Z" });
    db.insertSession({ id: "sess-3", repo: "claim", branch: "v3", started_at: "2026-04-03T10:00:00Z" });

    const results = db.getSessionsByRepo("claim");
    expect(results.length).toBe(2);
    expect(results[0].id).toBe("sess-3");
    expect(results[1].id).toBe("sess-1");
  });
});
