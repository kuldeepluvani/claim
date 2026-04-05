import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

/**
 * Claude Code hook format (as of 2026):
 * {
 *   "hooks": {
 *     "PostToolUse": [
 *       {
 *         "matcher": "Edit|Write|Bash",
 *         "hooks": [{ "type": "command", "command": "claim hook post-tool-use" }]
 *       }
 *     ]
 *   }
 * }
 *
 * Each event has an array of matchers. Each matcher has:
 *   - matcher: string (tool name, pipe-separated list, or "" for match-all)
 *   - hooks: array of { type: "command", command: string }
 */

interface HookCommand {
  type: string;
  command: string;
}

interface HookMatcher {
  matcher: string;
  hooks: HookCommand[];
}

interface Settings {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
}

const HOOK_EVENTS: Array<{ event: string; command: string; matcher: string }> = [
  { event: "SessionStart", command: "claim hook session-start", matcher: "" },
  { event: "UserPromptSubmit", command: "claim hook user-prompt", matcher: "" },
  { event: "PreToolUse", command: "claim hook pre-tool-use", matcher: "Edit|Write|Bash" },
  { event: "PostToolUse", command: "claim hook post-tool-use", matcher: "Edit|Write|Bash" },
  { event: "Stop", command: "claim hook stop", matcher: "" },
  { event: "SessionEnd", command: "claim hook session-end", matcher: "" },
];

function isClaimMatcher(entry: any): boolean {
  // New format: { matcher: "...", hooks: [{ command: "claim hook ..." }] }
  if (entry.hooks?.some?.((h: any) => h.command?.startsWith("claim hook"))) return true;
  // Old v1 format: { type: "command", command: "claim hook ..." } — clean these up too
  if (entry.command?.startsWith("claim hook")) return true;
  return false;
}

function readSettings(settingsPath: string): Settings {
  if (!existsSync(settingsPath)) return {};
  try {
    return JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return {};
  }
}

function writeSettings(settingsPath: string, settings: Settings): void {
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

export function installHooks(settingsPath: string): void {
  const settings = readSettings(settingsPath);
  if (!settings.hooks) settings.hooks = {};

  for (const def of HOOK_EVENTS) {
    if (!settings.hooks[def.event]) {
      settings.hooks[def.event] = [];
    }

    // Remove existing CLAIM matchers for this event (idempotent)
    settings.hooks[def.event] = settings.hooks[def.event].filter(
      (entry) => !isClaimMatcher(entry)
    );

    // Add the CLAIM matcher
    settings.hooks[def.event].push({
      matcher: def.matcher,
      hooks: [{ type: "command", command: def.command }],
    });
  }

  writeSettings(settingsPath, settings);
}

export function uninstallHooks(settingsPath: string): void {
  const settings = readSettings(settingsPath);
  if (!settings.hooks) return;

  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter(
      (entry) => !isClaimMatcher(entry)
    );
  }

  writeSettings(settingsPath, settings);
}

export function isHooksInstalled(settingsPath: string): boolean {
  const settings = readSettings(settingsPath);
  if (!settings.hooks) return false;

  for (const event of Object.keys(settings.hooks)) {
    if (settings.hooks[event].some((entry) => isClaimMatcher(entry))) return true;
  }

  return false;
}
