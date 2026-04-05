import { homedir } from "os";
import { join } from "path";

const HOME = homedir();

export const PATHS = {
  claimDir: join(HOME, ".claim"),
  configFile: join(HOME, ".claim", "config.toml"),
  dbFile: join(HOME, ".claim", "claim.db"),
  logFile: join(HOME, ".claim", "claim.log"),
  pidFile: join(HOME, ".claim", "worker.pid"),
  claudeSettingsFile: join(HOME, ".claude", "settings.json"),
  claudeRulesDir: join(HOME, ".claude", "rules"),
  claimRulesFile: join(HOME, ".claude", "rules", "claim.md"),
} as const;
