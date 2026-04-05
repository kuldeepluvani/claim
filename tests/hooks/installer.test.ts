import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync, existsSync, readFileSync } from "fs";
import { installHooks, uninstallHooks, isHooksInstalled } from "../../src/hooks/installer";

const TEST_SETTINGS = "/tmp/claim-test-settings.json";

function cleanup() {
  if (existsSync(TEST_SETTINGS)) unlinkSync(TEST_SETTINGS);
}

describe("Hook Installer", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("creates settings file with hooks when none exists", () => {
    installHooks(TEST_SETTINGS);
    expect(existsSync(TEST_SETTINGS)).toBe(true);

    const settings = JSON.parse(readFileSync(TEST_SETTINGS, "utf-8"));
    expect(settings.hooks).toBeDefined();
    expect(Object.keys(settings.hooks).length).toBeGreaterThanOrEqual(1);

    // Check that all 6 event types have hooks
    const hookKeys = Object.keys(settings.hooks);
    expect(hookKeys).toContain("SessionStart");
    expect(hookKeys).toContain("UserPromptSubmit");
    expect(hookKeys).toContain("PreToolUse");
    expect(hookKeys).toContain("PostToolUse");
    expect(hookKeys).toContain("Stop");
    expect(hookKeys).toContain("SessionEnd");
  });

  it("preserves existing settings while adding hooks", () => {
    // Write existing settings with some custom content
    const existing = {
      permissions: { allow: ["Read", "Write"] },
      hooks: {
        PreToolUse: [
          { type: "command", command: "other-tool pre-hook" },
        ],
      },
    };
    Bun.write(TEST_SETTINGS, JSON.stringify(existing, null, 2));

    installHooks(TEST_SETTINGS);

    const settings = JSON.parse(readFileSync(TEST_SETTINGS, "utf-8"));
    // Existing permissions preserved
    expect(settings.permissions).toEqual({ allow: ["Read", "Write"] });
    // Other hooks preserved
    const preToolHooks = settings.hooks.PreToolUse;
    const otherHook = preToolHooks.find((h: any) => h.command === "other-tool pre-hook");
    expect(otherHook).toBeDefined();
    // CLAIM hooks added
    const claimHook = preToolHooks.find((h: any) => h.command?.startsWith("claim hook"));
    expect(claimHook).toBeDefined();
  });

  it("detects installed hooks", () => {
    expect(isHooksInstalled(TEST_SETTINGS)).toBe(false);
    installHooks(TEST_SETTINGS);
    expect(isHooksInstalled(TEST_SETTINGS)).toBe(true);
    uninstallHooks(TEST_SETTINGS);
    expect(isHooksInstalled(TEST_SETTINGS)).toBe(false);
  });

  it("is idempotent — no duplicate hooks", () => {
    installHooks(TEST_SETTINGS);
    installHooks(TEST_SETTINGS);
    installHooks(TEST_SETTINGS);

    const settings = JSON.parse(readFileSync(TEST_SETTINGS, "utf-8"));
    // Each event type should have exactly 1 CLAIM hook
    for (const event of Object.keys(settings.hooks)) {
      const claimHooks = settings.hooks[event].filter(
        (h: any) => h.command?.startsWith("claim hook")
      );
      expect(claimHooks.length).toBe(1);
    }
  });

  it("uninstall removes CLAIM hooks but preserves others", () => {
    const existing = {
      hooks: {
        PreToolUse: [
          { type: "command", command: "other-tool pre-hook" },
        ],
      },
    };
    Bun.write(TEST_SETTINGS, JSON.stringify(existing, null, 2));

    installHooks(TEST_SETTINGS);
    uninstallHooks(TEST_SETTINGS);

    const settings = JSON.parse(readFileSync(TEST_SETTINGS, "utf-8"));
    const preToolHooks = settings.hooks.PreToolUse;
    expect(preToolHooks.length).toBe(1);
    expect(preToolHooks[0].command).toBe("other-tool pre-hook");
  });
});
