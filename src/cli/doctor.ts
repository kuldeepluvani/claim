import { existsSync, statSync } from "fs";
import { PATHS } from "../shared/paths";
import { loadConfig, configExists } from "../shared/config";
import { isHooksInstalled } from "../hooks/installer";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function pass(label: string, detail?: string): void {
  const suffix = detail ? ` (${detail})` : "";
  console.log(`  ${GREEN}\u2713${RESET} ${label}${suffix}`);
}

function fail(label: string, detail?: string): void {
  const suffix = detail ? ` (${detail})` : "";
  console.log(`  ${RED}\u2717${RESET} ${label}${suffix}`);
}

export async function doctorCommand(): Promise<void> {
  console.log(`\n${BOLD}CLAIM Doctor${RESET}\n`);

  let passCount = 0;
  let failCount = 0;

  // 1. Bun version
  try {
    const proc = Bun.spawnSync(["bun", "--version"]);
    const version = proc.stdout.toString().trim();
    const [major, minor] = version.split(".").map(Number);
    if (major >= 1 && minor >= 2) {
      pass("Bun version", `v${version}`);
      passCount++;
    } else {
      fail("Bun version", `v${version} — requires >=1.2`);
      failCount++;
    }
  } catch {
    fail("Bun version", "not found");
    failCount++;
  }

  // 2. Data directory
  if (existsSync(PATHS.claimDir)) {
    pass("Data directory", PATHS.claimDir);
    passCount++;
  } else {
    fail("Data directory", `${PATHS.claimDir} not found`);
    failCount++;
  }

  // 3. Database
  if (existsSync(PATHS.dbFile)) {
    try {
      const stat = statSync(PATHS.dbFile);
      const sizeKB = Math.round(stat.size / 1024);
      pass("Database", `${sizeKB}KB`);
      passCount++;
    } catch {
      fail("Database", "exists but not readable");
      failCount++;
    }
  } else {
    fail("Database", `${PATHS.dbFile} not found`);
    failCount++;
  }

  // 4. Config
  if (configExists()) {
    pass("Config", PATHS.configFile);
    passCount++;
  } else {
    fail("Config", `${PATHS.configFile} not found`);
    failCount++;
  }

  // 5. Hooks installed
  if (isHooksInstalled(PATHS.claudeSettingsFile)) {
    pass("Hooks installed");
    passCount++;
  } else {
    fail("Hooks installed", "not found in Claude Code settings");
    failCount++;
  }

  // 6. Rules file
  if (existsSync(PATHS.claimRulesFile)) {
    pass("Rules file", PATHS.claimRulesFile);
    passCount++;
  } else {
    fail("Rules file", `${PATHS.claimRulesFile} not found`);
    failCount++;
  }

  // 7. Worker running
  const config = loadConfig();
  try {
    const res = await fetch(`http://localhost:${config.claim.port}/health`);
    if (res.ok) {
      const data = (await res.json()) as { uptime_seconds?: number };
      const uptime = data.uptime_seconds
        ? `uptime ${Math.floor(data.uptime_seconds / 60)}m`
        : "running";
      pass("Worker running", `port ${config.claim.port}, ${uptime}`);
      passCount++;
    } else {
      fail("Worker running", `port ${config.claim.port} returned ${res.status}`);
      failCount++;
    }
  } catch {
    fail("Worker running", `not reachable on port ${config.claim.port}`);
    failCount++;
  }

  // 8. Vault access
  if (config.vaults.entries.length > 0) {
    for (const vault of config.vaults.entries) {
      if (existsSync(vault.path)) {
        pass(`Vault: ${vault.name}`, vault.path);
        passCount++;
      } else {
        fail(`Vault: ${vault.name}`, `${vault.path} not found`);
        failCount++;
      }
    }
  } else {
    fail("Vaults", "no vaults configured");
    failCount++;
  }

  console.log(`\n  ${passCount} passed, ${failCount} failed\n`);
}
