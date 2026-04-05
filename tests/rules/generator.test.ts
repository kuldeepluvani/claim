import { describe, it, expect } from "bun:test";
import { generateRulesFile } from "../../src/rules/generator";
import type { ClaimConfig } from "../../src/shared/types";

const BASE_CONFIG: ClaimConfig = {
  claim: { data_dir: "~/.claim", port: 2626 },
  capture: { mode: "auto", private_patterns: [], skip_tools: [], max_observation_length: 500 },
  sweep: { enabled: true, prompt_interval: 10, time_interval_min: 30, prune_after_days: 7 },
  context: { enabled: true, max_tokens: 500, lookback_sessions: 3 },
  vaults: { default: "personal", entries: [] },
};

describe("Rules Generator", () => {
  it("generates valid markdown with frontmatter", () => {
    const output = generateRulesFile(BASE_CONFIG);
    expect(output).toContain("---");
    expect(output).toContain("alwaysApply: true");
    expect(output).toContain("# CLAIM");
  });

  it("includes memory capture instructions", () => {
    const output = generateRulesFile(BASE_CONFIG);
    const lower = output.toLowerCase();
    expect(lower).toContain("memory");
    expect(lower).toContain("capture");
  });

  it("includes vault routing when vaults configured", () => {
    const config: ClaimConfig = {
      ...BASE_CONFIG,
      vaults: {
        default: "work",
        entries: [
          {
            name: "work",
            path: "/Users/me/vaults/work",
            purpose: "Work knowledge base",
            routes: [{ match: ["*.md"], folder: "Notes" }],
          },
        ],
      },
    };
    const output = generateRulesFile(config);
    expect(output).toContain("/Users/me/vaults/work");
    expect(output).toContain("Work knowledge base");
  });

  it("includes search protocol", () => {
    const output = generateRulesFile(BASE_CONFIG);
    const lower = output.toLowerCase();
    expect(lower).toContain("search");
    expect(lower).toContain("registry");
  });
});
