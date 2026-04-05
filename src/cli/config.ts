import { loadConfig, saveConfig, configExists } from "../shared/config";
import { PATHS } from "../shared/paths";
import type { ClaimConfig } from "../shared/types";

export async function configCommand(args: string[]): Promise<void> {
  const sub = args[0];

  if (sub === "set") {
    await configSet(args.slice(1));
  } else if (sub === "add-vault") {
    await configAddVault(args.slice(1));
  } else {
    await configShow();
  }
}

async function configShow(): Promise<void> {
  const config = loadConfig();

  console.log("\nCLAIM Configuration\n");
  console.log(`  Config file: ${PATHS.configFile} ${configExists() ? "(exists)" : "(using defaults)"}\n`);

  console.log("  [claim]");
  console.log(`    data_dir  = ${config.claim.data_dir}`);
  console.log(`    port      = ${config.claim.port}`);

  console.log("\n  [capture]");
  console.log(`    mode                  = ${config.capture.mode}`);
  console.log(`    private_patterns      = ${config.capture.private_patterns.join(", ")}`);
  console.log(`    skip_tools            = ${config.capture.skip_tools.join(", ")}`);
  console.log(`    max_observation_length = ${config.capture.max_observation_length}`);

  console.log("\n  [sweep]");
  console.log(`    enabled          = ${config.sweep.enabled}`);
  console.log(`    prompt_interval  = ${config.sweep.prompt_interval}`);
  console.log(`    time_interval_min = ${config.sweep.time_interval_min}`);
  console.log(`    prune_after_days = ${config.sweep.prune_after_days}`);

  console.log("\n  [context]");
  console.log(`    enabled           = ${config.context.enabled}`);
  console.log(`    max_tokens        = ${config.context.max_tokens}`);
  console.log(`    lookback_sessions = ${config.context.lookback_sessions}`);

  console.log("\n  [vaults]");
  console.log(`    default = ${config.vaults.default}`);
  if (config.vaults.entries.length === 0) {
    console.log("    (no vaults configured)");
  } else {
    for (const v of config.vaults.entries) {
      console.log(`    - ${v.name}: ${v.path} (${v.purpose})`);
    }
  }
  console.log();
}

async function configSet(args: string[]): Promise<void> {
  const key = args[0];
  const value = args.slice(1).join(" ");

  if (!key || !value) {
    console.log("Usage: claim config set <key> <value>");
    console.log("  Keys: capture.mode, claim.port, sweep.enabled, context.enabled, etc.");
    return;
  }

  const config = loadConfig();
  const parts = key.split(".");

  if (parts.length !== 2) {
    console.error("Key must be in format: section.field (e.g., capture.mode)");
    process.exit(1);
  }

  const [section, field] = parts;
  const sectionObj = (config as Record<string, Record<string, unknown>>)[section];

  if (!sectionObj) {
    console.error(`Unknown config section: ${section}`);
    process.exit(1);
  }

  if (!(field in sectionObj)) {
    console.error(`Unknown config field: ${key}`);
    process.exit(1);
  }

  // Type coercion
  const current = sectionObj[field];
  let parsed: unknown;

  if (typeof current === "number") {
    parsed = Number(value);
    if (isNaN(parsed as number)) {
      console.error(`Value for ${key} must be a number.`);
      process.exit(1);
    }
  } else if (typeof current === "boolean") {
    parsed = value === "true" || value === "1";
  } else {
    parsed = value;
  }

  sectionObj[field] = parsed;
  saveConfig(config);
  console.log(`Set ${key} = ${parsed}`);
}

async function configAddVault(args: string[]): Promise<void> {
  // Parse inline args: --name X --path Y --purpose Z
  const nameIdx = args.indexOf("--name");
  const pathIdx = args.indexOf("--path");
  const purposeIdx = args.indexOf("--purpose");

  const name = nameIdx !== -1 ? args[nameIdx + 1] : undefined;
  const path = pathIdx !== -1 ? args[pathIdx + 1] : undefined;
  const purpose = purposeIdx !== -1 ? args[purposeIdx + 1] : undefined;

  if (!name || !path || !purpose) {
    console.log("Usage: claim config add-vault --name <name> --path <path> --purpose <purpose>");
    return;
  }

  const config = loadConfig();

  // Check for duplicate
  if (config.vaults.entries.some((v) => v.name === name)) {
    console.error(`Vault "${name}" already exists.`);
    process.exit(1);
  }

  config.vaults.entries.push({ name, path, purpose, routes: [] });
  saveConfig(config);
  console.log(`Added vault "${name}" at ${path}`);
}
