// Async analysis hook: idle -> loading -> done/error.
// Keyed on a primitive runKey (author email + perspective id) so it re-runs only
// on real changes. A per-run AbortController + `cancelled` flag make it safe under
// React StrictMode double-invoke and rapid author/perspective switching (an older
// slow call can never clobber a newer one).

import { useEffect, useState } from "react";
import { generateAnalysis } from "./ai";
import type { Perspective } from "./perspectives";
import type { AnalysisState, AuthorEvidence } from "./types";

export function useAnalysis(
  evidence: AuthorEvidence | null,
  perspective: Perspective,
): AnalysisState {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const runKey = evidence ? `${evidence.author.email}::${perspective.id}` : null;

  useEffect(() => {
    if (!evidence || !runKey) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setState({ status: "loading" });

    generateAnalysis(evidence, perspective, controller.signal)
      .then((value) => {
        if (!cancelled) setState({ status: "done", value });
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runKey is the stable identity
  }, [runKey]);

  return state;
}
