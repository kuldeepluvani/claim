import { ClaimDatabase } from "../storage/sqlite";
import { Observer } from "../capture/observer";
import { DEFAULT_CONFIG, loadConfig } from "../shared/config";
import { generateContext } from "../context/generator";
import { SweepEngine } from "../sweep/engine";
import type { Relationship } from "../shared/types";

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
      // Claude Code sends cwd, not repo — extract repo name from cwd path
      const cwd = body.cwd as string || "";
      const repo = cwd.split("/").pop() || null;

      db.insertSession({
        id: sessionId,
        repo: repo,
        branch: null,
        started_at: new Date().toISOString(),
      });
      const contextResult = generateContext(
        db,
        repo,
        null
      );
      return Response.json({ session_id: sessionId, context: contextResult.text });
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

      // Auto-trigger sweep if there are unswept observations
      const unswept = db.getUnsweptObservations(1);
      let swept = false;
      if (unswept.length > 0) {
        try {
          const config = loadConfig();
          const engine = new SweepEngine(db, config);
          engine.sweep(); // fire-and-forget
          swept = true;
        } catch {
          // Sweep failure is non-fatal
        }
      }

      return Response.json({ ended: true, sweep_triggered: swept });
    },

    hookToolUse(body: Record<string, unknown>): Response {
      const sessionId = body.session_id as string;
      const toolName = body.tool_name as string;

      if (!sessionId || !toolName) {
        return Response.json({ captured: false, error: "session_id and tool_name required" }, { status: 400 });
      }

      // Claude Code sends tool_input (object) not content (string)
      // Extract meaningful content from tool_input based on tool type
      const toolInput = body.tool_input as Record<string, unknown> | undefined;
      let content = "";
      let filePath: string | null = null;

      if (toolInput) {
        filePath = (toolInput.file_path as string) || null;
        if (toolName === "Bash") {
          content = (toolInput.command as string) || (toolInput.description as string) || "";
        } else if (toolName === "Edit") {
          const oldStr = (toolInput.old_string as string) || "";
          const newStr = (toolInput.new_string as string) || "";
          content = `Edit ${filePath || "file"}: replaced "${oldStr.slice(0, 100)}" with "${newStr.slice(0, 100)}"`;
        } else if (toolName === "Write") {
          const writeContent = (toolInput.content as string) || "";
          content = `Write ${filePath || "file"} (${writeContent.length} chars)`;
        } else {
          content = JSON.stringify(toolInput).slice(0, 500);
        }
      }

      // Also capture tool_response if present (PostToolUse has it)
      const toolResponse = body.tool_response as Record<string, unknown> | undefined;
      if (toolResponse && !content) {
        content = JSON.stringify(toolResponse).slice(0, 500);
      }

      // Extract repo from cwd (Claude sends cwd, not repo)
      const cwd = body.cwd as string || "";
      const repo = cwd.split("/").pop() || null;

      const observationId = observer.capture({
        session_id: sessionId,
        tool_name: toolName,
        file_path: filePath || (body.file_path as string) || null,
        content: content || "",
        repo: repo,
        branch: null,
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

    async hookSweep(): Promise<Response> {
      const config = loadConfig();
      const engine = new SweepEngine(db, config);
      const result = await engine.sweep();
      return Response.json(result);
    },

    graphStats(): Response {
      const stats = db.getGraphStats();
      return Response.json(stats);
    },

    graphEntities(url: URL): Response {
      const type = url.searchParams.get("type") as import("../shared/types").EntityType | null;
      const limit = parseInt(url.searchParams.get("limit") || "100", 10);
      const entities = db.getEntities(type || undefined, limit);
      return Response.json({ entities });
    },

    graphEntity(url: URL): Response {
      const name = url.searchParams.get("name");
      if (!name) {
        return Response.json({ error: "name parameter required" }, { status: 400 });
      }
      const entity = db.getEntityByName(name);
      if (!entity) {
        return Response.json({ error: "entity not found" }, { status: 404 });
      }
      const graph = db.getEntityGraph(entity.id);
      return Response.json(graph);
    },

    graphRelationships(url: URL): Response {
      const entityId = url.searchParams.get("entity_id");
      if (!entityId) {
        return Response.json({ error: "entity_id parameter required" }, { status: 400 });
      }
      const relationships = db.getRelationshipsFor(entityId);
      return Response.json({ relationships });
    },

    graphAll(): Response {
      const entities = db.getEntities(undefined, 200);
      const allRels: Relationship[] = [];
      for (const e of entities) {
        const rels = db.getRelationshipsFor(e.id);
        allRels.push(...rels);
      }
      const uniqueRels = [...new Map(allRels.map(r => [r.id, r])).values()];
      return Response.json({ entities, relationships: uniqueRels });
    },

    timeline(url: URL): Response {
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);
      const from = url.searchParams.get("from") || undefined;
      const to = url.searchParams.get("to") || undefined;
      const observations = db.getTimeline(from, to, limit);
      return Response.json({ observations });
    },

    config(): Response {
      const config = loadConfig();
      return Response.json({
        vaults: config.vaults,
        capture_mode: config.capture.mode,
        sweep_enabled: config.sweep.enabled,
        context_enabled: config.context.enabled,
        port: config.claim.port,
      });
    },
  };
}
