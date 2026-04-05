import { describe, it, expect } from "bun:test";
import { extractRelationships } from "../../src/graph/relationships";

describe("extractRelationships", () => {
  it("extracts uses relationship from import", () => {
    const rels = extractRelationships(
      {
        repo: "claim",
        content: 'import { Database } from "sqlite-lib"',
        category: null,
        tool_name: null,
        file_path: null,
      },
      [
        { name: "claim", type: "service" },
        { name: "sqlite-lib", type: "tool" },
      ]
    );

    const uses = rels.find((r) => r.rel_type === "uses");
    expect(uses).toBeDefined();
    expect(uses!.source_name).toBe("claim");
    expect(uses!.target_name).toBe("sqlite-lib");
    expect(uses!.confidence).toBe(0.8);
  });

  it("extracts deployed_to from deployment observation", () => {
    const rels = extractRelationships(
      {
        repo: "claim",
        content: "deployed to production cluster",
        category: "deployment",
        tool_name: null,
        file_path: null,
      },
      [
        { name: "claim", type: "service" },
        { name: "auth-service", type: "service" },
      ]
    );

    const deploy = rels.find((r) => r.rel_type === "deployed_to");
    expect(deploy).toBeDefined();
    expect(deploy!.source_name).toBe("claim");
    expect(deploy!.target_name).toBe("auth-service");
    expect(deploy!.confidence).toBe(0.7);
  });

  it("extracts related_to from co-occurrence", () => {
    const rels = extractRelationships(
      {
        repo: null,
        content: "both services involved",
        category: null,
        tool_name: null,
        file_path: null,
      },
      [
        { name: "service-a", type: "service" },
        { name: "service-b", type: "service" },
      ]
    );

    const related = rels.find((r) => r.rel_type === "related_to");
    expect(related).toBeDefined();
    expect(related!.confidence).toBe(0.3);
  });

  it("returns empty for single-entity observations", () => {
    const rels = extractRelationships(
      {
        repo: null,
        content: "just one entity here",
        category: null,
        tool_name: null,
        file_path: null,
      },
      [{ name: "claim", type: "service" }]
    );

    // Single entity can't have co-occurrence, and no import/deploy/review patterns
    expect(rels.length).toBe(0);
  });

  it("sets appropriate confidence levels", () => {
    const rels = extractRelationships(
      {
        repo: "claim",
        content: 'import { auth } from "auth-lib"; PR reviewed by team',
        category: null,
        tool_name: null,
        file_path: null,
      },
      [
        { name: "claim", type: "service" },
        { name: "auth-lib", type: "tool" },
        { name: "alice", type: "person" },
      ]
    );

    const uses = rels.find((r) => r.rel_type === "uses");
    const reviewed = rels.find((r) => r.rel_type === "reviewed_by");
    const related = rels.find((r) => r.rel_type === "related_to");

    expect(uses?.confidence).toBe(0.8);
    expect(reviewed?.confidence).toBe(0.6);
    expect(related?.confidence).toBe(0.3);
  });

  it("extracts reviewed_by from PR content", () => {
    const rels = extractRelationships(
      {
        repo: "claim",
        content: "PR review completed",
        category: "review",
        tool_name: null,
        file_path: null,
      },
      [
        { name: "claim", type: "service" },
        { name: "kuldeep", type: "person" },
      ]
    );

    const review = rels.find((r) => r.rel_type === "reviewed_by");
    expect(review).toBeDefined();
    expect(review!.source_name).toBe("claim");
    expect(review!.target_name).toBe("kuldeep");
  });

  it("extracts fixed_by from debug category", () => {
    const rels = extractRelationships(
      {
        repo: "claim",
        content: "fixed the auth-service connection issue",
        category: "debug",
        tool_name: null,
        file_path: null,
      },
      [
        { name: "claim", type: "service" },
        { name: "auth-service", type: "service" },
      ]
    );

    const fix = rels.find((r) => r.rel_type === "fixed_by");
    expect(fix).toBeDefined();
    expect(fix!.source_name).toBe("auth-service");
    expect(fix!.target_name).toBe("claim");
    expect(fix!.confidence).toBe(0.6);
  });
});
