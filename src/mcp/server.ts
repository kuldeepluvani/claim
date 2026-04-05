import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ClaimDatabase } from "../storage/sqlite";
import { PATHS } from "../shared/paths";
import { claimSearch, claimTimeline, claimGet, claimGraph } from "./tools";

export async function startMcpServer() {
  const db = new ClaimDatabase(PATHS.dbFile);
  const server = new McpServer({
    name: "claim",
    version: "3.0.0",
  });

  server.tool(
    "claim_search",
    "Search CLAIM knowledge base — observations and vault notes",
    {
      query: z.string(),
      limit: z.number().optional(),
      repo: z.string().optional(),
    },
    async (args) => {
      const results = claimSearch(db, args.query, args.limit, args.repo);
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.tool(
    "claim_timeline",
    "Get chronological context — observations around a time or session",
    {
      from: z.string().optional(),
      to: z.string().optional(),
      session_id: z.string().optional(),
      limit: z.number().optional(),
    },
    async (args) => {
      const results = claimTimeline(db, args);
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.tool(
    "claim_get",
    "Get full observation details by IDs",
    {
      ids: z.array(z.string()),
    },
    async (args) => {
      const results = claimGet(db, args.ids);
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.tool(
    "claim_graph",
    "Query knowledge graph — find entity and its relationships",
    {
      entity: z.string(),
    },
    async (args) => {
      const result = claimGraph(db, args.entity);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
