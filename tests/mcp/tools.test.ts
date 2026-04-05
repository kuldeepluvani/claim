import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync, existsSync } from "fs";
import { ClaimDatabase } from "../../src/storage/sqlite";
import { claimSearch, claimTimeline, claimGet } from "../../src/mcp/tools";
import type { Observation } from "../../src/shared/types";

const TEST_DB = "/tmp/claim-mcp-tools-test.db";

function cleanup() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = TEST_DB + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
}

function makeObs(overrides: Partial<Observation> = {}): Observation {
  return {
    id: "obs-1",
    session_id: "sess-1",
    timestamp: "2026-04-01T10:30:00Z",
    type: "discovery",
    category: "debug",
    tool_name: "Read",
    file_path: "/src/index.ts",
    content: "Found a bug in the parser",
    compressed: null,
    repo: "claim",
    branch: "v3",
    is_swept: false,
    is_private: false,
    ...overrides,
  };
}

describe("MCP tools", () => {
  let db: ClaimDatabase;

  beforeEach(() => {
    cleanup();
    db = new ClaimDatabase(TEST_DB);

    // Seed data
    db.insertSession({ id: "sess-1", repo: "claim", branch: "v3", started_at: "2026-04-01T10:00:00Z" });
    db.insertObservation(makeObs({ id: "obs-1", content: "SQLite migration schema design" }));
    db.insertObservation(makeObs({ id: "obs-2", content: "React component lifecycle hooks", timestamp: "2026-04-01T11:00:00Z" }));
    db.insertObservation(makeObs({ id: "obs-3", content: "Bun test runner configuration", timestamp: "2026-04-02T10:00:00Z" }));
  });

  afterEach(() => {
    db.close();
    cleanup();
  });

  describe("claimSearch", () => {
    it("returns compact results for FTS query", () => {
      const results = claimSearch(db, "SQLite migration");
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("obs-1");
      expect(results[0].summary).toBe("SQLite migration schema design");
      // Compact results should not include full content or file_path
      expect((results[0] as any).content).toBeUndefined();
      expect((results[0] as any).file_path).toBeUndefined();
    });

    it("filters by repo when provided", () => {
      db.insertObservation(makeObs({ id: "obs-4", repo: "other-repo", content: "Different repo observation" }));

      const results = claimSearch(db, "", 20, "claim");
      const ids = results.map((r) => r.id);
      expect(ids).not.toContain("obs-4");
    });

    it("returns empty array when no matches", () => {
      const results = claimSearch(db, "nonexistent");
      expect(results.length).toBe(0);
    });

    it("respects limit parameter", () => {
      const results = claimSearch(db, "component OR migration OR configuration", 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe("claimTimeline", () => {
    it("returns chronological observations", () => {
      const results = claimTimeline(db, { limit: 50 });
      expect(results.length).toBe(3);
      // compact format
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("summary");
    });

    it("filters by date range", () => {
      const results = claimTimeline(db, {
        from: "2026-04-01T10:45:00Z",
        to: "2026-04-01T12:00:00Z",
      });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("obs-2");
    });

    it("returns observations by session_id", () => {
      const results = claimTimeline(db, { session_id: "sess-1" });
      expect(results.length).toBe(3);
    });

    it("returns empty for non-existent session", () => {
      const results = claimTimeline(db, { session_id: "nonexistent" });
      expect(results.length).toBe(0);
    });
  });

  describe("claimGet", () => {
    it("returns full observations by IDs", () => {
      const results = claimGet(db, ["obs-1", "obs-3"]);
      expect(results.length).toBe(2);
      // Full observations should have content
      expect(results[0].content).toBeDefined();
      expect(results[0].content.length).toBeGreaterThan(0);
    });

    it("returns empty array for empty IDs", () => {
      const results = claimGet(db, []);
      expect(results.length).toBe(0);
    });

    it("returns only found observations for mixed valid/invalid IDs", () => {
      const results = claimGet(db, ["obs-1", "nonexistent"]);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("obs-1");
    });
  });

  describe("empty database", () => {
    it("handles search on empty db", () => {
      const emptyDb = new ClaimDatabase("/tmp/claim-mcp-empty-test.db");
      try {
        const results = claimSearch(emptyDb, "anything");
        expect(results.length).toBe(0);
      } finally {
        emptyDb.close();
        for (const suffix of ["", "-wal", "-shm"]) {
          const f = "/tmp/claim-mcp-empty-test.db" + suffix;
          if (existsSync(f)) unlinkSync(f);
        }
      }
    });

    it("handles timeline on empty db", () => {
      const emptyDb = new ClaimDatabase("/tmp/claim-mcp-empty-test.db");
      try {
        const results = claimTimeline(emptyDb, {});
        expect(results.length).toBe(0);
      } finally {
        emptyDb.close();
        for (const suffix of ["", "-wal", "-shm"]) {
          const f = "/tmp/claim-mcp-empty-test.db" + suffix;
          if (existsSync(f)) unlinkSync(f);
        }
      }
    });

    it("handles get on empty db", () => {
      const emptyDb = new ClaimDatabase("/tmp/claim-mcp-empty-test.db");
      try {
        const results = claimGet(emptyDb, ["any-id"]);
        expect(results.length).toBe(0);
      } finally {
        emptyDb.close();
        for (const suffix of ["", "-wal", "-shm"]) {
          const f = "/tmp/claim-mcp-empty-test.db" + suffix;
          if (existsSync(f)) unlinkSync(f);
        }
      }
    });
  });
});
