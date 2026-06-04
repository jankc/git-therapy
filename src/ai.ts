// Provider boundary — the ONLY file that imports the AI SDK.
//
// Structured output via prompt-for-JSON + JSON.parse + Zod validation (with a
// bounded retry). This is provider-agnostic: it does not rely on native
// `json_schema` support, which Kimi and local Ollama models lack.

import { appendFileSync } from "node:fs";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import {
  loadUserConfig,
  resolveSecret,
  type UserProviderConfig,
} from "./config";
import type { AuthorEvidence, TokenUsage } from "./types";
import type { Perspective } from "./perspectives";

// Debug flag: when GIT_THERAPY_OUTGOING_LOG is set to a path, dump the exact
// outgoing model payload there (opentui swallows console output, so write to
// disk). Unset = no logging.
const OUTGOING_LOG = process.env.GIT_THERAPY_OUTGOING_LOG ?? null;

export interface AnalysisResult {
  value: unknown;
  usage: TokenUsage;
}

// A provider is one endpoint + credential that can serve several models. The
// model is not baked into the provider id: a selection is a (provider, model)
// pair, cycled in the TUI with 'm' (provider) and 'M' (model).
//
// The set of providers is the BUILT-IN list below merged with the user's
// ~/.config/git-therapy/config.json (see config.ts), so a globally-installed
// binary can add models/providers/keys without editing source.

// How a built-in provider names its key: an env var, or null for keyless ollama.
interface BuiltinProvider {
  baseURL: string;
  envKey: string | null;
  models: string[]; // non-empty; the first is the provider's default model
}

const BUILTIN_PROVIDERS = {
  ollama: {
    baseURL: "http://localhost:11434/v1",
    envKey: null,
    // 9B, strong instruction-following + tool use (reliable schema-valid JSON),
    // 201 languages (so Czech mode works). qwen3.5:4b is the lighter same-family
    // fallback (reachable with M). Override with OLLAMA_MODEL or the config file.
    models: [process.env.OLLAMA_MODEL ?? "qwen3.5:9b", "qwen3.5:4b"],
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    models: [
      process.env.DEEPSEEK_MODEL ?? "deepseek/deepseek-v4-flash",
      process.env.QWEN_MODEL ?? "qwen/qwen3.6-flash",
    ],
  },
  zai: {
    // z.ai GLM via its OpenAI-compatible GLM Coding Plan endpoint (Bearer auth —
    // reuses the same key you use with Claude Code). For a regular pay-as-you-go
    // key use https://api.z.ai/api/paas/v4. Override with ZAI_BASE_URL / ZAI_MODEL.
    baseURL: process.env.ZAI_BASE_URL ?? "https://api.z.ai/api/coding/paas/v4",
    envKey: "Z_AI_API_TOKEN",
    models: [process.env.ZAI_MODEL ?? "glm-5.1"],
  },
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    envKey: "GEMINI_API_KEY",
    models: [process.env.GEMINI_MODEL ?? "gemini-3.5-flash"],
  },
} satisfies Record<string, BuiltinProvider>;

// Default cycle order for the provider selector ('m' key). Starts on ollama:
// local, no key required, so the app works out of the box. Config-only providers
// are appended after these unless config gives an explicit `order`.
const BUILTIN_ORDER = ["ollama", "openrouter", "zai", "gemini"] as const;

// A provider id is just a string now — config can introduce arbitrary ones.
export type ProviderId = string;

/** A concrete choice: which provider, and which of its models. */
export interface ModelSelection {
  providerId: ProviderId;
  model: string;
}

// A fully resolved provider: keys are looked up once (env never changes mid-run).
interface ProviderConfig {
  baseURL: string;
  /** The concrete key, or null when keyless OR required-but-missing (see requiresKey). */
  apiKey: string | null;
  requiresKey: boolean;
  /** What to set when a required key is missing (env var name or `${VAR}`); null if inline/keyless. */
  keyHint: string | null;
  models: string[];
}

// Output language for the analysis ('l' key). The model writes all human-readable
// text in this language; the JSON keys stay English so schema validation holds.
export const LANGUAGES = ["English", "Czech"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Resolve a free-text language name (case-insensitive) to a known Language. */
export function parseLanguage(input: string): Language {
  const match = LANGUAGES.find((l) => l.toLowerCase() === input.trim().toLowerCase());
  if (!match) throw new Error(`unknown language "${input}" — choose: ${LANGUAGES.join(", ")}`);
  return match;
}

function languageInstruction(language: Language): string {
  return (
    `\nWrite every human-readable text value (metric names, evidence strings, notes, ` +
    `section headings and bodies) in ${language}. ` +
    `Do NOT translate the JSON keys themselves — keep them exactly as specified.`
  );
}

export interface ProviderInfo {
  id: ProviderId;
  models: string[];
  /** true when no key is required (ollama) or the required key is present. */
  hasKey: boolean;
  /** whether this provider needs a key at all (false for keyless ollama). */
  requiresKey: boolean;
  /** where the key comes from: an env var name / `${VAR}`, or null if inline/keyless. */
  keyHint: string | null;
}

// --- Registry: built-in providers merged with the user config, built once. ---

interface Registry {
  providers: Map<ProviderId, ProviderConfig>;
  order: ProviderId[];
  defaultProvider: ProviderId;
  defaultModel: string | null;
  defaultLanguage: Language;
}

function resolveBuiltin(b: BuiltinProvider): ProviderConfig {
  if (!b.envKey) {
    return { baseURL: b.baseURL, apiKey: null, requiresKey: false, keyHint: null, models: b.models };
  }
  return {
    baseURL: b.baseURL,
    apiKey: process.env[b.envKey] || null,
    requiresKey: true,
    keyHint: b.envKey,
    models: b.models,
  };
}

// Merge one user provider entry onto its built-in base (or null for a new one).
// Fields present in the file override the base; a brand-new provider must supply
// at least baseURL + models.
function applyUserProvider(base: ProviderConfig | null, u: UserProviderConfig): ProviderConfig {
  const baseURL = u.baseURL ?? base?.baseURL;
  if (!baseURL) throw new Error("missing baseURL");
  const models = u.models ?? base?.models;
  if (!models || models.length === 0) throw new Error("missing models");

  let key = {
    apiKey: base?.apiKey ?? null,
    requiresKey: base?.requiresKey ?? false,
    keyHint: base?.keyHint ?? null,
  };
  if (u.apiKey !== undefined) {
    const s = resolveSecret(u.apiKey);
    // env outranks config: preserve the already-resolved env key and its hint when present
    key = {
      apiKey: base?.apiKey ?? s.value,
      requiresKey: true,
      keyHint: base?.apiKey != null ? (base?.keyHint ?? null) : s.hint,
    };
  }
  return { baseURL, models, ...key };
}

function buildRegistry(): Registry {
  const user = loadUserConfig();

  const providers = new Map<ProviderId, ProviderConfig>();
  for (const id of BUILTIN_ORDER) providers.set(id, resolveBuiltin(BUILTIN_PROVIDERS[id]));

  const userIds = user.providers ? Object.keys(user.providers) : [];
  for (const id of userIds) {
    try {
      providers.set(id, applyUserProvider(providers.get(id) ?? null, user.providers![id]!));
    } catch (err) {
      throw new Error(`config: provider "${id}": ${err instanceof Error ? err.message : err}`);
    }
  }

  let order: ProviderId[];
  if (user.order) {
    for (const id of user.order) {
      if (!providers.has(id)) throw new Error(`config: order lists unknown provider "${id}"`);
    }
    const rest = [...providers.keys()].filter((id) => !user.order!.includes(id));
    order = [...user.order, ...rest];
  } else {
    const extras = userIds.filter((id) => !(BUILTIN_ORDER as readonly string[]).includes(id));
    order = [...BUILTIN_ORDER, ...extras];
  }

  // default provider/model: config.default, then GIT_THERAPY_PROVIDER (env wins),
  // else the first in cycle order.
  let defaultProvider = order[0]!;
  let defaultModel: string | null = null;
  if (user.default) {
    if (!providers.has(user.default.provider)) {
      throw new Error(`config: default.provider "${user.default.provider}" is not a known provider`);
    }
    defaultProvider = user.default.provider;
    defaultModel = user.default.model ?? null;
  }
  const envProvider = process.env.GIT_THERAPY_PROVIDER?.trim();
  if (envProvider && providers.has(envProvider)) {
    defaultProvider = envProvider;
    defaultModel = null; // fall back to that provider's first model
  }
  if (defaultModel && !providers.get(defaultProvider)!.models.includes(defaultModel)) {
    throw new Error(
      `config: default.model "${defaultModel}" is not one of provider "${defaultProvider}"'s models`,
    );
  }

  const defaultLanguage = user.language ? parseLanguage(user.language) : "English";
  return { providers, order, defaultProvider, defaultModel, defaultLanguage };
}

// Built lazily and memoized: a CLI subcommand like `--help` must not pay for (or
// fail on) config loading, and env is stable for the process lifetime.
let _registry: Registry | null = null;
function registry(): Registry {
  return (_registry ??= buildRegistry());
}

/** Test-only: drop the memoized registry so the next access re-reads config. */
export function resetRegistryForTests(): void {
  _registry = null;
}

function configFor(id: ProviderId): ProviderConfig {
  const cfg = registry().providers.get(id);
  if (!cfg) throw new Error(`Unknown provider "${id}".`);
  return cfg;
}

function keyPresent(cfg: ProviderConfig): boolean {
  return !cfg.requiresKey || cfg.apiKey !== null;
}

/** The provider cycle order (built-ins plus any config providers). */
export function providerOrder(): ProviderId[] {
  return registry().order;
}

/** All selectable providers with their models and key availability (for the UI). */
export function listProviders(): ProviderInfo[] {
  return providerOrder().map((id) => {
    const cfg = configFor(id);
    return {
      id,
      models: cfg.models,
      hasKey: keyPresent(cfg),
      requiresKey: cfg.requiresKey,
      keyHint: cfg.keyHint,
    };
  });
}

/** Switch to a provider, landing on its first (default) model. */
export function selectProvider(id: ProviderId): ModelSelection {
  return { providerId: id, model: configFor(id).models[0]! };
}

/**
 * The (provider, model) to start on, honoring config.default and
 * GIT_THERAPY_PROVIDER (resolved in the registry). The model defaults to that
 * provider's first unless config.default pins one.
 */
export function defaultSelection(): ModelSelection {
  const { defaultProvider, defaultModel } = registry();
  return { providerId: defaultProvider, model: defaultModel ?? configFor(defaultProvider).models[0]! };
}

/** The language to start in (config.language, else English). */
export function defaultLanguage(): Language {
  return registry().defaultLanguage;
}

/**
 * Resolve an explicit `--provider` / `--model` CLI override onto the default
 * selection. Throws with a helpful list when either names something unknown.
 */
export function startupSelection(opts: { provider?: string; model?: string }): ModelSelection {
  let sel = defaultSelection();
  if (opts.provider) {
    if (!registry().providers.has(opts.provider)) {
      throw new Error(`unknown provider "${opts.provider}" — known: ${providerOrder().join(", ")}`);
    }
    sel = selectProvider(opts.provider);
  }
  if (opts.model) {
    const models = configFor(sel.providerId).models;
    if (!models.includes(opts.model)) {
      throw new Error(
        `provider "${sel.providerId}" has no model "${opts.model}" — known: ${models.join(", ")} (add it in your config)`,
      );
    }
    sel = { ...sel, model: opts.model };
  }
  return sel;
}

/** Next provider in cycle order (wraps), landing on its default model. */
export function cycleProvider(current: ModelSelection): ModelSelection {
  const order = providerOrder();
  const i = order.indexOf(current.providerId);
  return selectProvider(order[(i + 1) % order.length]!);
}

/** Next model within the current provider (wraps); provider unchanged. */
export function cycleModel(current: ModelSelection): ModelSelection {
  const models = configFor(current.providerId).models;
  const i = models.indexOf(current.model);
  return { ...current, model: models[(i + 1) % models.length]! };
}

export function modelLabel(selection: ModelSelection): string {
  return `${selection.providerId} · ${selection.model}`;
}

/** Construct the OpenAI-compatible AI SDK model for the given selection. */
function buildModel(selection: ModelSelection, cfg: ProviderConfig) {
  const openai = createOpenAICompatible({
    name: selection.providerId,
    baseURL: cfg.baseURL,
    // A keyless endpoint still wants *some* bearer; send a harmless placeholder.
    apiKey: cfg.apiKey ?? "no-key",
    includeUsage: true, // request token usage in streaming responses
  });
  return openai(selection.model);
}

/** Rough token estimate when a provider omits usage from the stream (~4 chars/token). */
function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

/** Extract the most useful message from an AI SDK / API error (incl. retry wrappers). */
function describeError(err: unknown): string {
  const e = err as {
    statusCode?: number;
    message?: string;
    lastError?: unknown;
    errors?: unknown[];
  };
  const inner = (e?.lastError ?? e?.errors?.[e.errors.length - 1]) as
    | { statusCode?: number; message?: string }
    | undefined;
  const status = e?.statusCode ?? inner?.statusCode;
  const message = e?.message ?? inner?.message ?? String(err);
  return status ? `${status}: ${message}` : message;
}

/** Pull a JSON object out of model text, tolerating fences / stray prose. */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Strip a leading ```json fence or grab the first {...} block.
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        /* fall through */
      }
    }
    const brace = trimmed.match(/\{[\s\S]*\}/);
    if (brace) return JSON.parse(brace[0]);
    throw new Error("model did not return a JSON object");
  }
}

/**
 * Run one analysis. Streams the response so callers can show live progress via
 * `onProgress` (approximate output-token count). Returns the schema-validated
 * object plus exact token usage summed across any retries. Throws on persistent
 * parse/validation failure or abort.
 */
export async function generateAnalysis(
  evidence: AuthorEvidence,
  perspective: Perspective,
  selection: ModelSelection,
  language: Language,
  signal?: AbortSignal,
  onProgress?: (approxOutputTokens: number) => void,
): Promise<AnalysisResult> {
  const cfg = configFor(selection.providerId);
  if (cfg.requiresKey && cfg.apiKey === null) {
    const what = cfg.keyHint ? `set ${cfg.keyHint}` : "configure a key";
    throw new Error(
      `missing key for "${selection.providerId}" — ${what}, or press 'm' for a local model (ollama)`,
    );
  }
  const model = buildModel(selection, cfg);

  // Qwen3-family models reason by default; for strict JSON-only output that
  // preamble just wastes tokens and risks polluting the parse. `/no_think` is
  // Qwen's soft switch to turn it off — scoped to qwen3* so it never confuses a
  // model that doesn't understand the directive.
  const noThink = /qwen3/i.test(selection.model) ? " /no_think" : "";
  const system =
    perspective.system +
    languageInstruction(language) +
    "\nReturn ONLY the JSON object. No markdown, no code fences, no prose." +
    noThink;

  const prompt = perspective.buildPrompt(evidence);
  let lastErr: unknown;
  const usage: TokenUsage = { input: 0, output: 0, total: 0 };

  for (let attempt = 0; attempt < 2; attempt++) {
    const attemptSystem =
      attempt === 0
        ? system
        : system +
          "\nYour previous reply was not valid JSON. Output ONLY the JSON object now.";
    // streamText routes API/network errors to onError and ends the text stream
    // empty (surfacing only a useless "No output generated" later). Capture the
    // real error here so it can be reported instead.
    let streamError: unknown;
    // Dump the exact outgoing payload when the debug flag is set. Tail it with
    // `tail -f <path>`.
    if (OUTGOING_LOG) {
      appendFileSync(
        OUTGOING_LOG,
        `\n=== → model (${selection.providerId}/${selection.model}, lens=${perspective.id}, attempt ${attempt + 1}) ===\n` +
          `--- system ---\n${attemptSystem}\n` +
          `--- prompt ---\n${prompt}\n=== end ===\n`,
      );
    }
    const result = streamText({
      model,
      system: attemptSystem,
      prompt,
      abortSignal: signal,
      onError: ({ error }) => {
        streamError = error;
      },
    });

    let text = "";
    for await (const delta of result.textStream) {
      text += delta;
      onProgress?.(estimateTokens(text.length)); // live estimate
    }

    // An API/network failure (e.g. 429 insufficient balance) is not a parse
    // problem — surface it immediately rather than retrying.
    if (streamError) throw new Error(describeError(streamError));

    // Exact usage resolves once the stream finishes; fall back to a char-based
    // estimate when the provider omits usage (e.g. some local Ollama builds).
    const u = await result.usage;
    const inTok = u.inputTokens ?? 0;
    const outTok = u.outputTokens ?? 0;
    if (inTok === 0 && outTok === 0) {
      usage.input += estimateTokens(attemptSystem.length + prompt.length);
      usage.output += estimateTokens(text.length);
    } else {
      usage.input += inTok;
      usage.output += outTok;
    }
    usage.total = usage.input + usage.output;

    try {
      const value = perspective.schema.parse(extractJson(text));
      return { value, usage };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `analysis did not produce valid output: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}
