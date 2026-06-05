import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configPath, loadUserConfig, resolveSecret } from "./config";

describe("resolveSecret", () => {
  test("a literal key passes through with no hint", () => {
    expect(resolveSecret("sk-abc123")).toEqual({ value: "sk-abc123", hint: null });
  });

  test("${VAR} resolves from the environment", () => {
    process.env.GT_TEST_KEY = "from-env";
    try {
      expect(resolveSecret("${GT_TEST_KEY}")).toEqual({ value: "from-env", hint: "${GT_TEST_KEY}" });
    } finally {
      delete process.env.GT_TEST_KEY;
    }
  });

  test("${VAR} for an unset var yields null value but keeps the hint", () => {
    delete process.env.GT_MISSING_KEY;
    expect(resolveSecret("${GT_MISSING_KEY}")).toEqual({ value: null, hint: "${GT_MISSING_KEY}" });
  });

  test("a malformed ${...} reference throws rather than passing through", () => {
    expect(() => resolveSecret("Bearer ${X}")).toThrow();
  });
});

describe("loadUserConfig", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "git-therapy-cfg-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.GIT_THERAPY_CONFIG;
  });

  test("configPath honors GIT_THERAPY_CONFIG", () => {
    process.env.GIT_THERAPY_CONFIG = "/tmp/custom.json";
    expect(configPath()).toBe("/tmp/custom.json");
  });

  test("a missing file yields an empty config", () => {
    process.env.GIT_THERAPY_CONFIG = join(dir, "nope.json");
    expect(loadUserConfig()).toEqual({});
  });

  test("a valid file parses", () => {
    const path = join(dir, "config.json");
    writeFileSync(
      path,
      JSON.stringify({
        default: { provider: "ollama" },
        providers: { ollama: { models: ["a", "b"] } },
      }),
    );
    process.env.GIT_THERAPY_CONFIG = path;
    expect(loadUserConfig()).toEqual({
      default: { provider: "ollama" },
      providers: { ollama: { models: ["a", "b"] } },
    });
  });

  test("invalid JSON throws", () => {
    const path = join(dir, "config.json");
    writeFileSync(path, "{ not json");
    process.env.GIT_THERAPY_CONFIG = path;
    expect(() => loadUserConfig()).toThrow(/not valid JSON/);
  });

  test("an unknown key is rejected (strict schema)", () => {
    const path = join(dir, "config.json");
    writeFileSync(path, JSON.stringify({ bogus: true }));
    process.env.GIT_THERAPY_CONFIG = path;
    expect(() => loadUserConfig()).toThrow(/invalid/);
  });
});
