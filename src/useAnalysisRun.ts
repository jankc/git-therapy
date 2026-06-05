// Run orchestration lifted out of App: owns the run snapshot, the finished-result
// cache, freshness derivation, and session token/cost accounting. A result is
// "fresh" only while it still matches the current selection; otherwise the Why
// pane falls back to a cached diagnosis or returns to Ready.

import { useEffect, useRef, useState } from "react";
import { modelLabel, type Language, type ModelSelection } from "./ai";
import type { Perspective } from "./perspectives";
import {
  analysisStateMatchesRequest,
  diagnosisKey,
  useAnalysis,
  type AnalysisRequest,
} from "./useAnalysis";
import type { AnalysisState, AuthorEvidence } from "./types";

export interface ActiveAnalysis {
  suspect: string;
  lens: string;
  model: string;
  language: Language;
}

export interface AnalysisRun {
  /** The state the Why pane should render (live run, cached result, or idle). */
  displayState: AnalysisState;
  /** True when `displayState` reflects the current selection. */
  displayFresh: boolean;
  /** Non-null while a run for the current selection is streaming. */
  activeAnalysis: ActiveAnalysis | null;
  sessionTokens: number;
  sessionCostUsd: number | null;
  /** True while any run is in flight (drives the Esc-to-cancel binding). */
  isRunning: boolean;
  startAnalysis: () => void;
  cancelAnalysis: () => void;
}

function suspectLabel(evidence: AuthorEvidence): string {
  return evidence.author.name || evidence.author.email || "(unknown)";
}

export function useAnalysisRun(
  selectedAuthor: AuthorEvidence | null,
  perspective: Perspective,
  selection: ModelSelection,
  language: Language,
): AnalysisRun {
  // The snapshot that actually drives a run.
  const [runRequest, setRunRequest] = useState<AnalysisRequest | null>(null);
  const runIdRef = useRef(0);

  // Finished diagnoses, keyed by (author, lens, model, language). Written only on
  // full completion, so a cancelled or superseded run never clobbers a cached one.
  const cacheRef = useRef<Map<string, Extract<AnalysisState, { status: "done" }>>>(new Map());

  const analysis = useAnalysis(runRequest);
  const analysisMatchesRun = analysisStateMatchesRequest(analysis, runRequest);

  // The result is "fresh" only while it matches the current selection — otherwise
  // the user changed something since the run and the Why pane returns to Ready.
  const fresh =
    runRequest !== null &&
    analysisMatchesRun &&
    selectedAuthor !== null &&
    runRequest.evidence === selectedAuthor &&
    runRequest.perspective === perspective &&
    runRequest.selection.providerId === selection.providerId &&
    runRequest.selection.model === selection.model &&
    runRequest.language === language;

  // The spinner only belongs to the current selection: navigating away from a
  // running combo (fresh -> false) hides it so the new combo's cache can show.
  const activeAnalysis =
    analysis.status === "loading" && fresh && runRequest
      ? {
          suspect: suspectLabel(runRequest.evidence),
          lens: runRequest.perspective.label,
          model: modelLabel(runRequest.selection),
          language: runRequest.language,
        }
      : null;

  // A finished diagnosis for the current selection, if one was cached earlier.
  const cached = selectedAuthor
    ? cacheRef.current.get(diagnosisKey(selectedAuthor, perspective, selection, language)) ?? null
    : null;

  // Prefer the live run while it matches the selection; otherwise fall back to
  // the cache so a previously analysed combo appears immediately without a run.
  let displayState: AnalysisState = { status: "idle" };
  if (fresh && analysis.status !== "idle") {
    displayState = analysis;
  } else if (cached) {
    displayState = cached;
  }
  const displayFresh = fresh || cached !== null;

  // Accumulate token and reported OpenRouter spend across completed analyses.
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionCostUsd, setSessionCostUsd] = useState<number | null>(null);
  const countedRef = useRef<AnalysisState | null>(null);
  useEffect(() => {
    if (analysis.status === "done" && countedRef.current !== analysis) {
      countedRef.current = analysis;
      setSessionTokens((t) => t + analysis.usage.total);
      if (analysis.costUsd !== undefined) {
        const runCostUsd = analysis.costUsd;
        setSessionCostUsd((cost) => (cost ?? 0) + runCostUsd);
      }
      // Cache the finished result under the request that produced it.
      if (runRequest && analysisMatchesRun) {
        cacheRef.current.set(
          diagnosisKey(
            runRequest.evidence,
            runRequest.perspective,
            runRequest.selection,
            runRequest.language,
          ),
          analysis,
        );
      }
    }
  }, [analysis, runRequest, analysisMatchesRun]);

  function startAnalysis(): void {
    if (!selectedAuthor) return;
    runIdRef.current += 1;
    setRunRequest({
      id: runIdRef.current,
      evidence: selectedAuthor,
      perspective,
      selection,
      language,
    });
  }

  function cancelAnalysis(): void {
    setRunRequest(null);
  }

  return {
    displayState,
    displayFresh,
    activeAnalysis,
    sessionTokens,
    sessionCostUsd,
    isRunning: analysis.status === "loading",
    startAnalysis,
    cancelAnalysis,
  };
}
