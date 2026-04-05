import { Database } from "bun:sqlite";

const SCHEMA_VERSION = 2;

const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
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
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        aliases TEXT DEFAULT '[]',
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        observation_count INTEGER DEFAULT 0,
        vault_note_path TEXT
      );

      CREATE TABLE IF NOT EXISTS relationships (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        rel_type TEXT NOT NULL,
        confidence REAL DEFAULT 0.5,
        evidence TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_id) REFERENCES entities(id),
        FOREIGN KEY (target_id) REFERENCES entities(id)
      );

      CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
      CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id);
    `,
  },
];

export function runMigrations(db: Database): void {
  // Always run migration 1 first (creates schema_version table)
  db.exec(MIGRATIONS[0].sql);

  const row = db.query("SELECT version FROM schema_version LIMIT 1").get() as { version: number } | null;
  const currentVersion = row?.version ?? 0;

  if (!row) {
    db.query("INSERT INTO schema_version (version) VALUES ($version)").run({ $version: 0 });
  }

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      db.exec(migration.sql);
    }
  }

  if (currentVersion < SCHEMA_VERSION) {
    db.query("UPDATE schema_version SET version = $version").run({ $version: SCHEMA_VERSION });
  }
}
