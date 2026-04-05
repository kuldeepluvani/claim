<p align="center">
  <h1 align="center">CLAIM</h1>
  <p align="center"><b>Developer Knowledge OS</b></p>
  <p align="center"><i>Your code has git. Your knowledge deserves CLAIM.</i></p>
</p>

<p align="center">
  <a href="#quick-start"><img src="https://img.shields.io/badge/install-npx%20claim-7C3AED?style=for-the-badge" alt="Install"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/tests-119%20passing-brightgreen?style=flat-square" alt="Tests">
  <img src="https://img.shields.io/badge/deps-2-brightgreen?style=flat-square" alt="Dependencies">
  <img src="https://img.shields.io/badge/runtime-Bun-f9f1e1?style=flat-square&logo=bun" alt="Bun">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
</p>

<p align="center">
  <a href="#why-claim">Why</a> &bull;
  <a href="#quick-start">Install</a> &bull;
  <a href="#what-it-does">Features</a> &bull;
  <a href="#how-it-works">Architecture</a> &bull;
  <a href="#cli-reference">CLI</a> &bull;
  <a href="#web-ui">Web UI</a> &bull;
  <a href="#mcp-integration">MCP</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

---

CLAIM captures what you learn while coding with AI and turns it into a searchable knowledge graph. Observations flow in automatically through lifecycle hooks, get structured into entities and relationships, and route to your Obsidian vault as markdown you own.

<!-- TODO: Add screenshot/GIF of web UI -->

---

## Why CLAIM?

[claude-mem](https://github.com/anthropics/claude-mem) put AI memory on the map. CLAIM takes a different approach.

| | claude-mem | **CLAIM** |
|:---|:---|:---|
| **Dependencies** | Python + ChromaDB + 13 packages | **2 packages. Bun only.** |
| **Storage** | Opaque SQLite + vector DB | **Markdown you own** + SQLite |
| **Structure** | Flat observations | **Knowledge graph** (entities + relationships) |
| **Vault** | None | **Obsidian-native** routing |
| **Visualization** | Observation list | **D3 graph + timeline + search** |
| **License** | AGPL-3.0 | **MIT** |
| **Token cost** | Compresses every session | **Smart: only on sweep cycles** |
| **Install** | `npx claude-mem install` | **`npx claim`** |

---

## Quick Start

```bash
npx claim
```

That's it. Here's what happens:

1. **Interactive setup** asks for your vault path (optional) and preferences
2. **Hooks install** into Claude Code automatically (6 lifecycle hooks)
3. **Worker starts** on port 2626
4. **Web UI** opens at [localhost:2626](http://localhost:2626)
5. **Next time you code**, observations flow in and your knowledge graph builds itself

Time to value: **60 seconds**.

---

## What It Does

**Auto-Capture** -- 6 lifecycle hooks capture tool uses, decisions, and discoveries as you work.

**Knowledge Graph** -- Entities (services, people, tickets) and relationships extracted automatically.

**Smart Context** -- SessionStart injects a relevant briefing so every session begins where the last left off.

**Vault Integration** -- Observations compressed and routed to Obsidian. Markdown you own, not opaque databases.

**Full-Text Search** -- Search across all knowledge via CLI, web UI, or MCP.

**Web UI** -- Dashboard, D3 graph visualization, timeline, and search at `localhost:2626`.

**MCP Server** -- 4 tools for any IDE: `claim_search`, `claim_timeline`, `claim_get`, `claim_graph`.

**Sweep Engine** -- Compress observations, extract entities, route to vault, prune old data.

**Privacy-First** -- `<private>` tags, auto-redact `.env`/credentials, zero telemetry.

**Export/Import** -- Portable bundles. Migrate from claude-mem or CLAIM v2.

---

## How It Works

```
  Claude Code Session
        |
  [ Lifecycle Hooks ]
   SessionStart | Stop | ToolUse | SubagentStart | ...
        |
        v
  +-----------+       +-------------+
  |  Worker   | <---> |   SQLite    |
  |  :2626    |       | observations|
  +-----------+       | entities    |
   |    |    |        | relations   |
   |    |    |        +-------------+
   |    |    |
   |    |    +---> [ Obsidian Vault ]
   |    |              compressed notes
   |    |              routed by topic
   |    |
   |    +---> [ Web UI ]
   |           graph / timeline / search
   |
   +---> [ MCP Server ]
          claim_search / claim_timeline
          claim_get / claim_graph
```

Hooks fire on session start, stop, tool use, and subagent events. The worker processes observations, extracts entities and relationships into a knowledge graph, and the sweep engine periodically compresses everything into structured vault notes.

---

## CLI Reference

| Command | Description |
|:---|:---|
| `claim` / `claim init` | Interactive setup. Install hooks, create config, init database. |
| `claim serve` | Start the worker server (default port 2626). |
| `claim status` | Health check -- worker, hooks, config, observation count. |
| `claim search <query>` | Full-text search across all observations. |
| `claim sweep` | Run a sweep cycle: compress, extract, route, prune. |
| `claim sweep --dry-run` | Preview what a sweep would process. |
| `claim doctor` | Diagnose issues with hooks, worker, database, config. |
| `claim config` | View or update configuration. |
| `claim export` | Export knowledge to a portable bundle. |
| `claim import` | Import from a bundle or migrate from v2/claude-mem. |
| `claim mcp` | Start the MCP server for IDE integration. |
| `claim hook` | Manually trigger a hook event for testing. |
| `claim version` | Print version. |
| `claim uninstall` | Remove CLAIM hooks from Claude Code settings. |

---

## Web UI

The web UI runs at `localhost:2626` with five views:

- **Dashboard** -- Overview of observations, entities, and sweep status
- **Graph** -- Interactive D3 knowledge graph. Explore entities and relationships visually.
- **Timeline** -- Chronological view of observations across sessions
- **Search** -- Full-text search with filters and previews
- **Vault** -- Browse vault notes generated by the sweep engine

---

## MCP Integration

Add CLAIM to Claude Desktop, Cursor, or any MCP client:

```json
{
  "mcpServers": {
    "claim": {
      "command": "claim",
      "args": ["mcp"]
    }
  }
}
```

**Available tools:**

| Tool | Description |
|:---|:---|
| `claim_search` | Full-text search across observations |
| `claim_timeline` | Recent observations by time range |
| `claim_get` | Retrieve a specific observation by ID |
| `claim_graph` | Query the knowledge graph |

---

## Configuration

CLAIM uses `~/.claim/config.toml`, generated on `claim init`:

```toml
[claim]
port = 2626

[vault]
path = "~/Documents/Obsidian/MyVault"
enabled = true

[sweep]
auto = true
threshold = 50

[privacy]
redact_env = true
redact_credentials = true
```

---

## Docker

For testing or isolated environments:

```bash
docker compose up -d --build
docker exec -it claim-v3-test bash
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details. The short version:

1. Fork the repo
2. Create a feature branch
3. Run `bun test` (119 tests must pass)
4. Open a PR against `v3`

---

## License

[MIT](LICENSE)

---

<p align="center">
  Built by <a href="https://github.com/kuldeepluvani">Kuldeep Luvani</a><br>
  <i>Inspired by the need for AI agents that remember what matters.</i>
</p>
