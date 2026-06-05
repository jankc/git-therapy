// Provider boundary — the ONLY file that imports the AI SDK.
//
// Provider-agnostic Markdown output. Text is exposed while it streams, so this
// boundary does not depend on native structured-output support.

import { appendFileSync } from "node:fs";
import {
  createOpenAICompatible,
  type MetadataExtractor,
} from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import {
  loadUserConfig,
  resolveSecret,
  type UserProviderConfig,
} from "./config";
import type {
  AnalysisActivity,
  AnalysisActivityStatus,
  AnalysisProgress,
  AuthorEvidence,
  TokenUsage,
} from "../types";
import type { Perspective } from "./perspectives";

// Debug flag: when GIT_THERAPY_OUTGOING_LOG is set to a path, dump the exact
// outgoing model payload there (opentui swallows console output, so write to
// disk). Unset = no logging.
const OUTGOING_LOG = process.env.GIT_THERAPY_OUTGOING_LOG ?? null;

export interface AnalysisResult {
  markdown: string;
  usage: TokenUsage;
  costUsd?: number;
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
    // 9B, strong instruction-following + tool use,
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

// Output language for the analysis ('l' key). The model writes the full Markdown
// report in this language while preserving the requested structure.
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
    `\nWrite the entire report in ${language}, including headings and notes. ` +
    `Preserve the requested Markdown structure and each metric's semantic value type. ` +
    `Translate headings, qualitative labels, and written unit names naturally, while keeping percentages as percentages ` +
    `and ratios as ratios.`
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

function extractOpenRouterCost(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const usage = (value as { usage?: unknown }).usage;
  if (typeof usage !== "object" || usage === null) return undefined;
  const cost = (usage as { cost?: unknown }).cost;
  return typeof cost === "number" && Number.isFinite(cost) && cost >= 0
    ? cost
    : undefined;
}

/** Preserve OpenRouter's non-standard `usage.cost` field through the AI SDK. */
export function createOpenRouterCostMetadataExtractor(): MetadataExtractor {
  return {
    async extractMetadata({ parsedBody }) {
      const costUsd = extractOpenRouterCost(parsedBody);
      return costUsd === undefined ? undefined : { openrouter: { costUsd } };
    },
    createStreamExtractor() {
      let costUsd: number | undefined;
      return {
        processChunk(parsedChunk) {
          costUsd = extractOpenRouterCost(parsedChunk) ?? costUsd;
        },
        buildMetadata() {
          return costUsd === undefined ? undefined : { openrouter: { costUsd } };
        },
      };
    },
  };
}

const MAX_ACTIVITY_EVENTS = 24;

export function upsertAnalysisActivity(
  activities: AnalysisActivity[],
  next: AnalysisActivity,
  limit: number = MAX_ACTIVITY_EVENTS,
): AnalysisActivity[] {
  const existing = activities.findIndex((activity) => activity.id === next.id);
  const updated =
    existing === -1
      ? [...activities, next]
      : activities.map((activity, index) => (index === existing ? next : activity));
  return updated.slice(-limit);
}

/**
 * Owns the activity list for one generation attempt: the stable per-attempt ids,
 * lookups, and upserts that preserve a step's original `startedAt`. Replaces the
 * hand-built `generation-N-…` id strings and repeated `find(byId)` in the stream.
 */
interface ActivityTracker {
  ids: { waiting: string; reasoning: string; stream: string; finalize: string };
  get(id: string): AnalysisActivity | undefined;
  set(
    id: string,
    label: string,
    status: AnalysisActivityStatus,
    startedAt: number,
    detail?: string,
    endedAt?: number,
  ): void;
  snapshot(): AnalysisActivity[];
}

function createActivityTracker(generationAttempt: number): ActivityTracker {
  let activities: AnalysisActivity[] = [];
  return {
    ids: {
      waiting: `generation-${generationAttempt}-waiting`,
      reasoning: `generation-${generationAttempt}-reasoning`,
      stream: `generation-${generationAttempt}-stream`,
      finalize: `generation-${generationAttempt}-finalize`,
    },
    get: (id) => activities.find((activity) => activity.id === id),
    set: (id, label, status, startedAt, detail, endedAt) => {
      const existing = activities.find((activity) => activity.id === id);
      activities = upsertAnalysisActivity(activities, {
        id,
        label,
        status,
        startedAt: existing?.startedAt ?? startedAt,
        endedAt,
        detail,
      });
    },
    snapshot: () => [...activities],
  };
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
export interface HttpAttemptEvent {
  id: string;
  status: AnalysisActivityStatus;
  startedAt: number;
  endedAt?: number;
  detail: string;
}

export function createInstrumentedFetch(
  baseFetch: typeof fetch,
  getGenerationAttempt: () => number,
  onHttpAttempt?: (event: HttpAttemptEvent) => void,
): typeof fetch {
  let httpAttempt = 0;
  const instrumentedFetch = async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> => {
    const attempt = ++httpAttempt;
    const generationAttempt = getGenerationAttempt();
    const id = `generation-${generationAttempt}-http-${attempt}`;
    const startedAt = Date.now();
    onHttpAttempt?.({
      id,
      status: "active",
      startedAt,
      detail: `generation ${generationAttempt}, transport attempt ${attempt}`,
    });
    try {
      const response = await baseFetch(input, init);
      const endedAt = Date.now();
      onHttpAttempt?.({
        id,
        status: response.ok ? "done" : "error",
        startedAt,
        endedAt,
        detail: `HTTP ${response.status} in ${formatDuration(endedAt - startedAt)}`,
      });
      return response;
    } catch (error) {
      const endedAt = Date.now();
      onHttpAttempt?.({
        id,
        status: "error",
        startedAt,
        endedAt,
        detail: `${describeError(error)} after ${formatDuration(endedAt - startedAt)}`,
      });
      throw error;
    }
  };
  instrumentedFetch.preconnect = baseFetch.preconnect;
  return instrumentedFetch;
}

function buildModel(
  selection: ModelSelection,
  cfg: ProviderConfig,
  getGenerationAttempt: () => number,
  onHttpAttempt?: (event: HttpAttemptEvent) => void,
) {
  const openai = createOpenAICompatible({
    name: selection.providerId,
    baseURL: cfg.baseURL,
    // A keyless endpoint still wants *some* bearer; send a harmless placeholder.
    apiKey: cfg.apiKey ?? "no-key",
    includeUsage: true, // request token usage in streaming responses
    metadataExtractor:
      selection.providerId === "openrouter"
        ? createOpenRouterCostMetadataExtractor()
        : undefined,
    fetch: createInstrumentedFetch(
      globalThis.fetch,
      getGenerationAttempt,
      onHttpAttempt,
    ),
  });
  return openai(selection.model);
}

/** Rough token estimate when a provider omits usage from the stream (~4 chars/token). */
function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

function shortError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.length > 100 ? `${message.slice(0, 97)}...` : message;
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

/**
 * Run one analysis. Streams the response so callers can show live progress via
 * `onProgress`. Returns the final Markdown plus exact token usage and reported
 * provider cost. Throws on provider failure or abort.
 */
export async function generateAnalysis(
  evidence: AuthorEvidence,
  perspective: Perspective,
  selection: ModelSelection,
  language: Language,
  signal?: AbortSignal,
  onProgress?: (progress: AnalysisProgress) => void,
): Promise<AnalysisResult> {
  const cfg = configFor(selection.providerId);
  if (cfg.requiresKey && cfg.apiKey === null) {
    const what = cfg.keyHint ? `set ${cfg.keyHint}` : "configure a key";
    throw new Error(
      `missing key for "${selection.providerId}" — ${what}, or press 'm' for a local model (ollama)`,
    );
  }
  const generationAttempt = 1;
  const tracker = createActivityTracker(generationAttempt);
  let markdown = "";
  let textChars = 0;
  let reasoningChars = 0;
  let lastProgressFlush = 0;

  const publishProgress = (force: boolean = true) => {
    const now = performance.now();
    if (!force && now - lastProgressFlush < 100) return;
    lastProgressFlush = now;
    onProgress?.({
      approxOutputTokens: estimateTokens(textChars),
      approxReasoningTokens: estimateTokens(reasoningChars),
      activities: tracker.snapshot(),
      markdown,
    });
  };

  const setActivity = (
    id: string,
    label: string,
    status: AnalysisActivityStatus,
    startedAt: number,
    detail?: string,
    endedAt?: number,
    force: boolean = true,
  ) => {
    tracker.set(id, label, status, startedAt, detail, endedAt);
    publishProgress(force);
  };

  // Flip the "waiting" step to done the first time the model emits anything.
  const markFirstEvent = (attemptStartedAt: number, now: number, detail: string) => {
    const waiting = tracker.get(tracker.ids.waiting);
    if (!waiting || waiting.status === "active") {
      setActivity(tracker.ids.waiting, "First model event", "done", attemptStartedAt, detail, now, false);
    }
  };

  const model = buildModel(
    selection,
    cfg,
    () => generationAttempt,
    (event) => {
      setActivity(
        event.id,
        "Provider request",
        event.status,
        event.startedAt,
        event.detail,
        event.endedAt,
      );
    },
  );

  // Qwen3-family models reason by default. `/no_think` keeps the visible report
  // responsive and is scoped to qwen3* so it never confuses other models.
  const noThink = /qwen3/i.test(selection.model) ? " /no_think" : "";
  const system =
    perspective.system +
    languageInstruction(language) +
    "\nReturn ONLY the Markdown report. Do not wrap it in a code fence." +
    noThink;

  const prompt = perspective.buildPrompt(evidence);
  const preparedAt = Date.now();
  setActivity(
    "evidence",
    "Evidence prepared",
    "done",
    preparedAt,
    `${evidence.blamedLines.length} lines · ${evidence.blamedCommits.length} blamed commits · ${evidence.authorBaseline.totalFileCommits} baseline commits`,
    preparedAt,
  );
  setActivity(
    "prompt",
    "Prompt assembled",
    "done",
    preparedAt,
    `${prompt.length.toLocaleString()} chars · ~${estimateTokens(prompt.length).toLocaleString()} tok`,
    preparedAt,
  );
  const usage: TokenUsage = { input: 0, output: 0, total: 0 };
  const attemptStartedAt = Date.now();
  let streamError: unknown;
  if (OUTGOING_LOG) {
    appendFileSync(
      OUTGOING_LOG,
      `\n=== → model (${selection.providerId}/${selection.model}, lens=${perspective.id}) ===\n` +
        `--- system ---\n${system}\n` +
        `--- prompt ---\n${prompt}\n=== end ===\n`,
    );
  }
  const result = streamText({
    model,
    system,
    prompt,
    abortSignal: signal,
    onChunk: ({ chunk }) => {
      const now = Date.now();
      if (chunk.type === "reasoning-delta") {
        reasoningChars += chunk.text.length;
        markFirstEvent(attemptStartedAt, now, `reasoning began after ${formatDuration(now - attemptStartedAt)}`);
        setActivity(
          tracker.ids.reasoning,
          "Model reasoning",
          "active",
          now,
          `~${estimateTokens(reasoningChars).toLocaleString()} tok`,
          undefined,
          false,
        );
      } else if (chunk.type === "text-delta") {
        markdown += chunk.text;
        textChars = markdown.length;
        markFirstEvent(attemptStartedAt, now, `answer began after ${formatDuration(now - attemptStartedAt)}`);
        const reasoning = tracker.get(tracker.ids.reasoning);
        if (reasoning?.status === "active") {
          setActivity(
            reasoning.id,
            reasoning.label,
            "done",
            reasoning.startedAt,
            reasoning.detail,
            now,
            false,
          );
        }
        const stream = tracker.get(tracker.ids.stream);
        const streamStartedAt = stream?.startedAt ?? now;
        const elapsedSeconds = Math.max(0.001, (now - streamStartedAt) / 1000);
        setActivity(
          tracker.ids.stream,
          "Answer streaming",
          "active",
          streamStartedAt,
          `~${estimateTokens(textChars).toLocaleString()} tok · ${(estimateTokens(textChars) / elapsedSeconds).toFixed(1)} tok/s`,
          undefined,
          false,
        );
      }
    },
    onError: ({ error }) => {
      streamError = error;
    },
  });
  setActivity(
    tracker.ids.waiting,
    "First model event",
    "active",
    attemptStartedAt,
    "waiting for provider/model",
  );

  let finalText = "";
  for await (const delta of result.textStream) {
    finalText += delta;
  }
  markdown = finalText || markdown;
  textChars = markdown.length;
  publishProgress();

  const streamEndedAt = Date.now();
  const waiting = tracker.get(tracker.ids.waiting);
  if (waiting?.status === "active") {
    setActivity(
      waiting.id,
      waiting.label,
      streamError ? "error" : "done",
      waiting.startedAt,
      streamError ? shortError(streamError) : "stream ended without reasoning or answer text",
      streamEndedAt,
    );
  }
  for (const id of [tracker.ids.reasoning, tracker.ids.stream]) {
    const activity = tracker.get(id);
    if (activity?.status === "active") {
      setActivity(
        id,
        activity.label,
        "done",
        activity.startedAt,
        activity.detail,
        streamEndedAt,
      );
    }
  }

  if (streamError) throw new Error(describeError(streamError));

  const finalizingStartedAt = Date.now();
  setActivity(
    tracker.ids.finalize,
    "Usage and cost",
    "active",
    finalizingStartedAt,
    "waiting for final usage metadata",
  );
  const u = await result.usage;
  const inTok = u.inputTokens ?? 0;
  const outTok = u.outputTokens ?? 0;
  if (inTok === 0 && outTok === 0) {
    usage.input = estimateTokens(system.length + prompt.length);
    usage.output = estimateTokens(markdown.length);
  } else {
    usage.input = inTok;
    usage.output = outTok;
  }
  usage.total = usage.input + usage.output;
  const providerMetadata = await result.providerMetadata;
  const reportedCost = providerMetadata?.openrouter?.costUsd;
  const costUsd = typeof reportedCost === "number" ? reportedCost : undefined;
  const finalizingEndedAt = Date.now();
  setActivity(
    tracker.ids.finalize,
    "Usage and cost",
    "done",
    finalizingStartedAt,
    `${usage.total.toLocaleString()} tok${costUsd === undefined ? "" : ` · $${costUsd.toFixed(6)}`}`,
    finalizingEndedAt,
  );

  return { markdown, usage, costUsd };
}
