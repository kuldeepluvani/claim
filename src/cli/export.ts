import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { ClaimDatabase } from "../storage/sqlite";
import { PATHS } from "../shared/paths";

export async function exportCommand(args: string[]): Promise<void> {
  const outputIdx = args.indexOf("--output");
  const now = new Date().toISOString().slice(0, 10);
  const defaultDir = `claim-export-${now}`;
  const outputDir = outputIdx !== -1 && args[outputIdx + 1]
    ? join(args[outputIdx + 1], defaultDir)
    : join(process.cwd(), defaultDir);

  const db = new ClaimDatabase(PATHS.dbFile);

  try {
    // Gather data
    const observations = db.getTimeline(undefined, undefined, 100000);
    const sessions = db.getRecentSessions(100000);
    const entities = db.getEntities(undefined, 100000);

    // Build relationships from all entities
    const relationshipSet = new Map<string, unknown>();
    for (const entity of entities) {
      const rels = db.getRelationshipsFor(entity.id);
      for (const rel of rels) {
        relationshipSet.set(rel.id, {
          id: rel.id,
          source_id: rel.source_id,
          target_id: rel.target_id,
          rel_type: rel.rel_type,
          confidence: rel.confidence,
          evidence: rel.evidence,
          created_at: rel.created_at,
        });
      }
    }
    const relationships = Array.from(relationshipSet.values());

    // Create output directory
    mkdirSync(outputDir, { recursive: true });

    // Write observations as JSONL
    const obsLines = observations.map((o) => JSON.stringify(o)).join("\n");
    writeFileSync(join(outputDir, "observations.jsonl"), obsLines + (obsLines ? "\n" : ""));

    // Write sessions
    writeFileSync(join(outputDir, "sessions.json"), JSON.stringify(sessions, null, 2));

    // Write entities
    writeFileSync(join(outputDir, "entities.json"), JSON.stringify(entities, null, 2));

    // Write relationships
    writeFileSync(join(outputDir, "relationships.json"), JSON.stringify(relationships, null, 2));

    // Write metadata
    const metadata = {
      version: "3.0.0-alpha.1",
      exported_at: new Date().toISOString(),
      counts: {
        observations: observations.length,
        sessions: sessions.length,
        entities: entities.length,
        relationships: relationships.length,
      },
    };
    writeFileSync(join(outputDir, "metadata.json"), JSON.stringify(metadata, null, 2));

    console.log(`Exported ${observations.length} observations, ${sessions.length} sessions, ${entities.length} entities to ${outputDir}`);
  } finally {
    db.close();
  }
}
