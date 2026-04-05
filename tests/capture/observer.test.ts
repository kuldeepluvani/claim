import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync, existsSync } from "fs";
import { ClaimDatabase } from "../../src/storage/sqlite";
import { Observer } from "../../src/capture/observer";

const TEST_DB = "/tmp/claim-observer-test.db";

function cleanup() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = TEST_DB + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
}

const DEFAULT_CONFIG = {
  private_patterns: [".env", ".env.*", "*.pem", "*.key", "credentials*"],
  skip_tools: ["Read", "Glob", "Grep"],
  max_observation_length: 5000,
};

describe("Observer", () => {
  let db: ClaimDatabase;
  let observer: Observer;

  beforeEach(() => {
    cleanup();
    db = new ClaimDatabase(TEST_DB);
    observer = new Observer(db, DEFAULT_CONFIG);
  });

  afterEach(() => {
    db.close();
    cleanup();
  });

  it("captures a tool_use observation with correct classification", () => {
    const id = observer.capture({
      session_id: "sess-1",
      tool_name: "Edit",
      file_path: "/src/index.ts",
      content: "replaced function body",
      repo: "claim",
      branch: "v3",
    });

    expect(id).not.toBeNull();
    const obs = db.getObservation(id!);
    expect(obs).not.toBeNull();
    expect(obs!.type).toBe("tool_use");
    expect(obs!.category).toBe("code_change");
    expect(obs!.tool_name).toBe("Edit");
    expect(obs!.is_private).toBe(false);
  });

  it("skips noisy tools (Read, Glob, Grep)", () => {
    expect(observer.capture({
      session_id: "sess-1",
      tool_name: "Read",
      file_path: "/src/index.ts",
      content: "file content",
      repo: "claim",
      branch: "v3",
    })).toBeNull();

    expect(observer.capture({
      session_id: "sess-1",
      tool_name: "Glob",
      file_path: null,
      content: "**/*.ts",
      repo: "claim",
      branch: "v3",
    })).toBeNull();

    expect(observer.capture({
      session_id: "sess-1",
      tool_name: "Grep",
      file_path: null,
      content: "pattern",
      repo: "claim",
      branch: "v3",
    })).toBeNull();
  });

  it("marks private content (file path .env)", () => {
    const id = observer.capture({
      session_id: "sess-1",
      tool_name: "Edit",
      file_path: "/project/.env",
      content: "API_KEY=secret123",
      repo: "claim",
      branch: "v3",
    });

    expect(id).not.toBeNull();
    const obs = db.getObservation(id!);
    expect(obs).not.toBeNull();
    expect(obs!.is_private).toBe(true);
  });

  it("truncates long content to max_observation_length", () => {
    const longContent = "x".repeat(10000);
    const id = observer.capture({
      session_id: "sess-1",
      tool_name: "Bash",
      file_path: null,
      content: longContent,
      repo: "claim",
      branch: "v3",
    });

    expect(id).not.toBeNull();
    const obs = db.getObservation(id!);
    expect(obs).not.toBeNull();
    expect(obs!.content.length).toBe(5000);
  });
});
