import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync, existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { ClaimDatabase } from "../../src/storage/sqlite";
import { exportCommand } from "../../src/cli/export";
import { importCommand } from "../../src/cli/import";
import { PATHS } from "../../src/shared/paths";
import type { Observation } from "../../src/shared/types";

const TEST_DB = "/tmp/claim-export-import-test.db";
const TEST_EXPORT_DIR = "/tmp/claim-export-test-output";

function cleanupDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = TEST_DB + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
}

function cleanupExport() {
  if (existsSync(TEST_EXPORT_DIR)) {
    rmSync(TEST_EXPORT_DIR, { recursive: true });
  }
}

function makeObs(id: string, content: string): Observation {
  return {
    id,
    session_id: "sess-1",
    timestamp: "2026-04-01T10:30:00Z",
    type: "discovery",
    category: "debug",
    tool_name: "Read",
    file_path: "/src/index.ts",
    content,
    compressed: null,
    repo: "claim",
    branch: "v3",
    is_swept: false,
    is_private: false,
  };
}

describe("export and import", () => {
  let originalDbFile: string;

  beforeEach(() => {
    cleanupDb();
    cleanupExport();
    // Temporarily override PATHS.dbFile for testing
    originalDbFile = PATHS.dbFile;
    (PATHS as { dbFile: string }).dbFile = TEST_DB;
  });

  afterEach(() => {
    (PATHS as { dbFile: string }).dbFile = originalDbFile;
    cleanupDb();
    cleanupExport();
  });

  it("exports database to directory with expected files", async () => {
    // Seed data
    const db = new ClaimDatabase(TEST_DB);
    db.insertSession({ id: "sess-1", repo: "claim", branch: "v3", started_at: "2026-04-01T10:00:00Z" });
    db.insertObservation(makeObs("obs-1", "First observation"));
    db.insertObservation(makeObs("obs-2", "Second observation"));
    db.upsertEntity({ name: "claim-service", type: "service" });
    db.close();

    await exportCommand(["--output", TEST_EXPORT_DIR]);

    // Find the exported directory (name includes date)
    const entries = require("fs").readdirSync(TEST_EXPORT_DIR);
    expect(entries.length).toBe(1);

    const exportDir = join(TEST_EXPORT_DIR, entries[0]);
    expect(existsSync(join(exportDir, "observations.jsonl"))).toBe(true);
    expect(existsSync(join(exportDir, "sessions.json"))).toBe(true);
    expect(existsSync(join(exportDir, "entities.json"))).toBe(true);
    expect(existsSync(join(exportDir, "relationships.json"))).toBe(true);
    expect(existsSync(join(exportDir, "metadata.json"))).toBe(true);

    // Check metadata counts
    const metadata = JSON.parse(readFileSync(join(exportDir, "metadata.json"), "utf-8"));
    expect(metadata.counts.observations).toBe(2);
    expect(metadata.counts.sessions).toBe(1);
    expect(metadata.counts.entities).toBe(1);
  });

  it("imports exported data into a fresh database", async () => {
    // Seed and export
    const db = new ClaimDatabase(TEST_DB);
    db.insertSession({ id: "sess-1", repo: "claim", branch: "v3", started_at: "2026-04-01T10:00:00Z" });
    db.insertObservation(makeObs("obs-1", "First observation"));
    db.close();

    await exportCommand(["--output", TEST_EXPORT_DIR]);

    // Clear the DB
    cleanupDb();
    const freshDb = new ClaimDatabase(TEST_DB);
    const countsBefore = freshDb.getCounts();
    expect(countsBefore.observations).toBe(0);
    freshDb.close();

    // Import
    const entries = require("fs").readdirSync(TEST_EXPORT_DIR);
    const exportDir = join(TEST_EXPORT_DIR, entries[0]);
    await importCommand([exportDir]);

    // Verify
    const verifyDb = new ClaimDatabase(TEST_DB);
    const countsAfter = verifyDb.getCounts();
    expect(countsAfter.observations).toBe(1);
    expect(countsAfter.sessions).toBe(1);
    verifyDb.close();
  });

  it("skips duplicates on re-import", async () => {
    // Seed
    const db = new ClaimDatabase(TEST_DB);
    db.insertSession({ id: "sess-1", repo: "claim", branch: "v3", started_at: "2026-04-01T10:00:00Z" });
    db.insertObservation(makeObs("obs-1", "First observation"));
    db.close();

    await exportCommand(["--output", TEST_EXPORT_DIR]);

    // Import into the same DB (should skip duplicates)
    const entries = require("fs").readdirSync(TEST_EXPORT_DIR);
    const exportDir = join(TEST_EXPORT_DIR, entries[0]);
    await importCommand([exportDir]);

    // Should still have just 1
    const verifyDb = new ClaimDatabase(TEST_DB);
    const counts = verifyDb.getCounts();
    expect(counts.observations).toBe(1);
    expect(counts.sessions).toBe(1);
    verifyDb.close();
  });
});
