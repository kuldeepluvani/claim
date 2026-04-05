#!/bin/bash
# Seed CLAIM with sample observations to test all features
# Run this AFTER 'claim init && claim serve' is running

set -e
WORKER="http://localhost:2626"
echo "🧠 Seeding CLAIM with sample data..."

# --- Session 1: Auth service debugging ---
echo "  → Session 1: Auth service debugging"

curl -s -X POST "$WORKER/hooks/session-start" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S001","repo":"auth-service","branch":"main","timestamp":"2026-04-04T10:00:00Z"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S001","tool_name":"Bash","content":"pytest tests/test_auth.py -v — 2 failed, 1 passed. test_session_expiry FAILED: AssertionError","repo":"auth-service","branch":"main","file_path":"tests/test_auth.py"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S001","tool_name":"Edit","content":"Fixed Redis TTL config — was using seconds instead of milliseconds. Changed setex(token, 3600, data) to setex(token, 3600000, data)","repo":"auth-service","branch":"main","file_path":"src/auth/session.py"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S001","tool_name":"Bash","content":"pytest tests/test_auth.py -v — 3 passed, 0 failed. All tests green.","repo":"auth-service","branch":"main","file_path":"tests/test_auth.py"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S001","tool_name":"Bash","content":"git commit -m \"fix: Redis TTL config — use milliseconds not seconds\"","repo":"auth-service","branch":"main"}' > /dev/null

curl -s -X POST "$WORKER/hooks/session-end" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S001","timestamp":"2026-04-04T10:45:00Z"}' > /dev/null

# --- Session 2: API Gateway config ---
echo "  → Session 2: API Gateway config"

curl -s -X POST "$WORKER/hooks/session-start" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S002","repo":"api-gateway","branch":"feat/rate-limiting","timestamp":"2026-04-04T14:00:00Z"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S002","tool_name":"Edit","content":"Added rate limiting plugin to Kong config: 100 req/min per consumer for auth-service route","repo":"api-gateway","branch":"feat/rate-limiting","file_path":"config/kong.yaml"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S002","tool_name":"Bash","content":"curl -X POST http://localhost:8001/services/auth/plugins -d name=rate-limiting -d config.minute=100 — 201 Created","repo":"api-gateway","branch":"feat/rate-limiting"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S002","tool_name":"Bash","content":"git push origin feat/rate-limiting — remote: Create a pull request for feat/rate-limiting on GitHub","repo":"api-gateway","branch":"feat/rate-limiting"}' > /dev/null

curl -s -X POST "$WORKER/hooks/session-end" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S002","timestamp":"2026-04-04T14:30:00Z"}' > /dev/null

# --- Session 3: Auth service — JWT rotation feature ---
echo "  → Session 3: JWT rotation feature"

curl -s -X POST "$WORKER/hooks/session-start" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S003","repo":"auth-service","branch":"feat/jwt-rotation","timestamp":"2026-04-04T16:00:00Z"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S003","tool_name":"Write","content":"Created src/auth/jwt_rotation.py — implements refresh token rotation with Redis-backed revocation list. Tokens expire in 15 minutes, refresh tokens in 7 days.","repo":"auth-service","branch":"feat/jwt-rotation","file_path":"src/auth/jwt_rotation.py"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S003","tool_name":"Edit","content":"Updated handler.py to use new jwt_rotation module. import from src.auth.jwt_rotation. Added /refresh endpoint with rotation logic.","repo":"auth-service","branch":"feat/jwt-rotation","file_path":"src/auth/handler.py"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S003","tool_name":"Write","content":"Created tests/test_jwt_rotation.py — 8 test cases covering: token generation, refresh flow, rotation detection, revocation, expiry, concurrent refresh, and Redis failure fallback","repo":"auth-service","branch":"feat/jwt-rotation","file_path":"tests/test_jwt_rotation.py"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S003","tool_name":"Bash","content":"pytest tests/ -v — 11 passed, 0 failed. Coverage: 94%. PR created: #42 JWT refresh token rotation @reviewer: kyle","repo":"auth-service","branch":"feat/jwt-rotation"}' > /dev/null

curl -s -X POST "$WORKER/hooks/session-end" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S003","timestamp":"2026-04-04T17:30:00Z"}' > /dev/null

# --- Session 4: Deployment ---
echo "  → Session 4: Production deployment"

curl -s -X POST "$WORKER/hooks/session-start" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S004","repo":"auth-service","branch":"main","timestamp":"2026-04-05T09:00:00Z"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S004","tool_name":"Bash","content":"kubectl apply -f k8s/auth-service.yaml — deployment.apps/auth-service configured. Rolled out to 3 replicas in us-central1.","repo":"auth-service","branch":"main"}' > /dev/null

curl -s -X POST "$WORKER/hooks/post-tool-use" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S004","tool_name":"Bash","content":"curl -s https://api.prod.example.com/health — {\"status\":\"ok\",\"version\":\"v2.1.0\",\"uptime\":\"12s\"}","repo":"auth-service","branch":"main"}' > /dev/null

curl -s -X POST "$WORKER/hooks/session-end" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"S004","timestamp":"2026-04-05T09:15:00Z"}' > /dev/null

# --- Trigger sweep to extract entities and relationships ---
echo "  → Running sweep..."
curl -s -X POST "$WORKER/api/sweep" > /dev/null

# --- Show results ---
echo ""
echo "✅ Sample data seeded!"
echo ""
echo "--- Status ---"
curl -s "$WORKER/api/status" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Observations: {d[\"observations\"]}'); print(f'  Sessions: {d[\"sessions\"]}')" 2>/dev/null || curl -s "$WORKER/api/status"
echo ""

echo "--- Graph Stats ---"
curl -s "$WORKER/api/graph/stats" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Entities: {d[\"entities\"]}'); print(f'  Relationships: {d[\"relationships\"]}')" 2>/dev/null || curl -s "$WORKER/api/graph/stats"
echo ""

echo "--- Entities ---"
curl -s "$WORKER/api/graph/entities" | python3 -c "
import sys,json
entities = json.load(sys.stdin)
for e in entities:
    print(f'  [{e[\"type\"]}] {e[\"name\"]} (seen {e[\"observation_count\"]}x)')
" 2>/dev/null || curl -s "$WORKER/api/graph/entities"
echo ""

echo "--- Search: 'Redis' ---"
curl -s "$WORKER/api/search?q=Redis" | python3 -c "
import sys,json
results = json.load(sys.stdin)
for r in results:
    print(f'  [{r.get(\"category\",\"?\")}] {r[\"content\"][:80]}')
" 2>/dev/null || curl -s "$WORKER/api/search?q=Redis"
echo ""

echo "🎉 Open http://localhost:2626 to see the web UI!"
echo "   Try the Knowledge Graph tab to see entities and relationships."
