import { describe, it, expect } from "bun:test";
import { extractEntities } from "../../src/graph/entities";

describe("extractEntities", () => {
  it("extracts service from repo name", () => {
    const entities = extractEntities({
      repo: "claim",
      file_path: null,
      content: "working on the project",
      tool_name: null,
    });

    const service = entities.find((e) => e.type === "service" && e.name === "claim");
    expect(service).toBeDefined();
  });

  it("extracts person from @mention", () => {
    const entities = extractEntities({
      repo: null,
      file_path: null,
      content: "reviewed by @kuldeep and @charles",
      tool_name: null,
    });

    const people = entities.filter((e) => e.type === "person");
    expect(people.length).toBe(2);
    expect(people.map((p) => p.name).sort()).toEqual(["charles", "kuldeep"]);
  });

  it("extracts ticket from TEC-1234 pattern", () => {
    const entities = extractEntities({
      repo: null,
      file_path: null,
      content: "fixing TEC-1234 and JIRA-567",
      tool_name: null,
    });

    const tickets = entities.filter((e) => e.type === "ticket");
    expect(tickets.length).toBe(2);
    expect(tickets.map((t) => t.name).sort()).toEqual(["JIRA-567", "TEC-1234"]);
  });

  it("extracts concept from file path", () => {
    const entities = extractEntities({
      repo: null,
      file_path: "/src/auth/handler.ts",
      content: "updated handler",
      tool_name: null,
    });

    const concept = entities.find((e) => e.type === "concept" && e.name === "auth");
    expect(concept).toBeDefined();
  });

  it("deduplicates entities", () => {
    const entities = extractEntities({
      repo: "claim",
      file_path: null,
      content: "@kuldeep mentioned @kuldeep again",
      tool_name: null,
    });

    const people = entities.filter((e) => e.type === "person");
    expect(people.length).toBe(1);
  });

  it("handles null/empty inputs", () => {
    const entities = extractEntities({
      repo: null,
      file_path: null,
      content: "",
      tool_name: null,
    });

    expect(entities).toEqual([]);
  });

  it("extracts api from URL", () => {
    const entities = extractEntities({
      repo: null,
      file_path: null,
      content: "calling https://api.github.com/repos",
      tool_name: null,
    });

    const api = entities.find((e) => e.type === "api");
    expect(api).toBeDefined();
    expect(api!.name).toBe("api.github.com");
  });

  it("extracts concept from git branch pattern", () => {
    const entities = extractEntities({
      repo: null,
      file_path: null,
      content: "merging feat/auth-migration into main",
      tool_name: null,
    });

    const concept = entities.find((e) => e.type === "concept" && e.name === "auth-migration");
    expect(concept).toBeDefined();
  });

  it("skips known tools but captures unknown ones", () => {
    const known = extractEntities({
      repo: null,
      file_path: null,
      content: "used a tool",
      tool_name: "Bash",
    });
    expect(known.filter((e) => e.type === "tool").length).toBe(0);

    const unknown = extractEntities({
      repo: null,
      file_path: null,
      content: "used a tool",
      tool_name: "CustomLinter",
    });
    const tool = unknown.find((e) => e.type === "tool");
    expect(tool).toBeDefined();
    expect(tool!.name).toBe("CustomLinter");
  });
});
