import { join } from "path";
import { ClaimDatabase } from "../storage/sqlite";
import { createRoutes } from "./api";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

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

      // CORS preflight
      if (method === "OPTIONS") {
        return new Response(null, {
          headers: {
            ...corsHeaders,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      try {
        let response: Response | null = null;

        // GET routes
        if (method === "GET") {
          if (path === "/health") response = routes.health();
          else if (path === "/api/status") response = routes.status();
          else if (path === "/api/observations") response = routes.observations(url);
          else if (path === "/api/search") response = routes.search(url);
          else if (path === "/api/graph/stats") response = routes.graphStats();
          else if (path === "/api/graph/entities") response = routes.graphEntities(url);
          else if (path === "/api/graph/entity") response = routes.graphEntity(url);
          else if (path === "/api/graph/relationships") response = routes.graphRelationships(url);
          else if (path === "/api/graph/all") response = routes.graphAll();
          else if (path === "/api/timeline") response = routes.timeline(url);
          else if (path === "/api/config") response = routes.config();
        }

        // POST routes
        if (method === "POST") {
          const body = await req.json().catch(() => ({}));

          if (path === "/hooks/session-start") response = routes.hookSessionStart(body);
          else if (path === "/hooks/session-end") response = routes.hookSessionEnd(body);
          else if (path === "/hooks/post-tool-use") response = routes.hookToolUse(body);
          else if (path === "/hooks/pre-tool-use") response = routes.hookToolUse(body);
          else if (path === "/hooks/user-prompt") response = routes.hookUserPrompt(body);
          else if (path === "/hooks/stop") response = routes.hookStop(body);
          else if (path === "/api/sweep" || path === "/hooks/sweep") response = await routes.hookSweep();
        }

        // Add CORS headers to API responses
        if (response) {
          const newHeaders = new Headers(response.headers);
          for (const [k, v] of Object.entries(corsHeaders)) newHeaders.set(k, v);
          return new Response(response.body, {
            status: response.status,
            headers: newHeaders,
          });
        }

        // Static file serving for UI — try multiple paths
        const uiPath = path === "/" ? "/index.html" : path;
        const possiblePaths = [
          join(import.meta.dir, "../ui", uiPath),          // dev mode (from src/worker/)
          join(import.meta.dir, "../../src/ui", uiPath),    // built mode (from dist/)
          join(process.cwd(), "src/ui", uiPath),            // fallback: cwd
        ];
        for (const candidate of possiblePaths) {
          const file = Bun.file(candidate);
          if (await file.exists()) {
            return new Response(file);
          }
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
