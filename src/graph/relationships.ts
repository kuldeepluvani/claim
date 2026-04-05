import type { RelationType } from "../shared/types";

export interface ExtractedRelationship {
  source_name: string;
  target_name: string;
  rel_type: RelationType;
  confidence: number;
}

export function extractRelationships(
  observation: {
    repo: string | null;
    content: string;
    category: string | null;
    tool_name: string | null;
    file_path: string | null;
  },
  entities: Array<{ name: string; type: string }>
): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];
  const content = observation.content;
  const repo = observation.repo;
  const seen = new Set<string>();

  function addRel(source: string, target: string, relType: RelationType, confidence: number) {
    const key = `${source}|${target}|${relType}`;
    if (seen.has(key)) return;
    if (source === target) return;
    seen.add(key);
    relationships.push({ source_name: source, target_name: target, rel_type: relType, confidence });
  }

  // 1. Import/require -> uses
  if (repo) {
    const importRegex = /(?:import\s+.*\s+from\s+['"]|require\s*\(\s*['"])([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      const imported = match[1];
      // Check if any entity name appears in the import path
      for (const entity of entities) {
        if (entity.name !== repo && imported.toLowerCase().includes(entity.name.toLowerCase())) {
          addRel(repo, entity.name, "uses", 0.8);
        }
      }
    }
  }

  // 2. Fix/bug/resolve -> fixed_by (category is "debug")
  if (observation.category === "debug" && repo) {
    const fixPatterns = /\b(?:fix|fixed|resolve|resolved|debug|patched)\b/i;
    if (fixPatterns.test(content)) {
      for (const entity of entities) {
        if (entity.type === "service" && entity.name !== repo) {
          addRel(entity.name, repo, "fixed_by", 0.6);
        }
      }
    }
  }

  // 3. Deploy -> deployed_to (category is "deployment")
  if (observation.category === "deployment" && repo) {
    for (const entity of entities) {
      if (entity.type === "service" && entity.name !== repo) {
        addRel(repo, entity.name, "deployed_to", 0.7);
      }
    }
  }

  // 4. PR review -> reviewed_by
  if (repo) {
    const reviewPattern = /\b(?:review|PR|pull\s+request|code\s+review)\b/i;
    if (reviewPattern.test(content)) {
      for (const entity of entities) {
        if (entity.type === "person") {
          addRel(repo, entity.name, "reviewed_by", 0.6);
        }
      }
    }
  }

  // 5. Co-occurrence -> related_to (2+ entities in same observation)
  if (entities.length >= 2) {
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        addRel(entities[i].name, entities[j].name, "related_to", 0.3);
      }
    }
  }

  return relationships;
}
