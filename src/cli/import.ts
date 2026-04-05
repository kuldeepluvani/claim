import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { ClaimDatabase } from "../storage/sqlite";
import { PATHS } from "../shared/paths";
import { ulid } from "../shared/ulid";
import type { Observation } from "../shared/types";

export async function importCommand(args: string[]): Promise<void> {
  if (args.includes("--from") && args.includes("claim-v2")) {
    await importFromV2();
    return;
  }

  const path = args.filter((a) => !a.startsWith("--"))[0];
  if (!path) {
    console.log("Usage: claim import <path> | claim import --from claim-v2");
    return;
  }

  const resolvedPath = path.startsWith("/") ? path : join(process.cwd(), path);

  if (!existsSync(resolvedPath)) {
    console.error(`Path not found: ${resolvedPath}`);
    process.exit(1);
  }

  const stat = statSync(resolvedPath);

  if (stat.isDirectory()) {
    // Check for CLAIM export structure
    if (existsSync(join(resolvedPath, "metadata.json"))) {
      await importClaimExport(resolvedPath);
    } else {
      console.error("Directory does not appear to be a CLAIM export (missing metadata.json).");
      process.exit(1);
    }
  } else if (resolvedPath.endsWith(".jsonl")) {
    await importObservationsJsonl(resolvedPath);
  } else {
    console.error("Unsupported import format. Provide a CLAIM export directory or .jsonl file.");
    process.exit(1);
  }
}

async function importClaimExport(dir: string): Promise<void> {
  const db = new ClaimDatabase(PATHS.dbFile);
  let imported = { observations: 0, sessions: 0, entities: 0, relationships: 0 };
  let skipped = { observations: 0, sessions: 0, entities: 0, relationships: 0 };

  try {
    // Import sessions
    const sessionsFile = join(dir, "sessions.json");
    if (existsSync(sessionsFile)) {
      const sessions = JSON.parse(readFileSync(sessionsFile, "utf-8"));
      for (const session of sessions) {
        const existing = db.getSession(session.id);
        if (existing) {
          skipped.sessions++;
          continue;
        }
        db.insertSession({
          id: session.id,
          repo: session.repo,
          branch: session.branch,
          started_at: session.started_at,
        });
        imported.sessions++;
      }
    }

    // Import observations
    const obsFile = join(dir, "observations.jsonl");
    if (existsSync(obsFile)) {
      const lines = readFileSync(obsFile, "utf-8").trim().split("\n").filter(Boolean);
      for (const line of lines) {
        const obs: Observation = JSON.parse(line);
        const existing = db.getObservation(obs.id);
        if (existing) {
          skipped.observations++;
          continue;
        }
        db.insertObservation(obs);
        imported.observations++;
      }
    }

    // Import entities
    const entFile = join(dir, "entities.json");
    if (existsSync(entFile)) {
      const entities = JSON.parse(readFileSync(entFile, "utf-8"));
      for (const entity of entities) {
        const existing = db.getEntityByName(entity.name);
        if (existing) {
          skipped.entities++;
          continue;
        }
        db.upsertEntity({ name: entity.name, type: entity.type, aliases: entity.aliases });
        imported.entities++;
      }
    }

    // Import relationships
    const relFile = join(dir, "relationships.json");
    if (existsSync(relFile)) {
      const relationships = JSON.parse(readFileSync(relFile, "utf-8"));
      for (const rel of relationships) {
        // Skip if source or target entity doesn't exist in the DB
        const source = db.getEntity(rel.source_id);
        const target = db.getEntity(rel.target_id);
        if (!source || !target) {
          skipped.relationships++;
          continue;
        }
        try {
          db.insertRelationship({
            source_id: rel.source_id,
            target_id: rel.target_id,
            rel_type: rel.rel_type,
            confidence: rel.confidence,
            evidence: rel.evidence,
          });
          imported.relationships++;
        } catch {
          skipped.relationships++;
        }
      }
    }

    console.log("Import complete:");
    console.log(`  Observations: ${imported.observations} imported, ${skipped.observations} skipped`);
    console.log(`  Sessions:     ${imported.sessions} imported, ${skipped.sessions} skipped`);
    console.log(`  Entities:     ${imported.entities} imported, ${skipped.entities} skipped`);
    console.log(`  Relationships: ${imported.relationships} imported, ${skipped.relationships} skipped`);
  } finally {
    db.close();
  }
}

async function importObservationsJsonl(filePath: string): Promise<void> {
  const db = new ClaimDatabase(PATHS.dbFile);
  let imported = 0;
  let skipped = 0;

  try {
    const lines = readFileSync(filePath, "utf-8").trim().split("\n").filter(Boolean);
    for (const line of lines) {
      const obs: Observation = JSON.parse(line);
      const existing = db.getObservation(obs.id);
      if (existing) {
        skipped++;
        continue;
      }
      db.insertObservation(obs);
      imported++;
    }

    console.log(`Imported ${imported} observations, skipped ${skipped} duplicates.`);
  } finally {
    db.close();
  }
}

async function importFromV2(): Promise<void> {
  const memoryDir = join(homedir(), ".claude", "memory");
  if (!existsSync(memoryDir)) {
    console.error("No Claude v2 memory directory found at ~/.claude/memory/");
    return;
  }

  const db = new ClaimDatabase(PATHS.dbFile);
  let imported = 0;

  try {
    const files = readdirSync(memoryDir).filter((f) => f.endsWith(".md"));
    const sessionId = `v2-import-${Date.now()}`;

    // Create a session for the import
    db.insertSession({
      id: sessionId,
      repo: null,
      branch: null,
      started_at: new Date().toISOString(),
    });

    for (const file of files) {
      const content = readFileSync(join(memoryDir, file), "utf-8");
      const name = basename(file, ".md");

      // Parse basic frontmatter
      let type = "discovery";
      let description = "";
      if (content.startsWith("---")) {
        const endIdx = content.indexOf("---", 3);
        if (endIdx !== -1) {
          const frontmatter = content.slice(3, endIdx);
          const typeMatch = frontmatter.match(/type:\s*(.+)/);
          if (typeMatch) type = typeMatch[1].trim();
          const descMatch = frontmatter.match(/description:\s*(.+)/);
          if (descMatch) description = descMatch[1].trim();
        }
      }

      const obsContent = description || content.slice(0, 500);

      db.insertObservation({
        id: ulid(),
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        type: type as "discovery",
        category: null,
        tool_name: null,
        file_path: join(memoryDir, file),
        content: `[v2-import:${name}] ${obsContent}`,
        compressed: null,
        repo: null,
        branch: null,
        is_swept: false,
        is_private: false,
      });
      imported++;
    }

    db.endSession(sessionId, `Imported ${imported} memory files from CLAIM v2`, "import");

    console.log(`Imported ${imported} memory files from ~/.claude/memory/`);
  } finally {
    db.close();
  }
}
