// Manual analysis hook: idle -> loading -> done/error.
// Nothing runs until the user starts a run: the App passes an AnalysisRequest
// snapshot whose `id` bumps on each start. The hook keys off that `id`, so
// merely changing the selection (author/lens/model/language) never triggers a run
// — only an explicit start does. A per-run AbortController + `cancelled` flag keep
// it safe under React StrictMode double-invoke and rapid restarts.

import { useEffect, useState } from "react";
import { generateAnalysis, type Language, type ModelSelection } from "./ai";
import type { Perspective } from "./perspectives";
import type {
  AnalysisProgress,
  AnalysisState,
  AuthorEvidence,
} from "./types";

export interface AnalysisRequest {
  /** Bumped on every start so re-running the same config still fires. */
  id: number;
  evidence: AuthorEvidence;
  perspective: Perspective;
  selection: ModelSelection;
  language: Language;
}

export function useAnalysis(request: AnalysisRequest | null): AnalysisState {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const runId = request?.id ?? null;

  useEffect(() => {
    if (!request) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    // Absolute start time so the spinner's elapsed clock survives remounts (e.g.
    // navigating away from the running lens and back) instead of restarting at 0.
    const startedAt = Date.now();
    let progress: AnalysisProgress = {
      approxOutputTokens: 0,
      approxReasoningTokens: 0,
      activities: [],
      markdown: "",
    };
    setState({ status: "loading", requestId: request.id, startedAt, progress });

    const onProgress = (next: AnalysisProgress) => {
      if (cancelled) return;
      progress = next;
      setState({ status: "loading", requestId: request.id, startedAt, progress });
    };

    generateAnalysis(
      request.evidence,
      request.perspective,
      request.selection,
      request.language,
      controller.signal,
      onProgress,
    )
      .then(({ markdown, usage, costUsd }) => {
        if (!cancelled) {
          const finishedAt = Date.now();
          setState({
            status: "done",
            requestId: request.id,
            markdown,
            usage,
            costUsd,
            progress,
            generatedAt: finishedAt,
            elapsedMs: finishedAt - startedAt,
          });
        }
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        const failedAt = Date.now();
        setState({
          status: "error",
          requestId: request.id,
          message: err instanceof Error ? err.message : String(err),
          startedAt,
          elapsedMs: failedAt - startedAt,
          progress,
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runId is the stable run identity
  }, [runId]);

  return state;
}

export function analysisStateMatchesRequest(
  state: AnalysisState,
  request: AnalysisRequest | null,
): boolean {
  return request !== null && "requestId" in state && state.requestId === request.id;
}

/**
 * Cache key for a finished diagnosis. Every field changes the LLM output, so a
 * distinct (author, lens, model, language) combination is a distinct cache entry.
 */
export function diagnosisKey(
  evidence: AuthorEvidence,
  perspective: Perspective,
  selection: ModelSelection,
  language: Language,
): string {
  return `${evidence.author.email}|${perspective.id}|${selection.providerId}:${selection.model}|${language}`;
}
