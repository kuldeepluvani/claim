export type ObservationType = "tool_use" | "decision" | "discovery" | "error" | "summary";
export type ObservationCategory = "code_change" | "deployment" | "test" | "debug" | "review" | "investigation" | null;

export type EntityType = "service" | "person" | "concept" | "ticket" | "incident" | "tool" | "api";
export type RelationType = "depends_on" | "caused" | "fixed_by" | "related_to" | "reviewed_by" | "deployed_to" | "uses";

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  aliases: string[];
  first_seen: string;
  last_seen: string;
  observation_count: number;
  vault_note_path: string | null;
}

export interface Relationship {
  id: string;
  source_id: string;
  target_id: string;
  rel_type: RelationType;
  confidence: number;
  evidence: string | null;
  created_at: string;
}

export interface Observation {
  id: string;
  session_id: string;
  timestamp: string;
  type: ObservationType;
  category: ObservationCategory;
  tool_name: string | null;
  file_path: string | null;
  content: string;
  compressed: string | null;
  repo: string | null;
  branch: string | null;
  is_swept: boolean;
  is_private: boolean;
}

export interface Session {
  id: string;
  repo: string | null;
  branch: string | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  observation_count: number;
  knowledge_type: string | null;
}

export interface HookEvent {
  event: string;
  session_id?: string;
  tool_name?: string;
  file_path?: string;
  content?: string;
  timestamp: string;
  repo?: string;
  branch?: string;
}

export interface VaultConfig {
  name: string;
  path: string;
  purpose: string;
  routes: Array<{ match: string[]; folder: string }>;
}

export interface ClaimConfig {
  claim: { data_dir: string; port: number };
  capture: { mode: "auto" | "confirm" | "off"; private_patterns: string[]; skip_tools: string[]; max_observation_length: number };
  sweep: { enabled: boolean; prompt_interval: number; time_interval_min: number; prune_after_days: number };
  context: { enabled: boolean; max_tokens: number; lookback_sessions: number };
  vaults: { default: string; entries: VaultConfig[] };
}

export interface StatusInfo {
  observations: number;
  sessions: number;
  active_session: string | null;
  worker_running: boolean;
  config_exists: boolean;
  hooks_installed: boolean;
  uptime_seconds: number | null;
}
