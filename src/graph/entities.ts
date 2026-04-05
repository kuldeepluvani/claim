import type { EntityType } from "../shared/types";

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  aliases: string[];
}

const KNOWN_TOOLS = new Set([
  "bash", "edit", "write", "read", "grep", "glob", "agent", "skill",
  "toolsearch", "notebookedit", "webfetch", "websearch",
]);

export function extractEntities(observation: {
  repo: string | null;
  file_path: string | null;
  content: string;
  tool_name: string | null;
}): ExtractedEntity[] {
  const seen = new Map<string, ExtractedEntity>();

  function add(name: string, type: EntityType, aliases: string[] = []) {
    const key = name.toLowerCase();
    if (!key || key.length < 2) return;
    if (!seen.has(key)) {
      seen.set(key, { name, type, aliases });
    }
  }

  // 1. Repo -> service entity
  if (observation.repo) {
    add(observation.repo, "service");
  }

  // 2. File path -> concept from top-level directory
  if (observation.file_path) {
    const parts = observation.file_path.replace(/^\//, "").split("/");
    // Skip common root dirs like "src", look for meaningful subdirectory
    if (parts.length >= 2) {
      const topDir = parts[0] === "src" && parts.length >= 3 ? parts[1] : parts[0];
      if (topDir && topDir !== "src" && !topDir.includes(".")) {
        add(topDir, "concept");
      }
    }
  }

  // 3. @mentions -> person
  const mentionRegex = /@(\w{2,})/g;
  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(observation.content)) !== null) {
    const mention = match[1];
    // Skip common non-person @mentions
    if (!["param", "returns", "type", "deprecated", "example", "see", "throws"].includes(mention.toLowerCase())) {
      add(mention, "person");
    }
  }

  // 4. Ticket references -> ticket
  const ticketRegex = /\b([A-Z]{2,}-\d+)\b/g;
  while ((match = ticketRegex.exec(observation.content)) !== null) {
    add(match[1], "ticket");
  }

  // Issue number references like #123
  const issueRegex = /#(\d{2,})\b/g;
  while ((match = issueRegex.exec(observation.content)) !== null) {
    add(`#${match[1]}`, "ticket");
  }

  // 5. Tool names -> tool (only unknown tools)
  if (observation.tool_name) {
    if (!KNOWN_TOOLS.has(observation.tool_name.toLowerCase())) {
      add(observation.tool_name, "tool");
    }
  }

  // 6. API/URL references -> api entity (extract domain)
  const urlRegex = /https?:\/\/([^\s/]+)/g;
  while ((match = urlRegex.exec(observation.content)) !== null) {
    const domain = match[1];
    // Skip localhost and IP addresses
    if (!domain.startsWith("localhost") && !domain.match(/^\d+\.\d+\.\d+\.\d+/)) {
      add(domain, "api");
    }
  }

  // 7. Git branch patterns -> concept
  if (observation.content) {
    const branchRegex = /\b(?:feat|fix|chore|refactor)\/([a-z0-9-]+)/gi;
    while ((match = branchRegex.exec(observation.content)) !== null) {
      add(match[1], "concept");
    }
  }

  return Array.from(seen.values());
}
