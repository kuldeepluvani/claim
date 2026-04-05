import { Database } from "bun:sqlite";

const SCHEMA_VERSION = 1;

const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    tool_name TEXT,
    file_path TEXT,
    content TEXT NOT NULL,
    compressed TEXT,
    repo TEXT,
    branch TEXT,
    is_swept INTEGER NOT NULL DEFAULT 0,
    is_private INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    repo TEXT,
    branch TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    summary TEXT,
    observation_count INTEGER NOT NULL DEFAULT 0,
    knowledge_type TEXT,
    vault_notes_created TEXT
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
    content,
    compressed,
    repo,
    file_path,
    content=observations,
    content_rowid=rowid
  );

  CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
    INSERT INTO observations_fts(rowid, content, compressed, repo, file_path)
    VALUES (new.rowid, new.content, new.compressed, new.repo, new.file_path);
  END;

  CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
    INSERT INTO observations_fts(observations_fts, rowid, content, compressed, repo, file_path)
    VALUES ('delete', old.rowid, old.content, old.compressed, old.repo, old.file_path);
  END;

  CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
    INSERT INTO observations_fts(observations_fts, rowid, content, compressed, repo, file_path)
    VALUES ('delete', old.rowid, old.content, old.compressed, old.repo, old.file_path);
    INSERT INTO observations_fts(rowid, content, compressed, repo, file_path)
    VALUES (new.rowid, new.content, new.compressed, new.repo, new.file_path);
  END;
`;

export function runMigrations(db: Database): void {
  db.exec(CREATE_TABLES);

  const row = db.query("SELECT version FROM schema_version LIMIT 1").get() as { version: number } | null;
  if (!row) {
    db.query("INSERT INTO schema_version (version) VALUES ($version)").run({ $version: SCHEMA_VERSION });
  }
}
