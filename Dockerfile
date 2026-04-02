FROM node:22-slim

RUN apt-get update && apt-get install -y \
    git curl jq bash \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code

RUN useradd -m -s /bin/bash testuser
USER testuser
WORKDIR /home/testuser

# Test project (Claude Code needs git context)
RUN mkdir -p /home/testuser/demo-project && \
    cd /home/testuser/demo-project && \
    git init && \
    git config user.email "demo@test.com" && \
    git config user.name "Demo User"

# Test vault (simulates Obsidian)
RUN mkdir -p /home/testuser/test-vault/.obsidian

# CLAIM plugin source
COPY --chown=testuser:testuser . /home/testuser/claim-plugin

# Install script
COPY --chown=testuser:testuser scripts/install.sh /home/testuser/install-claim.sh
RUN chmod +x /home/testuser/install-claim.sh

WORKDIR /home/testuser/demo-project
CMD ["/bin/bash"]
