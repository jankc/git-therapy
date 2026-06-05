// User configuration file — the layer that lets a globally-installed
// `git-therapy` binary add providers, models, keys, and a default without
// editing source. Precedence (lowest→highest) is applied in `llm.ts`:
//   built-in defaults  <  this file  <  env vars  <  CLI flags
//
// This module is deliberately AI-agnostic: it only finds, reads, validates and
// (for secrets) env-expands the file. The merge onto the built-in providers
// lives in `llm.ts`, which owns the provider domain.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// One provider entry. Every field is optional so the file can *extend* a
// built-in (e.g. just add a model to ollama's cycle list) as well as define a
// brand-new OpenAI-compatible endpoint (which then needs at least baseURL + models).
const ProviderConfigSchema = z
  .object({
    baseURL: z.string().min(1).optional(),
    // Raw key, or a `${VAR_NAME}` reference resolved from the environment.
    apiKey: z.string().min(1).optional(),
    models: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict();

export const UserConfigSchema = z
  .object({
    // Where the TUI starts. `model` must be one of that provider's models.
    default: z
      .object({ provider: z.string().min(1), model: z.string().min(1).optional() })
      .strict()
      .optional(),
    // Output languages offered in the TUI (cycled with `l`). The first is the
    // default. Omitted → English only.
    languages: z.array(z.string().min(1)).min(1).optional(),
    // Explicit cycle order for the `m` key; unlisted providers are appended.
    order: z.array(z.string().min(1)).optional(),
    providers: z.record(z.string(), ProviderConfigSchema).optional(),
  })
  .strict();

export type UserConfig = z.infer<typeof UserConfigSchema>;
export type UserProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Resolved config file location. `GIT_THERAPY_CONFIG` overrides it outright;
 * otherwise it is `$XDG_CONFIG_HOME/git-therapy/config.json` (XDG default
 * `~/.config`).
 */
export function configPath(): string {
  const override = process.env.GIT_THERAPY_CONFIG?.trim();
  if (override) return override;
  const base = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config");
  return join(base, "git-therapy", "config.json");
}

/** Whether a config file currently exists at the resolved path. */
export function configExists(): boolean {
  return existsSync(configPath());
}

/**
 * Read + validate the config file. Returns an empty config when the file is
 * absent (the common case — the app must still run out of the box). A present
 * but malformed file throws loudly: a broken config should fail startup, not be
 * silently ignored.
 */
export function loadUserConfig(): UserConfig {
  const path = configPath();
  if (!existsSync(path)) return {};

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`cannot read config ${path}: ${msg(err)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`config ${path} is not valid JSON: ${msg(err)}`);
  }

  const result = UserConfigSchema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`config ${path} is invalid: ${detail}`);
  }
  return result.data;
}

// Whole-string `${VAR_NAME}` reference (POSIX shell parameter-expansion form,
// the same notation docker-compose / systemd use). We match the entire value:
// the field is "a key" or "the name of an env var holding the key", not a
// template to interpolate into.
const ENV_REF = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/;

export interface ResolvedSecret {
  /** The concrete secret, or null when an `${VAR}` reference points at an unset var. */
  value: string | null;
  /** What to tell the user to set when `value` is null; null for inline literals. */
  hint: string | null;
}

/**
 * Resolve a config `apiKey` value: a `${VAR}` reference reads `process.env.VAR`
 * (yielding null when unset, so callers can report a precise "set X" message);
 * any other string is a literal key. A value that looks like a reference but is
 * malformed throws, rather than being silently shipped as a literal key.
 */
export function resolveSecret(value: string): ResolvedSecret {
  const match = value.match(ENV_REF);
  if (match) {
    return { value: process.env[match[1]!] ?? null, hint: value };
  }
  if (value.includes("${")) {
    throw new Error(`malformed env reference "${value}" — use the exact form \${VAR_NAME}`);
  }
  return { value, hint: null };
}

// A starter file written by `git-therapy config init`. Plain JSON (no comments)
// so it round-trips through the loader; the README documents the fields.
const STARTER_CONFIG = {
  default: { provider: "ollama" },
  languages: ["English", "Czech"],
  providers: {
    ollama: { models: ["qwen3.5:9b", "qwen3.5:4b"] },
    "my-endpoint": {
      baseURL: "http://localhost:8000/v1",
      apiKey: "${MY_ENDPOINT_KEY}",
      models: ["my-model"],
    },
  },
};

/** Write a starter config to `configPath()` if absent. Returns whether it wrote. */
export function initConfig(): { path: string; created: boolean } {
  const path = configPath();
  if (existsSync(path)) return { path, created: false };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(STARTER_CONFIG, null, 2)}\n`);
  return { path, created: true };
}
