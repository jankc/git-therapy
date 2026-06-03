// Provider boundary — the ONLY file that imports the AI SDK.
//
// Structured output via prompt-for-JSON + JSON.parse + Zod validation (with a
// bounded retry). This is provider-agnostic: it does not rely on native
// `json_schema` support, which Kimi and local Ollama models lack.

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import type { AuthorEvidence, TokenUsage } from "./types";
import type { Perspective } from "./perspectives";

export interface AnalysisResult {
  value: unknown;
  usage: TokenUsage;
}

interface ProviderConfig {
  baseURL: string;
  envKey: string | null; // null = no key needed (ollama)
  model: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  ollama: {
    baseURL: "http://localhost:11434/v1",
    envKey: null,
    model: process.env.OLLAMA_MODEL ?? "qwen3.6:27b-mlx",
  },
  kimi: {
    // baseURL: "https://api.moonshot.ai/v1",
    baseURL: "https://api.kimi.com/coding/v1",
    envKey: "KIMI_API_KEY",
    model: process.env.KIMI_MODEL ?? "kimi-k2.6",
  },
  zai: {
    // z.ai GLM via its OpenAI-compatible GLM Coding Plan endpoint (Bearer auth —
    // reuses the same key you use with Claude Code). For a regular pay-as-you-go
    // key use https://api.z.ai/api/paas/v4. Override with ZAI_BASE_URL / ZAI_MODEL.
    baseURL: process.env.ZAI_BASE_URL ?? "https://api.z.ai/api/coding/paas/v4",
    envKey: "Z_AI_API_TOKEN",
    model: process.env.ZAI_MODEL ?? "glm-5.1",
  },
  deepseek: {
    baseURL: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek/deepseek-chat-v3-0324",
  },
  qwen: {
    baseURL: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    model: process.env.QWEN_MODEL ?? "qwen/qwen3-235b-a22b",
  },
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    envKey: "GEMINI_API_KEY",
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  },
};

// Cycle order for the in-app model selector ('m' key). The provider is no longer
// frozen at startup — it is chosen at runtime and threaded into generateAnalysis.
export const PROVIDER_ORDER = [
  "ollama",
  "kimi",
  "zai",
  "deepseek",
  "qwen",
  "gemini",
] as const;
export type ProviderId = (typeof PROVIDER_ORDER)[number];

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
  model: string;
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

/** All selectable providers with their model and key availability (for the UI). */
export function listProviders(): ProviderInfo[] {
  return PROVIDER_ORDER.map((id) => {
    const cfg = configFor(id);
    return { id, model: cfg.model, hasKey: keyPresent(cfg) };
  });
}

/** The provider to start on: GIT_THERAPY_PROVIDER if valid, else ollama. */
export function defaultProviderId(): ProviderId {
  const env = process.env.GIT_THERAPY_PROVIDER;
  return env && (PROVIDER_ORDER as readonly string[]).includes(env)
    ? (env as ProviderId)
    : "ollama";
}

export function modelLabel(id: ProviderId): string {
  return `${id} · ${configFor(id).model}`;
}

/** Construct the OpenAI-compatible AI SDK model for the given provider. */
function buildModel(id: ProviderId, cfg: ProviderConfig) {
  const openai = createOpenAICompatible({
    name: id,
    baseURL: cfg.baseURL,
    apiKey: cfg.envKey ? process.env[cfg.envKey]! : "ollama",
    includeUsage: true, // request token usage in streaming responses
  });
  return openai(cfg.model);
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
  providerId: ProviderId,
  language: Language,
  signal?: AbortSignal,
  onProgress?: (approxOutputTokens: number) => void,
): Promise<AnalysisResult> {
  const cfg = configFor(providerId);
  if (cfg.envKey && !process.env[cfg.envKey]) {
    throw new Error(
      `missing ${cfg.envKey} for "${providerId}" — set it, or press 'm' for a local model (ollama)`,
    );
  }
  const model = buildModel(providerId, cfg);

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
