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

  it("creates settings file with correct matcher+hooks format", () => {
    installHooks(TEST_SETTINGS);
    expect(existsSync(TEST_SETTINGS)).toBe(true);

    const settings = JSON.parse(readFileSync(TEST_SETTINGS, "utf-8"));
    expect(settings.hooks).toBeDefined();

    // Check all 6 events exist
    expect(Object.keys(settings.hooks)).toContain("SessionStart");
    expect(Object.keys(settings.hooks)).toContain("PostToolUse");
    expect(Object.keys(settings.hooks)).toContain("SessionEnd");

    // Verify matcher+hooks format (Claude Code required format)
    const postToolUse = settings.hooks.PostToolUse[0];
    expect(postToolUse.matcher).toBe("Edit|Write|Bash");
    expect(postToolUse.hooks).toBeArray();
    expect(postToolUse.hooks[0].type).toBe("command");
    expect(postToolUse.hooks[0].command).toBe("claim hook post-tool-use");

    // SessionStart uses empty matcher (match all)
    const sessionStart = settings.hooks.SessionStart[0];
    expect(sessionStart.matcher).toBe("");
    expect(sessionStart.hooks[0].command).toBe("claim hook session-start");
  });

  it("preserves existing settings while adding hooks", () => {
    const existing = {
      permissions: { allow: ["Read", "Write"] },
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: "other-tool pre-hook" }] },
        ],
      },
    };
    Bun.write(TEST_SETTINGS, JSON.stringify(existing, null, 2));

    installHooks(TEST_SETTINGS);

    const settings = JSON.parse(readFileSync(TEST_SETTINGS, "utf-8"));
    // Existing permissions preserved
    expect(settings.permissions).toEqual({ allow: ["Read", "Write"] });
    // Other hooks preserved
    const preToolMatchers = settings.hooks.PreToolUse;
    const otherMatcher = preToolMatchers.find((m: any) =>
      m.hooks?.some((h: any) => h.command === "other-tool pre-hook")
    );
    expect(otherMatcher).toBeDefined();
    // CLAIM hooks added
    const claimMatcher = preToolMatchers.find((m: any) =>
      m.hooks?.some((h: any) => h.command?.startsWith("claim hook"))
    );
    expect(claimMatcher).toBeDefined();
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
    // Each event should have exactly 1 CLAIM matcher entry
    for (const event of Object.keys(settings.hooks)) {
      const claimMatchers = settings.hooks[event].filter(
        (m: any) => m.hooks?.some((h: any) => h.command?.startsWith("claim hook"))
      );
      expect(claimMatchers.length).toBe(1);
    }
  });

  it("uninstall removes CLAIM hooks but preserves others", () => {
    const existing = {
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: "other-tool pre-hook" }] },
        ],
      },
    };
    Bun.write(TEST_SETTINGS, JSON.stringify(existing, null, 2));

    installHooks(TEST_SETTINGS);
    uninstallHooks(TEST_SETTINGS);

    const settings = JSON.parse(readFileSync(TEST_SETTINGS, "utf-8"));
    const preToolMatchers = settings.hooks.PreToolUse;
    expect(preToolMatchers.length).toBe(1);
    expect(preToolMatchers[0].hooks[0].command).toBe("other-tool pre-hook");
  });
});
