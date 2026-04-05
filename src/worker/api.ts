import { ClaimDatabase } from "../storage/sqlite";
import { Observer } from "../capture/observer";
import { DEFAULT_CONFIG } from "../shared/config";

const startedAt = Date.now();

export function createRoutes(db: ClaimDatabase) {
  const observer = new Observer(db, DEFAULT_CONFIG.capture);

  return {
    health(): Response {
      return Response.json({
        status: "ok",
        uptime: Math.floor((Date.now() - startedAt) / 1000),
      });
    },

    status(): Response {
      const counts = db.getCounts();
      return Response.json({
        observations: counts.observations,
        sessions: counts.sessions,
        uptime: Math.floor((Date.now() - startedAt) / 1000),
      });
    },

    observations(url: URL): Response {
      const repo = url.searchParams.get("repo");
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);

      if (!repo) {
        return Response.json({ observations: [], error: "repo parameter required" }, { status: 400 });
      }

      const observations = db.getRecentObservations(repo, limit);
      return Response.json({ observations });
    },

    search(url: URL): Response {
      const q = url.searchParams.get("q");
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);

      if (!q) {
        return Response.json({ results: [], error: "q parameter required" }, { status: 400 });
      }

      const results = db.search(q, limit);
      return Response.json({ results });
    },

    hookSessionStart(body: Record<string, unknown>): Response {
      const sessionId = (body.session_id as string) || crypto.randomUUID();
      db.insertSession({
        id: sessionId,
        repo: (body.repo as string) || null,
        branch: (body.branch as string) || null,
        started_at: new Date().toISOString(),
      });
      return Response.json({ session_id: sessionId, context: null });
    },

    hookSessionEnd(body: Record<string, unknown>): Response {
      const sessionId = body.session_id as string;
      if (sessionId) {
        db.endSession(
          sessionId,
          (body.summary as string) || "",
          (body.knowledge_type as string) || "unknown"
        );
      }
      return Response.json({ ended: true });
    },

    hookToolUse(body: Record<string, unknown>): Response {
      const sessionId = body.session_id as string;
      const toolName = body.tool_name as string;
      const content = body.content as string;

      if (!sessionId || !toolName) {
        return Response.json({ captured: false, error: "session_id and tool_name required" }, { status: 400 });
      }

      const observationId = observer.capture({
        session_id: sessionId,
        tool_name: toolName,
        file_path: (body.file_path as string) || null,
        content: content || "",
        repo: (body.repo as string) || null,
        branch: (body.branch as string) || null,
      });

      if (observationId) {
        return Response.json({ captured: true, observation_id: observationId });
      }
      return Response.json({ captured: false, observation_id: null });
    },

    hookUserPrompt(_body: Record<string, unknown>): Response {
      return Response.json({ received: true });
    },

    hookStop(_body: Record<string, unknown>): Response {
      return Response.json({ received: true });
    },
  };
}
