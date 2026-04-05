<p align="center">
  <h1 align="center">🧠 CLAIM</h1>
  <p align="center"><strong>Developer Knowledge OS</strong></p>
  <p align="center">Your code has git. Your knowledge deserves CLAIM.</p>
</p>

<p align="center">
  <a href="#install"><img src="https://img.shields.io/badge/install-npx%20claim-7C3AED?style=for-the-badge" alt="Install"></a>
  <a href="https://github.com/kuldeepluvani/claim/blob/main/LICENSE"><img src="https://img.shields.io/github/license/kuldeepluvani/claim?style=flat-square&color=blue" alt="License"></a>
  <img src="https://img.shields.io/badge/runtime-Bun-f9f1e1?style=flat-square&logo=bun" alt="Bun">
  <img src="https://img.shields.io/badge/dependencies-2-brightgreen?style=flat-square" alt="Deps">
  <img src="https://img.shields.io/badge/tests-119%20passing-brightgreen?style=flat-square" alt="Tests">
</p>

<p align="center">
  <a href="#what-is-claim">What</a> &bull;
  <a href="#why-claim-over-claude-mem">Why</a> &bull;
  <a href="#install">Install</a> &bull;
  <a href="#60-second-demo">Demo</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#cli-reference">CLI</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#mcp-integration">MCP</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

---

## What is CLAIM?

CLAIM captures what you learn while coding with AI agents and turns it into structured, searchable knowledge. It auto-captures tool uses, extracts entities and relationships into a knowledge graph, and routes structured notes to your Obsidian vault. One command to install. Zero config needed.

---

## Why CLAIM over claude-mem?

| | claude-mem | **CLAIM** |
|:---|:---|:---|
| Install | `npx claude-mem install` | `npx claim` |
| Dependencies | Node + Bun + Python + ChromaDB | **Bun only** |
| Storage | Opaque SQLite + vector DB | **Markdown you own** + SQLite |
| Structure | Flat observations | **Knowledge graph** |
| Vault integration | None | **Obsidian-native** |
| License | AGPL-3.0 | **MIT** |
| Web UI | Observation list | **Graph + Timeline + Search** |
| Token cost | Every session compressed | **Smart: only sweep cycles** |

---

## Install

```bash
npx claim
```

That's it. Hooks installed, worker started, web UI at [http://localhost:2626](http://localhost:2626).

---

## 60-Second Demo

```
1. npx claim                        # interactive setup (15 sec)
2. Start coding with Claude Code     # observations flow in automatically
3. Open http://localhost:2626        # watch your knowledge graph build in real-time
4. claim search "auth bug"           # find what you worked on last week
5. Next session starts               # Claude gets context: "Last session: fixed JWT expiry in auth-service"
```

Session start hooks inject a briefing from your knowledge base. Every session begins where the last one left off.

---

## Features

**Auto-Capture** --- 6 lifecycle hooks capture tool uses, decisions, and discoveries as you work.

**Knowledge Graph** --- Entities (services, people, tickets) and relationships extracted automatically from observations.

**Smart Context** --- SessionStart injects a relevant briefing from your knowledge into every new session.

**Vault Integration** --- Observations compressed and routed to Obsidian vaults. Markdown you own, not opaque databases.

**FTS Search** --- Full-text search across all knowledge via CLI or MCP.

**Web UI** --- Dashboard, D3 graph visualization, timeline, and search at `localhost:2626`.

**MCP Server** --- 4 tools for any IDE: `claim_search`, `claim_timeline`, `claim_get`, `claim_graph`.

**Sweep Engine** --- Compress, extract entities, route to vault, write notes, prune old observations.

**Privacy-First** --- `<private>` tags, auto-detect `.env`/credentials, zero telemetry.

**Export/Import** --- Portable knowledge bundles. Migrate from claude-mem or CLAIM v2.

---

## CLI Reference

| Command | Description |
|:---|:---|
| `claim` / `claim init` | Interactive setup. Install hooks, create config, init database. |
| `claim serve` | Start the worker server (default port 2626). |
| `claim status` | Health check --- worker, hooks, config, observation count. |
| `claim search <query>` | Full-text search across all observations. |
| `claim sweep` | Run a sweep cycle: compress, extract, route, prune. |
| `claim sweep --dry-run` | Preview what a sweep would process. |
| `claim mcp` | Start the MCP server for IDE integration. |
| `claim export` | Export knowledge to a portable bundle. |
| `claim import` | Import from a bundle or migrate from v2/claude-mem. |
| `claim doctor` | Diagnose issues with hooks, worker, database, config. |
| `claim config` | View or update configuration. |
| `claim uninstall` | Remove CLAIM hooks from Claude Code settings. |
| `claim version` | Print version (`v3.0.0-alpha.1`). |

---

## Architecture

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

---

## Configuration

CLAIM uses `~/.claim/config.toml`. Generated on `claim init`.

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

Run `claim config` to view or update settings.

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

Exposes 4 tools:

| Tool | Description |
|:---|:---|
| `claim_search` | Full-text search across observations |
| `claim_timeline` | Recent observations by time range |
| `claim_get` | Retrieve a specific observation by ID |
| `claim_graph` | Query the knowledge graph |

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Run `bun test` (119 tests must pass)
4. Open a PR against `v3`

Ideas: new capture triggers, vault templates, integrations beyond Obsidian.

---

## License

[MIT](LICENSE)

---

<p align="center">
  Built by <a href="https://github.com/kuldeepluvani">Kuldeep Luvani</a>
</p>
