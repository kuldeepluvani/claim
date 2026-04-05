import { mkdirSync, existsSync, writeFileSync } from "fs";
import { PATHS } from "../shared/paths";
import { loadConfig, saveConfig, configExists, DEFAULT_CONFIG } from "../shared/config";
import { installHooks, uninstallHooks, isHooksInstalled } from "../hooks/installer";
import { handleHookCli, parseHookStdin } from "../hooks/handler";
import { createServer } from "../worker/server";
import { ClaimDatabase } from "../storage/sqlite";
import { generateRulesFile } from "../rules/generator";

const args = process.argv.slice(2);
const command = args[0];

async function init() {
  console.log("Initializing CLAIM...\n");

  // 1. Create ~/.claim/ directory
  mkdirSync(PATHS.claimDir, { recursive: true });
  console.log("  \u2713 Created data directory:", PATHS.claimDir);

  // 2. Save default config if not exists
  if (!configExists()) {
    saveConfig(DEFAULT_CONFIG);
    console.log("  \u2713 Created default config:", PATHS.configFile);
  } else {
    console.log("  \u2713 Config already exists:", PATHS.configFile);
  }

  // 3. Initialize database
  const db = new ClaimDatabase(PATHS.dbFile);
  db.close();
  console.log("  \u2713 Initialized database:", PATHS.dbFile);

  // 4. Install hooks
  installHooks(PATHS.claudeSettingsFile);
  console.log("  \u2713 Installed Claude Code hooks");

  // 5. Generate and write rules file
  const config = loadConfig();
  const rules = generateRulesFile(config);
  mkdirSync(PATHS.claudeRulesDir, { recursive: true });
  writeFileSync(PATHS.claimRulesFile, rules);
  console.log("  \u2713 Generated rules file:", PATHS.claimRulesFile);

  console.log("\nCLAIM initialized. Run `claim serve` to start the worker.");
}

async function status() {
  const config = loadConfig();
  const url = `http://localhost:${config.claim.port}`;

  try {
    const res = await fetch(`${url}/api/status`);
    const data = (await res.json()) as {
      observations: number;
      sessions: number;
      active_session: string | null;
      uptime_seconds: number | null;
    };

    console.log("CLAIM Status\n");
    console.log("  Worker:       RUNNING at", url);
    console.log("  Observations:", data.observations);
    console.log("  Sessions:    ", data.sessions);
    if (data.uptime_seconds !== null) {
      const mins = Math.floor(data.uptime_seconds / 60);
      console.log("  Uptime:      ", `${mins}m`);
    }
    console.log("  Hooks:       ", isHooksInstalled(PATHS.claudeSettingsFile) ? "installed" : "NOT installed");
    console.log("  Config:      ", configExists() ? "exists" : "NOT found");
  } catch {
    console.log("CLAIM Status\n");
    console.log("  Worker:       NOT RUNNING");
    console.log("  Hooks:       ", isHooksInstalled(PATHS.claudeSettingsFile) ? "installed" : "NOT installed");
    console.log("  Config:      ", configExists() ? "exists" : "NOT found");
    console.log("\n  Start the worker with: claim serve");
  }
}

function serve() {
  const config = loadConfig();
  const { port } = config.claim;
  const dbPath = PATHS.dbFile;

  const server = createServer({ port, dbPath });
  console.log(`CLAIM worker listening at http://localhost:${server.port}`);
}

async function hook(event: string) {
  if (!event) {
    console.error("Usage: claim hook <event>");
    process.exit(1);
  }

  const config = loadConfig();
  const workerUrl = `http://localhost:${config.claim.port}`;
  const payload = await parseHookStdin();
  const result = await handleHookCli(event, payload, workerUrl);

  // For session-start, if there's context data, print it for Claude to read
  if (event === "session-start" && result.success && result.data) {
    const data = result.data as { context?: string };
    if (data.context) {
      console.log(data.context);
    }
  }
}

function uninstall() {
  uninstallHooks(PATHS.claudeSettingsFile);
  console.log("CLAIM hooks uninstalled from Claude Code settings.");
}

async function main() {
  switch (command) {
    case "init":
    case undefined:
      await init();
      break;
    case "status":
      await status();
      break;
    case "serve":
      serve();
      break;
    case "hook":
      await hook(args[1]);
      break;
    case "version":
      console.log("claim v3.0.0-alpha.1");
      break;
    case "uninstall":
      uninstall();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log("Usage: claim [init|status|serve|hook|version|uninstall]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message ?? err);
  process.exit(1);
});
