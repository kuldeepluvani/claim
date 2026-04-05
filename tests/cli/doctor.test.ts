import { describe, it, expect, spyOn, afterEach } from "bun:test";
import { doctorCommand } from "../../src/cli/doctor";
import { configCommand } from "../../src/cli/config";
import { PATHS } from "../../src/shared/paths";
import { saveConfig, loadConfig } from "../../src/shared/config";
import { existsSync, unlinkSync, mkdirSync } from "fs";

const TEST_CONFIG = "/tmp/claim-doctor-test-config.toml";
const TEST_DIR = "/tmp/claim-doctor-test";

function cleanup() {
  if (existsSync(TEST_CONFIG)) unlinkSync(TEST_CONFIG);
}

describe("doctor command", () => {
  it("runs all checks and prints results", async () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    await doctorCommand();

    spy.mockRestore();

    // Should contain the header
    const output = logs.join("\n");
    expect(output).toContain("CLAIM Doctor");

    // Should check Bun version
    expect(output).toMatch(/Bun version/);

    // Should check data directory
    expect(output).toMatch(/Data directory/);

    // Should check database
    expect(output).toMatch(/Database/);

    // Should report pass/fail counts
    expect(output).toMatch(/\d+ passed, \d+ failed/);
  });
});

describe("config command", () => {
  let originalConfigFile: string;

  afterEach(() => {
    cleanup();
  });

  it("displays current config settings", async () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    await configCommand([]);

    spy.mockRestore();

    const output = logs.join("\n");
    expect(output).toContain("CLAIM Configuration");
    expect(output).toContain("[claim]");
    expect(output).toContain("[capture]");
    expect(output).toContain("[sweep]");
    expect(output).toContain("[context]");
    expect(output).toContain("[vaults]");
  });

  it("sets a config value", async () => {
    const originalConfigFile = PATHS.configFile;
    (PATHS as { configFile: string }).configFile = TEST_CONFIG;
    (PATHS as { claimDir: string }).claimDir = "/tmp";

    // Save default config first
    const config = loadConfig();
    saveConfig(config);

    await configCommand(["set", "claim.port", "3000"]);

    const updated = loadConfig();
    expect(updated.claim.port).toBe(3000);

    (PATHS as { configFile: string }).configFile = originalConfigFile;
    (PATHS as { claimDir: string }).claimDir = PATHS.claimDir;
  });

  it("shows usage for empty set command", async () => {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    await configCommand(["set"]);

    spy.mockRestore();

    const output = logs.join("\n");
    expect(output).toContain("Usage: claim config set");
  });
});
