import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { unlinkSync, existsSync } from "fs";
import { createServer } from "../../src/worker/server";

const TEST_PORT = 26260;
const TEST_DB = "/tmp/claim-worker-api-test.db";
const BASE = `http://localhost:${TEST_PORT}`;

function cleanupDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = TEST_DB + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
}

describe("Worker API", () => {
  let server: { stop: () => void; port: number };

  beforeAll(() => {
    cleanupDb();
    server = createServer({ port: TEST_PORT, dbPath: TEST_DB });
  });

  afterAll(() => {
    server.stop();
    cleanupDb();
  });

  it("GET /health returns 200 + status ok", async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
  });

  it("GET /api/status returns counts", async () => {
    const res = await fetch(`${BASE}/api/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.observations).toBe("number");
    expect(typeof body.sessions).toBe("number");
    expect(typeof body.uptime).toBe("number");
  });

  it("POST /hooks/post-tool-use captures observation", async () => {
    // First create a session so observations can link to it
    await fetch(`${BASE}/hooks/session-start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "test-sess-1",
        repo: "claim",
        branch: "v3",
      }),
    });

    const res = await fetch(`${BASE}/hooks/post-tool-use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "test-sess-1",
        tool_name: "Edit",
        file_path: "/src/index.ts",
        content: "edited file content",
        repo: "claim",
        branch: "v3",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.captured).toBe(true);
    expect(typeof body.observation_id).toBe("string");
  });

  it("GET /api/observations returns results", async () => {
    const res = await fetch(`${BASE}/api/observations?repo=claim&limit=10`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.observations)).toBe(true);
    expect(body.observations.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /hooks/session-start creates session", async () => {
    const res = await fetch(`${BASE}/hooks/session-start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "test-sess-2",
        repo: "claim",
        branch: "v3",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session_id).toBe("test-sess-2");
  });

  it("POST /hooks/session-end ends session", async () => {
    const res = await fetch(`${BASE}/hooks/session-end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "test-sess-2",
        summary: "test session done",
        knowledge_type: "debug",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ended).toBe(true);
  });

  it("session-start returns context with repo info", async () => {
    const res = await fetch(`${BASE}/hooks/session-start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "test-sess-ctx",
        repo: "test-repo",
        branch: "main",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session_id).toBe("test-sess-ctx");
    expect(body.context).not.toBeNull();
    expect(body.context).toContain("test-repo");
  });

  it("GET /api/graph/stats returns entity/relationship counts", async () => {
    const res = await fetch(`${BASE}/api/graph/stats`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.entities).toBe("number");
    expect(typeof body.relationships).toBe("number");
  });

  it("GET /api/graph/entities returns entity list", async () => {
    const res = await fetch(`${BASE}/api/graph/entities`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.entities)).toBe(true);
  });

  it("GET /api/graph/entity returns 404 when not found", async () => {
    const res = await fetch(`${BASE}/api/graph/entity?name=nonexistent`);
    expect(res.status).toBe(404);
  });

  it("GET /api/graph/relationships requires entity_id", async () => {
    const res = await fetch(`${BASE}/api/graph/relationships`);
    expect(res.status).toBe(400);
  });

  it("POST /api/sweep triggers sweep and returns results", async () => {
    // Insert an observation that can be swept
    await fetch(`${BASE}/hooks/post-tool-use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "test-sess-1",
        tool_name: "Write",
        file_path: "/src/sweep.ts",
        content: "sweep test content for PROJ-999",
        repo: "claim",
        branch: "v3",
      }),
    });

    const res = await fetch(`${BASE}/api/sweep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.observations_processed).toBe("number");
    expect(typeof body.entities_extracted).toBe("number");
    expect(typeof body.relationships_extracted).toBe("number");
    expect(typeof body.vault_notes_written).toBe("number");
    expect(typeof body.observations_pruned).toBe("number");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await fetch(`${BASE}/unknown`);
    expect(res.status).toBe(404);
  });
});
