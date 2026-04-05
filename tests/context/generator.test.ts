import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync, existsSync } from "fs";
import { ClaimDatabase } from "../../src/storage/sqlite";
import { generateContext } from "../../src/context/generator";

const TEST_DB = "/tmp/claim-context-generator-test.db";

function cleanupDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = TEST_DB + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
}

describe("Context Generator", () => {
  let db: ClaimDatabase;

  beforeEach(() => {
    cleanupDb();
    db = new ClaimDatabase(TEST_DB);
  });

  afterEach(() => {
    db.close();
    cleanupDb();
  });

  it("returns minimal context when no repo", () => {
    // Insert some observations so count is non-zero
    db.insertSession({ id: "s1", repo: "some-repo", branch: "main", started_at: new Date().toISOString() });
    db.insertObservation({
      id: "obs1",
      session_id: "s1",
      timestamp: new Date().toISOString(),
      type: "tool_use",
      category: "code_change",
      tool_name: "Edit",
      file_path: "/src/index.ts",
      content: "changed something",
      compressed: null,
      repo: "some-repo",
      branch: "main",
      is_swept: false,
      is_private: false,
    });

    const result = generateContext(db, null, null);
    expect(result.text).toContain("[CLAIM] Active.");
    expect(result.text).toContain("1 observations stored");
    expect(result.tokens_est).toBeGreaterThan(0);
  });

  it("includes repo name when provided", () => {
    db.insertSession({ id: "s1", repo: "my-service", branch: "main", started_at: new Date().toISOString() });

    const result = generateContext(db, "my-service", "main");
    expect(result.text).toContain("my-service");
    expect(result.text).toContain("Branch: main");
  });

  it("includes last session summary when available", () => {
    db.insertSession({ id: "s1", repo: "my-service", branch: "main", started_at: new Date().toISOString() });
    db.endSession("s1", "Fixed the auth bug in login flow", "debug");

    const result = generateContext(db, "my-service", null);
    expect(result.text).toContain("Last session:");
    expect(result.text).toContain("Fixed the auth bug");
  });

  it("respects token budget", () => {
    db.insertSession({ id: "s1", repo: "my-service", branch: "main", started_at: new Date().toISOString() });
    db.endSession("s1", "Did a bunch of work on the service", "debug");

    // Insert many observations
    for (let i = 0; i < 20; i++) {
      db.insertObservation({
        id: `obs${i}`,
        session_id: "s1",
        timestamp: new Date().toISOString(),
        type: "tool_use",
        category: "code_change",
        tool_name: "Edit",
        file_path: `/src/file${i}.ts`,
        content: `Changed file ${i} with some long description of what happened during the edit process`,
        compressed: null,
        repo: "my-service",
        branch: "main",
        is_swept: false,
        is_private: false,
      });
    }

    const result = generateContext(db, "my-service", "main", 20);
    expect(result.tokens_est).toBeLessThanOrEqual(25); // small budget, allow slight overshoot from base text
  });

  it("handles empty database", () => {
    const result = generateContext(db, "nonexistent-repo", "main");
    expect(result.text).toContain("nonexistent-repo");
    expect(result.tokens_est).toBeGreaterThan(0);
  });
});
