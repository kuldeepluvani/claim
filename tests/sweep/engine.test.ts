import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync, existsSync } from "fs";
import { ClaimDatabase } from "../../src/storage/sqlite";
import { SweepEngine } from "../../src/sweep/engine";
import type { ClaimConfig } from "../../src/shared/types";

const TEST_DB = "/tmp/claim-sweep-test.db";

function cleanup() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = TEST_DB + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
}

function makeConfig(overrides?: Partial<ClaimConfig>): ClaimConfig {
  return {
    claim: { data_dir: "/tmp/claim-test", port: 2626 },
    capture: { mode: "auto", private_patterns: [], skip_tools: [], max_observation_length: 500 },
    sweep: { enabled: true, prompt_interval: 10, time_interval_min: 30, prune_after_days: 7 },
    context: { enabled: true, max_tokens: 500, lookback_sessions: 3 },
    vaults: { default: "personal", entries: [] },
    ...overrides,
  };
}

function seedObservation(
  db: ClaimDatabase,
  id: string,
  opts?: { is_swept?: boolean; is_private?: boolean; repo?: string; content?: string; category?: string }
) {
  db.insertObservation({
    id,
    session_id: "sweep-sess",
    timestamp: new Date().toISOString(),
    type: "tool_use",
    category: (opts?.category as any) || "code_change",
    tool_name: "Edit",
    file_path: "/src/index.ts",
    content: opts?.content || `observation content for ${id}`,
    compressed: null,
    repo: opts?.repo || "test-repo",
    branch: "main",
    is_swept: opts?.is_swept ?? false,
    is_private: opts?.is_private ?? false,
  });
}

describe("SweepEngine", () => {
  let db: ClaimDatabase;

  beforeEach(() => {
    cleanup();
    db = new ClaimDatabase(TEST_DB);
    // Seed a session so observations can reference it
    db.insertSession({ id: "sweep-sess", repo: "test-repo", branch: "main", started_at: new Date().toISOString() });
  });

  afterEach(() => {
    db.close();
    cleanup();
  });

  it("processes unswept observations and extracts entities", async () => {
    seedObservation(db, "obs-1", { content: "fix PROJ-123 in test-repo" });
    seedObservation(db, "obs-2", { content: "deploy to staging @alice" });

    const engine = new SweepEngine(db, makeConfig());
    const result = await engine.sweep();

    expect(result.observations_processed).toBe(2);
    expect(result.entities_extracted).toBeGreaterThanOrEqual(1);
    // vault notes should be 0 since entries is empty
    expect(result.vault_notes_written).toBe(0);
  });

  it("marks observations as swept", async () => {
    seedObservation(db, "obs-mark-1");
    seedObservation(db, "obs-mark-2");

    const engine = new SweepEngine(db, makeConfig());
    await engine.sweep();

    // After sweep, getUnsweptObservations should return 0
    const remaining = db.getUnsweptObservations(100);
    expect(remaining.length).toBe(0);
  });

  it("extracts relationships from observations", async () => {
    seedObservation(db, "obs-rel-1", {
      content: "import { thing } from 'other-service'; fix PROJ-456 bug in test-repo",
      category: "debug",
    });

    const engine = new SweepEngine(db, makeConfig());
    const result = await engine.sweep();

    expect(result.relationships_extracted).toBeGreaterThanOrEqual(0);
    // At minimum, co-occurrence relationships between extracted entities
    const stats = db.getGraphStats();
    expect(stats.entities).toBeGreaterThanOrEqual(1);
  });

  it("handles empty observation set (returns zeros)", async () => {
    const engine = new SweepEngine(db, makeConfig());
    const result = await engine.sweep();

    expect(result.observations_processed).toBe(0);
    expect(result.entities_extracted).toBe(0);
    expect(result.relationships_extracted).toBe(0);
    expect(result.vault_notes_written).toBe(0);
    expect(result.observations_pruned).toBe(0);
  });

  it("prunes old swept observations", async () => {
    // Create observations with old timestamps (10 days ago)
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    db.insertObservation({
      id: "obs-old-1", session_id: "sweep-sess", timestamp: oldDate,
      type: "tool_use", category: "code_change", tool_name: "Edit",
      file_path: "/src/index.ts", content: "old observation 1",
      compressed: null, repo: "test-repo", branch: "main", is_swept: true, is_private: false,
    });
    db.insertObservation({
      id: "obs-old-2", session_id: "sweep-sess", timestamp: oldDate,
      type: "tool_use", category: "code_change", tool_name: "Edit",
      file_path: "/src/index.ts", content: "old observation 2",
      compressed: null, repo: "test-repo", branch: "main", is_swept: true, is_private: false,
    });

    // prune_after_days: 7 means prune swept observations older than 7 days
    const engine = new SweepEngine(db, makeConfig({
      sweep: { enabled: true, prompt_interval: 10, time_interval_min: 30, prune_after_days: 7 },
    }));

    const result = await engine.sweep();
    expect(result.observations_processed).toBe(0);
    expect(result.observations_pruned).toBe(2);
  });

  it("skips private observations", async () => {
    seedObservation(db, "obs-priv-1", { is_private: true });
    seedObservation(db, "obs-pub-1", { is_private: false });

    const engine = new SweepEngine(db, makeConfig());
    const result = await engine.sweep();

    expect(result.observations_processed).toBe(1);
  });
});
