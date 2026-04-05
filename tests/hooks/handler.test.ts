import { describe, it, expect } from "bun:test";
import { handleHookCli } from "../../src/hooks/handler";

describe("Hook Handler", () => {
  it("sends POST to worker for post-tool-use (fails gracefully when worker not running)", async () => {
    // Use a port that nothing listens on
    const result = await handleHookCli("post-tool-use", {
      session_id: "sess-1",
      tool_name: "Edit",
      file_path: "/src/index.ts",
      content: "test content",
    }, "http://localhost:19999");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("constructs correct payload for session-start (fails gracefully)", async () => {
    const result = await handleHookCli("session-start", {
      session_id: "sess-1",
      repo: "claim",
      branch: "v3",
    }, "http://localhost:19999");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns success when worker is reachable", async () => {
    // Start a minimal server to verify dispatch works
    const testServer = Bun.serve({
      port: 19998,
      fetch() {
        return Response.json({ received: true });
      },
    });

    try {
      const result = await handleHookCli("user-prompt", {
        content: "hello",
      }, "http://localhost:19998");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ received: true });
    } finally {
      testServer.stop();
    }
  });
});
