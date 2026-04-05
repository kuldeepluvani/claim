import { ClaimDatabase } from "../storage/sqlite";
import { extractEntities } from "../graph/entities";
import { extractRelationships } from "../graph/relationships";
import type { ClaimConfig, Observation, VaultConfig } from "../shared/types";

export interface SweepResult {
  observations_processed: number;
  entities_extracted: number;
  relationships_extracted: number;
  vault_notes_written: number;
  observations_pruned: number;
}

export class SweepEngine {
  constructor(
    private db: ClaimDatabase,
    private config: ClaimConfig
  ) {}

  async sweep(): Promise<SweepResult> {
    const result: SweepResult = {
      observations_processed: 0,
      entities_extracted: 0,
      relationships_extracted: 0,
      vault_notes_written: 0,
      observations_pruned: 0,
    };

    // 1. COLLECT: Get un-swept observations
    const unswept = this.db.getUnsweptObservations(100);
    if (unswept.length === 0) {
      result.observations_pruned = this.pruneOld();
      return result;
    }
    result.observations_processed = unswept.length;

    // 2. EXTRACT ENTITIES: For each observation, extract and upsert entities
    for (const obs of unswept) {
      const entities = extractEntities({
        repo: obs.repo,
        file_path: obs.file_path,
        content: obs.content,
        tool_name: obs.tool_name,
      });

      const entityIds: Array<{ name: string; type: string; id: string }> = [];
      for (const e of entities) {
        const id = this.db.upsertEntity({ name: e.name, type: e.type, aliases: e.aliases });
        entityIds.push({ name: e.name, type: e.type, id });
        result.entities_extracted++;
      }

      // 3. EXTRACT RELATIONSHIPS
      const rels = extractRelationships(
        { repo: obs.repo, content: obs.content, category: obs.category, tool_name: obs.tool_name, file_path: obs.file_path },
        entityIds
      );
      for (const rel of rels) {
        const sourceEntity = this.db.getEntityByName(rel.source_name);
        const targetEntity = this.db.getEntityByName(rel.target_name);
        if (sourceEntity && targetEntity) {
          this.db.insertRelationship({
            source_id: sourceEntity.id,
            target_id: targetEntity.id,
            rel_type: rel.rel_type,
            confidence: rel.confidence,
            evidence: obs.id,
          });
          result.relationships_extracted++;
        }
      }

      // 4. MARK SWEPT
      this.db.markObservationSwept(obs.id);
    }

    // 5. WRITE VAULT NOTES (if vaults configured)
    if (this.config.vaults.entries.length > 0) {
      result.vault_notes_written = this.writeVaultNotes(unswept);
    }

    // 6. PRUNE old swept observations
    result.observations_pruned = this.pruneOld();

    return result;
  }

  private writeVaultNotes(observations: Observation[]): number {
    // Group observations by repo
    const grouped = new Map<string, Observation[]>();
    for (const obs of observations) {
      const key = obs.repo || "general";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(obs);
    }

    let notesWritten = 0;
    for (const [repo, obs] of grouped) {
      const vault = this.findVault(repo, obs);
      if (!vault) continue;

      const noteContent = this.buildNote(repo, obs);
      const notePath = this.buildNotePath(vault, repo);

      try {
        const { mkdirSync, writeFileSync } = require("fs");
        const { dirname, join } = require("path");

        const fullPath = join(vault.path, notePath);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, noteContent);
        notesWritten++;
      } catch {
        // Vault write failure is non-fatal
      }
    }
    return notesWritten;
  }

  private findVault(repo: string, observations: Observation[]): VaultConfig | null {
    for (const vault of this.config.vaults.entries) {
      for (const route of vault.routes) {
        if (
          route.match.some(
            (keyword) =>
              repo.toLowerCase().includes(keyword) ||
              observations.some((o) => o.content.toLowerCase().includes(keyword))
          )
        ) {
          return vault;
        }
      }
    }
    // Fall back to default vault
    const defaultVault = this.config.vaults.entries.find((v) => v.name === this.config.vaults.default);
    return defaultVault || null;
  }

  private buildNote(repo: string, observations: Observation[]): string {
    const date = new Date().toISOString().slice(0, 10);
    const categories = [...new Set(observations.map((o) => o.category).filter(Boolean))];

    let note = `---\ntags: [claim-sweep]\nrepo: ${repo}\ndate: ${date}\n---\n\n`;
    note += `# ${repo} — Session Activity (${date})\n\n`;
    note += `${observations.length} observations captured.\n\n`;

    if (categories.length > 0) {
      note += `## Activity\n\n`;
      for (const cat of categories) {
        const catObs = observations.filter((o) => o.category === cat);
        note += `### ${cat} (${catObs.length})\n\n`;
        for (const o of catObs.slice(0, 10)) {
          note += `- ${o.content.slice(0, 120)}\n`;
        }
        note += `\n`;
      }
    }

    const uncategorized = observations.filter((o) => !o.category);
    if (uncategorized.length > 0) {
      note += `### Other (${uncategorized.length})\n\n`;
      for (const o of uncategorized.slice(0, 10)) {
        note += `- ${o.content.slice(0, 120)}\n`;
      }
    }

    return note;
  }

  private buildNotePath(vault: VaultConfig, repo: string): string {
    const date = new Date().toISOString().slice(0, 10);
    for (const route of vault.routes) {
      if (route.folder.includes("{name}")) {
        return route.folder.replace("{name}", repo) + `/${date}-sweep.md`;
      }
    }
    return `Daily/${date}-${repo}-sweep.md`;
  }

  private pruneOld(): number {
    const cutoffDays = this.config.sweep.prune_after_days;
    return this.db.pruneSweptObservations(cutoffDays);
  }
}
