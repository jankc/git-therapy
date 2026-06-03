// Provider boundary — the ONLY file that imports the AI SDK.
//
// Structured output via prompt-for-JSON + JSON.parse + Zod validation (with a
// bounded retry). This is provider-agnostic: it does not rely on native
// `json_schema` support, which Kimi and local Ollama models lack.

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import type { AuthorEvidence } from "./types";
import type { Perspective } from "./perspectives";

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
    baseURL: "https://api.moonshot.ai/v1",
    envKey: "MOONSHOT_API_KEY",
    model: process.env.KIMI_MODEL ?? "kimi-k2.6",
  },
  zai: {
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    envKey: "ZAI_API_KEY",
    model: process.env.ZAI_MODEL ?? "glm-4.7",
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
 * Run one analysis. Returns the schema-validated object (shape depends on the
 * perspective's renderer). Throws on persistent parse/validation failure or abort.
 */
export async function generateAnalysis(
  evidence: AuthorEvidence,
  perspective: Perspective,
  signal?: AbortSignal,
): Promise<unknown> {
  const cfg = activeConfig();
  const provider = createOpenAICompatible({
    name: ACTIVE,
    baseURL: cfg.baseURL,
    apiKey: cfg.envKey ? process.env[cfg.envKey]! : "ollama",
  });
  const model = provider(cfg.model);

  const system =
    perspective.system +
    "\nReturn ONLY the JSON object. No markdown, no code fences, no prose.";

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text } = await generateText({
      model,
      system:
        attempt === 0
          ? system
          : system + "\nYour previous reply was not valid JSON. Output ONLY the JSON object now.",
      prompt: perspective.buildPrompt(evidence),
      abortSignal: signal,
    });
    try {
      return perspective.schema.parse(extractJson(text));
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `analysis did not produce valid output: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}
