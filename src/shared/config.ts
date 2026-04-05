import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { PATHS } from "./paths";
import type { ClaimConfig } from "./types";

const DEFAULT_CONFIG: ClaimConfig = {
  claim: { data_dir: PATHS.claimDir, port: 2626 },
  capture: {
    mode: "auto",
    private_patterns: ["*.env", "*credentials*", "*secret*", "*token*"],
    skip_tools: ["Read", "Glob", "Grep"],
    max_observation_length: 500,
  },
  sweep: { enabled: true, prompt_interval: 10, time_interval_min: 30, prune_after_days: 7 },
  context: { enabled: true, max_tokens: 500, lookback_sessions: 3 },
  vaults: { default: "personal", entries: [] },
};

export function loadConfig(): ClaimConfig {
  if (!existsSync(PATHS.configFile)) return { ...DEFAULT_CONFIG };
  const raw = readFileSync(PATHS.configFile, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: ClaimConfig): void {
  mkdirSync(PATHS.claimDir, { recursive: true });
  writeFileSync(PATHS.configFile, JSON.stringify(config, null, 2));
}

export function configExists(): boolean {
  return existsSync(PATHS.configFile);
}

export { DEFAULT_CONFIG };
