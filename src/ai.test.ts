// The provider registry is built once and memoized, so this file installs a
// single config (via GIT_THERAPY_CONFIG) before touching any registry function
// and asserts the full merge in one place.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resetRegistryForTests } from "./ai";

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "git-therapy-ai-"));
  const path = join(dir, "config.json");
  writeFileSync(
    path,
    JSON.stringify({
      default: { provider: "openrouter", model: "qwen/qwen3.6-flash" },
      language: "Czech",
      order: ["openrouter", "ollama"],
      providers: {
        // extend a built-in: append a model to ollama's cycle list
        ollama: { models: ["m-one", "m-two"] },
        // a brand-new provider with a ${VAR} key
        custom: { baseURL: "http://localhost:9000/v1", apiKey: "${GT_CUSTOM_KEY}", models: ["x"] },
      },
    }),
  );
  process.env.GIT_THERAPY_CONFIG = path;
  process.env.OPENROUTER_API_KEY = "test-or-key";
  delete process.env.GIT_THERAPY_PROVIDER;
  delete process.env.GT_CUSTOM_KEY; // the custom provider's key is intentionally absent
  // The registry memoizes process-wide; another test file may have built it
  // (e.g. App renders call listProviders). Drop it so it rebuilds with our config.
  resetRegistryForTests();
});

afterAll(() => {
  // Don't leak our test config into other files sharing this process.
  delete process.env.GIT_THERAPY_CONFIG;
  resetRegistryForTests();
});

describe("provider registry (built-ins merged with config)", () => {
  test("explicit order leads, with unlisted providers appended", async () => {
    const { providerOrder } = await import("./ai");
    expect(providerOrder().slice(0, 2)).toEqual(["openrouter", "ollama"]);
    // the custom provider and other built-ins still appear after the explicit order
    expect(providerOrder()).toContain("custom");
    expect(providerOrder()).toContain("gemini");
  });

  test("config extends a built-in's model list", async () => {
    const { listProviders } = await import("./ai");
    const ollama = listProviders().find((p) => p.id === "ollama")!;
    expect(ollama.models).toEqual(["m-one", "m-two"]);
    expect(ollama.hasKey).toBe(true); // ollama is keyless
  });

  test("default selection honors config.default", async () => {
    const { defaultSelection, defaultLanguage } = await import("./ai");
    expect(defaultSelection()).toEqual({ providerId: "openrouter", model: "qwen/qwen3.6-flash" });
    expect(defaultLanguage()).toBe("Czech");
  });

  test("a ${VAR} key shows as missing when the env var is unset", async () => {
    const { listProviders } = await import("./ai");
    const custom = listProviders().find((p) => p.id === "custom")!;
    expect(custom.models).toEqual(["x"]);
    expect(custom.hasKey).toBe(false);
  });

  test("startupSelection applies --provider/--model and validates them", async () => {
    const { startupSelection } = await import("./ai");
    expect(startupSelection({ provider: "ollama", model: "m-two" })).toEqual({
      providerId: "ollama",
      model: "m-two",
    });
    expect(() => startupSelection({ provider: "nope" })).toThrow(/unknown provider/);
    expect(() => startupSelection({ provider: "ollama", model: "ghost" })).toThrow(/no model/);
  });

  test("cycleProvider follows the configured order", async () => {
    const { cycleProvider } = await import("./ai");
    const next = cycleProvider({ providerId: "openrouter", model: "qwen/qwen3.6-flash" });
    expect(next.providerId).toBe("ollama");
    expect(next.model).toBe("m-one"); // lands on the new provider's first model
  });

  test("parseLanguage is case-insensitive and rejects unknowns", async () => {
    const { parseLanguage } = await import("./ai");
    expect(parseLanguage("czech")).toBe("Czech");
    expect(() => parseLanguage("Klingon")).toThrow();
  });
});
