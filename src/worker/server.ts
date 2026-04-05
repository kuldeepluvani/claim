import { ClaimDatabase } from "../storage/sqlite";
import { createRoutes } from "./api";

interface ServerOptions {
  port: number;
  dbPath: string;
}

export function createServer(options: ServerOptions): { stop: () => void; port: number } {
  const db = new ClaimDatabase(options.dbPath);
  const routes = createRoutes(db);

  const server = Bun.serve({
    port: options.port,
    async fetch(req) {
      const url = new URL(req.url);
      const method = req.method;
      const path = url.pathname;

      try {
        // GET routes
        if (method === "GET") {
          if (path === "/health") return routes.health();
          if (path === "/api/status") return routes.status();
          if (path === "/api/observations") return routes.observations(url);
          if (path === "/api/search") return routes.search(url);
          if (path === "/api/graph/stats") return routes.graphStats();
          if (path === "/api/graph/entities") return routes.graphEntities(url);
          if (path === "/api/graph/entity") return routes.graphEntity(url);
          if (path === "/api/graph/relationships") return routes.graphRelationships(url);
        }

        // POST routes
        if (method === "POST") {
          const body = await req.json().catch(() => ({}));

          if (path === "/hooks/session-start") return routes.hookSessionStart(body);
          if (path === "/hooks/session-end") return routes.hookSessionEnd(body);
          if (path === "/hooks/post-tool-use") return routes.hookToolUse(body);
          if (path === "/hooks/pre-tool-use") return routes.hookToolUse(body);
          if (path === "/hooks/user-prompt") return routes.hookUserPrompt(body);
          if (path === "/hooks/stop") return routes.hookStop(body);
          if (path === "/api/sweep" || path === "/hooks/sweep") return routes.hookSweep();
        }

        return Response.json({ error: "not found" }, { status: 404 });
      } catch (err) {
        return Response.json({ error: "internal server error" }, { status: 500 });
      }
    },
  });

  return {
    stop() {
      server.stop();
      db.close();
    },
    port: server.port,
  };
}
