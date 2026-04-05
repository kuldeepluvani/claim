# CLAIM v3 Test Playbook

## Quick Start

```bash
# From the claim repo directory:
docker compose up -d --build

# Attach to the container:
docker exec -it claim-v3-test bash

# Inside container — CLAIM worker is already running
claim status
claim doctor
```

## Step 1: Seed Sample Data

```bash
# Inside container:
bash /app/scripts/seed-sample-data.sh
```

Expected output:
- 4 sessions created
- ~12 observations captured
- Entities extracted (auth-service, api-gateway, Redis, etc.)
- Relationships created

## Step 2: Verify Web UI

Open in your browser: **http://localhost:2626**

Check each tab:
- [ ] **Dashboard** — Shows observation count, session count, entity count, activity feed
- [ ] **Graph** — D3 force-directed graph with auth-service, api-gateway, Redis nodes
- [ ] **Timeline** — Chronological list of all 12 observations
- [ ] **Search** — Type "Redis" → shows Redis-related observations
- [ ] **Vault** — Shows config status (no vaults configured in Docker)

## Step 3: Test CLI Commands

```bash
# Search
claim search "Redis TTL"
claim search --recent
claim search --sessions

# Status
claim status

# Doctor
claim doctor

# Export
claim export --output /tmp/claim-export
ls /tmp/claim-export/claim-export-*/

# Import back (test idempotency)
claim import /tmp/claim-export/claim-export-*/

# Sweep (manual trigger)
claim sweep
claim sweep --dry-run
```

## Step 4: Test with Claude Code CLI

```bash
# Inside container, navigate to sample project:
cd /workspace/sample-project

# Start Claude Code CLI (needs ANTHROPIC_API_KEY):
claude

# Inside Claude session, try:
# "Read src/auth/handler.py and add input validation"
# "Run the tests"
# "Fix any failing tests"

# After the session, check what CLAIM captured:
claim status
claim search --recent
```

What to verify:
- [ ] SessionStart hook fires → check `claim status` shows new session
- [ ] PostToolUse hooks fire for Edit/Write/Bash → observations captured
- [ ] SessionEnd hook fires → session closed
- [ ] Context injection works → next `claude` session should show "[CLAIM] You're in auth-service..."

## Step 5: Test Context Injection

```bash
# After Step 4, start a NEW Claude session in the same repo:
claude

# The first thing Claude sees should include context like:
# [CLAIM] You're in auth-service. Branch: main.
# Last session: ...
```

## Step 6: Test MCP Integration

```bash
# Test MCP tools directly via the worker API (equivalent to what MCP does):

# Search
curl "http://localhost:2626/api/search?q=auth"

# Timeline
curl "http://localhost:2626/api/timeline?limit=10"

# Graph
curl "http://localhost:2626/api/graph/entity?name=auth-service"

# All entities
curl "http://localhost:2626/api/graph/entities"

# Full graph
curl "http://localhost:2626/api/graph/all"
```

## Step 7: Test with Second Project

```bash
cd /workspace/api-gateway
claude

# Work on something, then switch back:
cd /workspace/sample-project
claude

# Verify context injection is repo-aware:
# Should show auth-service context, not api-gateway
```

## Step 8: Stress Test

```bash
# Rapid-fire 100 observations:
for i in $(seq 1 100); do
  curl -s -X POST "http://localhost:2626/hooks/post-tool-use" \
    -H "Content-Type: application/json" \
    -d "{\"session_id\":\"STRESS\",\"tool_name\":\"Edit\",\"content\":\"Edit #$i: Modified file-$i.ts line $((i*10))\",\"repo\":\"stress-test\",\"branch\":\"main\",\"file_path\":\"src/file-$i.ts\"}" > /dev/null
done

echo "Sent 100 observations"
claim status
claim search "file-50"
claim sweep
```

## Teardown

```bash
# From host machine:
docker compose down -v
```

## Port Reference

| Port | Service | URL |
|:---|:---|:---|
| 2626 | CLAIM Worker + Web UI | http://localhost:2626 |
| 2627 | CLAIM MCP Server | stdio (not HTTP) |

## Troubleshooting

**"claim: command not found"** → Run `source ~/.bashrc` or use `bun run /app/src/cli/index.ts`

**Web UI blank** → Check `claim status` — worker might not be running. Run `claim serve &`

**No observations captured** → Check `claim doctor` — hooks might not be installed. Run `claim init`

**Claude Code CLI not found** → `npm install -g @anthropic-ai/claude-code`

**No API key** → Set `ANTHROPIC_API_KEY` env var or pass via docker-compose
