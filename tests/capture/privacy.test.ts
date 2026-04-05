import { describe, it, expect } from "bun:test";
import { isPrivate } from "../../src/capture/privacy";

const DEFAULT_PATTERNS = [".env", ".env.*", "*.pem", "*.key", "credentials*", "id_rsa*"];

describe("isPrivate", () => {
  it("detects .env files", () => {
    expect(isPrivate("/project/.env", null, DEFAULT_PATTERNS)).toBe(true);
    expect(isPrivate("/project/.env.local", null, DEFAULT_PATTERNS)).toBe(true);
  });

  it("detects credential files", () => {
    expect(isPrivate("/home/user/credentials.json", null, DEFAULT_PATTERNS)).toBe(true);
    expect(isPrivate("/home/user/credentials", null, DEFAULT_PATTERNS)).toBe(true);
  });

  it("detects key files", () => {
    expect(isPrivate("/ssh/id_rsa", null, DEFAULT_PATTERNS)).toBe(true);
    expect(isPrivate("/certs/server.pem", null, DEFAULT_PATTERNS)).toBe(true);
    expect(isPrivate("/certs/server.key", null, DEFAULT_PATTERNS)).toBe(true);
  });

  it("detects <private> tag in content", () => {
    expect(isPrivate(null, "some text <private>secret stuff</private> more text", DEFAULT_PATTERNS)).toBe(true);
    expect(isPrivate(null, "<PRIVATE>secret</PRIVATE>", DEFAULT_PATTERNS)).toBe(true);
  });

  it("passes normal files", () => {
    expect(isPrivate("/src/index.ts", null, DEFAULT_PATTERNS)).toBe(false);
    expect(isPrivate("/README.md", null, DEFAULT_PATTERNS)).toBe(false);
    expect(isPrivate("/src/capture/observer.ts", "some code", DEFAULT_PATTERNS)).toBe(false);
  });

  it("handles null inputs", () => {
    expect(isPrivate(null, null, DEFAULT_PATTERNS)).toBe(false);
    expect(isPrivate(null, "normal content", DEFAULT_PATTERNS)).toBe(false);
  });
});
