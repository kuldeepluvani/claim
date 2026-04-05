FROM oven/bun:1.3-debian AS base

# Install system deps: git, curl, Node.js (needed for Claude Code CLI)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Create working directories
RUN mkdir -p /root/.claim /root/.claude/rules /root/.claude/memory /workspace/sample-project

# Set up CLAIM
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install

COPY src/ ./src/
COPY tsconfig.json ./
COPY scripts/ ./scripts/

# Build CLAIM
RUN bun run build

# Make claim CLI available globally
RUN echo '#!/bin/bash\nbun run /app/src/cli/index.ts "$@"' > /usr/local/bin/claim && chmod +x /usr/local/bin/claim

# Create sample git project for testing
WORKDIR /workspace/sample-project
RUN git init && \
    git config user.email "test@claim.dev" && \
    git config user.name "CLAIM Tester" && \
    echo '# Auth Service\nFastAPI authentication service with JWT tokens and Redis session store.' > README.md && \
    mkdir -p src/auth src/models tests && \
    echo 'from fastapi import FastAPI\napp = FastAPI()\n\n@app.post("/login")\nasync def login(): pass\n\n@app.post("/refresh")\nasync def refresh_token(): pass' > src/auth/handler.py && \
    echo 'import redis\nclient = redis.Redis(host="redis", port=6379)\n\ndef get_session(token): return client.get(token)\ndef set_session(token, data): client.setex(token, 3600, data)' > src/auth/session.py && \
    echo 'from pydantic import BaseModel\n\nclass User(BaseModel):\n    id: int\n    email: str\n    role: str = "user"' > src/models/user.py && \
    echo 'import pytest\n\ndef test_login(): assert True\ndef test_refresh(): assert True\ndef test_session_expiry(): assert True' > tests/test_auth.py && \
    echo 'fastapi>=0.109\nredis>=5.0\npydantic>=2.5\npytest>=8.0' > requirements.txt && \
    echo '.env\n__pycache__/\n*.pyc' > .gitignore && \
    git add -A && \
    git commit -m "feat: initial auth service with JWT and Redis sessions"

# Create a second sample project
WORKDIR /workspace/api-gateway
RUN git init && \
    git config user.email "test@claim.dev" && \
    git config user.name "CLAIM Tester" && \
    echo '# API Gateway\nKong-based API gateway routing to microservices.' > README.md && \
    mkdir -p config && \
    echo 'services:\n  - name: auth\n    url: http://auth-service:8000\n  - name: users\n    url: http://user-service:8000' > config/kong.yaml && \
    git add -A && \
    git commit -m "feat: Kong gateway config for auth and user services"

# Expose ports
# 2626 = CLAIM Web UI + Worker API
# 2627 = CLAIM MCP Server
EXPOSE 2626 2627

WORKDIR /workspace/sample-project

# Entry: start CLAIM worker in background, drop to shell
CMD ["bash", "-c", "claim init && claim serve & sleep 2 && echo '\\n\\n🧠 CLAIM v3 Test Environment Ready\\n\\n  Web UI:  http://localhost:2626\\n  Worker:  Running on port 2626\\n\\n  Sample projects:\\n    /workspace/sample-project  (auth-service)\\n    /workspace/api-gateway     (kong gateway)\\n\\n  Step 1: bash /app/scripts/seed-sample-data.sh\\n  Step 2: Open http://localhost:2626\\n  Step 3: claude (browser auth will open)\\n\\n' && exec bash"]
