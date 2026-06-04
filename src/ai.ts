// Provider boundary — the ONLY file that imports the AI SDK.
//
// Structured output via prompt-for-JSON + JSON.parse + Zod validation (with a
// bounded retry). This is provider-agnostic: it does not rely on native
// `json_schema` support, which Kimi and local Ollama models lack.

import { appendFileSync } from "node:fs";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
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
// model is no longer baked into the provider id: a selection is a (provider,
// model) pair, cycled in the TUI with 'm' (provider) and 'M' (model).
interface ProviderConfig {
  baseURL: string;
  envKey: string | null; // null = no key needed (ollama)
  models: string[]; // non-empty; the first is the provider's default model
}

const PROVIDERS = {
  ollama: {
    baseURL: "http://localhost:11434/v1",
    envKey: null,
    models: [process.env.OLLAMA_MODEL ?? "qwen3.6:27b-mlx", "gemma4:26b-mlx"],
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
} satisfies Record<string, ProviderConfig>;

// Cycle order for the provider selector ('m' key). Starts on ollama: local, no
// key required, so the app works out of the box and a missing cloud key never
// blocks startup. The selection is chosen at runtime and threaded into generateAnalysis.
export const PROVIDER_ORDER = ["ollama", "openrouter", "zai", "gemini"] as const;
export type ProviderId = (typeof PROVIDER_ORDER)[number];

/** A concrete choice: which provider, and which of its models. */
export interface ModelSelection {
  providerId: ProviderId;
  model: string;
}

// Output language for the analysis ('l' key). The model writes all human-readable
// text in this language; the JSON keys stay English so schema validation holds.
export const LANGUAGES = ["English", "Czech"] as const;
export type Language = (typeof LANGUAGES)[number];

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
}

function configFor(id: ProviderId): ProviderConfig {
  const cfg = PROVIDERS[id];
  if (!cfg) throw new Error(`Unknown provider "${id}".`);
  return cfg;
}

function keyPresent(cfg: ProviderConfig): boolean {
  return !cfg.envKey || !!process.env[cfg.envKey];
}

/** All selectable providers with their models and key availability (for the UI). */
export function listProviders(): ProviderInfo[] {
  return PROVIDER_ORDER.map((id) => {
    const cfg = configFor(id);
    return { id, models: cfg.models, hasKey: keyPresent(cfg) };
  });
}

/** Switch to a provider, landing on its first (default) model. */
export function selectProvider(id: ProviderId): ModelSelection {
  return { providerId: id, model: configFor(id).models[0]! };
}

/**
 * The (provider, model) to start on: GIT_THERAPY_PROVIDER if it names a known
 * provider, else the first in PROVIDER_ORDER (ollama — local, no key needed).
 * The model defaults to that provider's first; override per provider with the
 * *_MODEL env vars.
 */
export function defaultSelection(): ModelSelection {
  const env = process.env.GIT_THERAPY_PROVIDER;
  const id =
    env && (PROVIDER_ORDER as readonly string[]).includes(env)
      ? (env as ProviderId)
      : PROVIDER_ORDER[0];
  return selectProvider(id);
}

/** Next provider in cycle order (wraps), landing on its default model. */
export function cycleProvider(current: ModelSelection): ModelSelection {
  const i = PROVIDER_ORDER.indexOf(current.providerId);
  return selectProvider(PROVIDER_ORDER[(i + 1) % PROVIDER_ORDER.length]!);
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
    apiKey: cfg.envKey ? process.env[cfg.envKey]! : "ollama",
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
  if (cfg.envKey && !process.env[cfg.envKey]) {
    throw new Error(
      `missing ${cfg.envKey} for "${selection.providerId}" — set it, or press 'm' for a local model (ollama)`,
    );
  }
  const model = buildModel(selection, cfg);

  const system =
    perspective.system +
    languageInstruction(language) +
    "\nReturn ONLY the JSON object. No markdown, no code fences, no prose.";

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
