import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

interface Hook {
  type: string;
  command: string;
  toolNames?: string[];
}

interface Settings {
  hooks?: Record<string, Hook[]>;
  [key: string]: unknown;
}

const HOOK_EVENTS: Array<{ event: string; command: string; toolNames?: string[] }> = [
  { event: "SessionStart", command: "claim hook session-start" },
  { event: "UserPromptSubmit", command: "claim hook user-prompt" },
  { event: "PreToolUse", command: "claim hook pre-tool-use", toolNames: ["Edit", "Write", "Bash"] },
  { event: "PostToolUse", command: "claim hook post-tool-use", toolNames: ["Edit", "Write", "Bash"] },
  { event: "Stop", command: "claim hook stop" },
  { event: "SessionEnd", command: "claim hook session-end" },
];

function isClaimHook(hook: Hook): boolean {
  return hook.command?.startsWith("claim hook") ?? false;
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

  // For each event, remove old CLAIM hooks then add the new one
  for (const def of HOOK_EVENTS) {
    if (!settings.hooks[def.event]) {
      settings.hooks[def.event] = [];
    }

    // Remove existing CLAIM hooks for this event
    settings.hooks[def.event] = settings.hooks[def.event].filter((h) => !isClaimHook(h));

    // Add the new CLAIM hook
    const hook: Hook = { type: "command", command: def.command };
    if (def.toolNames) {
      hook.toolNames = def.toolNames;
    }
    settings.hooks[def.event].push(hook);
  }

  writeSettings(settingsPath, settings);
}

export function uninstallHooks(settingsPath: string): void {
  const settings = readSettings(settingsPath);
  if (!settings.hooks) return;

  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter((h) => !isClaimHook(h));
  }

  writeSettings(settingsPath, settings);
}

export function isHooksInstalled(settingsPath: string): boolean {
  const settings = readSettings(settingsPath);
  if (!settings.hooks) return false;

  for (const event of Object.keys(settings.hooks)) {
    if (settings.hooks[event].some((h) => isClaimHook(h))) return true;
  }

  return false;
}
