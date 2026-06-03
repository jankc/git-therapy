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
};

const ACTIVE = process.env.GIT_THERAPY_PROVIDER ?? "ollama";

function activeConfig(): ProviderConfig {
  const cfg = PROVIDERS[ACTIVE];
  if (!cfg) {
    throw new Error(
      `Unknown GIT_THERAPY_PROVIDER "${ACTIVE}". Valid: ${Object.keys(PROVIDERS).join(", ")}.`,
    );
  }
  return cfg;
}

/** Preflight: throw a clear error if the active provider's key is missing. */
export function assertApiKey(): void {
  const cfg = activeConfig();
  if (cfg.envKey && !process.env[cfg.envKey]) {
    throw new Error(
      `Missing ${cfg.envKey} for provider "${ACTIVE}". ` +
        `Set it, or use GIT_THERAPY_PROVIDER=ollama for a local model.`,
    );
  }
}

export function activeModelLabel(): string {
  const cfg = activeConfig();
  return `${ACTIVE}:${cfg.model}`;
}

/** Construct the OpenAI-compatible AI SDK model for the active provider. */
function buildModel(cfg: ProviderConfig) {
  const openai = createOpenAICompatible({
    name: ACTIVE,
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
  signal?: AbortSignal,
  onProgress?: (approxOutputTokens: number) => void,
): Promise<AnalysisResult> {
  const cfg = activeConfig();
  const model = buildModel(cfg);

  const system =
    perspective.system +
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
