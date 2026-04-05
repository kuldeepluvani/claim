import { describe, it, expect } from "bun:test";
import { classifyObservation } from "../../src/capture/classifier";

describe("classifyObservation", () => {
  it("classifies Edit as code_change", () => {
    const result = classifyObservation("Edit", "/src/index.ts", "replaced some code");
    expect(result.type).toBe("tool_use");
    expect(result.category).toBe("code_change");
  });

  it("classifies Write as code_change", () => {
    const result = classifyObservation("Write", "/src/new-file.ts", "new file content");
    expect(result.type).toBe("tool_use");
    expect(result.category).toBe("code_change");
  });

  it("classifies git push as deployment", () => {
    const result = classifyObservation("Bash", null, "git push origin main");
    expect(result.type).toBe("tool_use");
    expect(result.category).toBe("deployment");
  });

  it("classifies bun test as test", () => {
    const result = classifyObservation("Bash", null, "bun test tests/capture/");
    expect(result.type).toBe("tool_use");
    expect(result.category).toBe("test");
  });

  it("classifies git commit as code_change", () => {
    const result = classifyObservation("Bash", null, 'git commit -m "feat: add thing"');
    expect(result.type).toBe("tool_use");
    expect(result.category).toBe("code_change");
  });

  it("classifies unknown bash as null category", () => {
    const result = classifyObservation("Bash", null, "echo hello");
    expect(result.type).toBe("tool_use");
    expect(result.category).toBeNull();
  });

  it("classifies deploy command as deployment", () => {
    const result = classifyObservation("Bash", null, "kubectl apply -f deploy.yaml");
    expect(result.type).toBe("tool_use");
    expect(result.category).toBe("deployment");
  });

  it("classifies jest as test", () => {
    const result = classifyObservation("Bash", null, "npx jest --watch");
    expect(result.type).toBe("tool_use");
    expect(result.category).toBe("test");
  });

  it("classifies debug content as debug", () => {
    const result = classifyObservation("Bash", null, "added console.log for debugging");
    expect(result.type).toBe("tool_use");
    expect(result.category).toBe("debug");
  });

  it("classifies gh pr as review", () => {
    const result = classifyObservation("Bash", null, "gh pr create --title 'fix'");
    expect(result.type).toBe("tool_use");
    expect(result.category).toBe("review");
  });
});
