import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { unlinkSync, existsSync } from "fs";
import { ClaimDatabase } from "../../src/storage/sqlite";
import { printObservations, printSessions } from "../../src/cli/search";
import type { Observation, Session } from "../../src/shared/types";

const TEST_DB = "/tmp/claim-search-test.db";

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

describe("search CLI", () => {
  let db: ClaimDatabase;

  beforeEach(() => {
    cleanup();
    db = new ClaimDatabase(TEST_DB);
  });

  afterEach(() => {
    db.close();
    cleanup();
  });

  it("formats observation output correctly", () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const obs = [makeObs()];
    printObservations(obs);

    spy.mockRestore();

    expect(logs.length).toBe(2);
    expect(logs[0]).toContain("2026-04-01 10:30:00");
    expect(logs[0]).toContain("[debug]");
    expect(logs[0]).toContain("claim");
    expect(logs[0]).toContain("Found a bug in the parser");
    expect(logs[1]).toContain("1 result(s)");
  });

  it("truncates long content to 80 chars", () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const longContent = "A".repeat(100);
    const obs = [makeObs({ content: longContent })];
    printObservations(obs);

    spy.mockRestore();

    // Should be truncated: 77 chars + "..."
    expect(logs[0]).toContain("A".repeat(77) + "...");
    expect(logs[0]).not.toContain("A".repeat(78));
  });

  it("handles empty results gracefully", () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    printObservations([]);

    spy.mockRestore();

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain("0 result(s)");
  });

  it("formats session output correctly", () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const sessions: Session[] = [
      {
        id: "sess-1",
        repo: "claim",
        branch: "v3",
        started_at: "2026-04-01T10:00:00Z",
        ended_at: "2026-04-01T11:00:00Z",
        summary: "Implemented search CLI",
        observation_count: 5,
        knowledge_type: "feature",
      },
    ];
    printSessions(sessions);

    spy.mockRestore();

    expect(logs[0]).toContain("2026-04-01 10:00:00");
    expect(logs[0]).toContain("claim");
    expect(logs[0]).toContain("[5 obs]");
    expect(logs[0]).toContain("Implemented search CLI");
    expect(logs[1]).toContain("1 session(s)");
  });

  it("FTS search returns matching observations", () => {
    const base = makeObs({ category: null, tool_name: null, file_path: null });
    db.insertObservation({ ...base, id: "obs-1", content: "SQLite migration schema design" });
    db.insertObservation({ ...base, id: "obs-2", content: "React component lifecycle hooks" });

    const results = db.search("SQLite migration");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("obs-1");
  });

  it("shows (no summary) for sessions without summary", () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const sessions: Session[] = [
      {
        id: "sess-1",
        repo: null,
        branch: null,
        started_at: "2026-04-01T10:00:00Z",
        ended_at: null,
        summary: null,
        observation_count: 0,
        knowledge_type: null,
      },
    ];
    printSessions(sessions);

    spy.mockRestore();

    expect(logs[0]).toContain("(no summary)");
    expect(logs[0]).toContain("-"); // null repo shows as "-"
  });
});
