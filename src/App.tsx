// Root component: panes, focus cycling, model/language/lens selection, and the
// manual analysis flow. Selecting a suspect, lens, model, or language only sets
// intent — nothing runs until the user presses Enter.

import { useEffect, useRef, useState } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { INITIAL_FOCUSED_PANE_ID, getNextPaneId, type PaneId } from "./focus";
import { getPerspective } from "./perspectives";
import {
  defaultProviderId,
  LANGUAGES,
  listProviders,
  modelLabel,
  PROVIDER_ORDER,
  type Language,
  type ProviderId,
} from "./ai";
import {
  analysisStateMatchesRequest,
  useAnalysis,
  type AnalysisRequest,
} from "./useAnalysis";
import { isBareEscapeKey } from "./keys";
import { WhatPane } from "./panes/WhatPane";
import { WhoPane } from "./panes/WhoPane";
import { PerspectivePane } from "./panes/PerspectivePane";
import { WhyPane } from "./panes/WhyPane";
import { ModelPane } from "./panes/ModelPane";
import { LanguagePane } from "./panes/LanguagePane";
import type { AnalysisState, AuthorEvidence, BlameLine } from "./types";

export interface AppProps {
  file: string;
  blame: BlameLine[];
  authors: AuthorEvidence[];
}

export function App({ file, blame, authors }: AppProps) {
  const [focusedPane, setFocusedPane] = useState<PaneId>(INITIAL_FOCUSED_PANE_ID);
  const [perspectiveIndex, setPerspectiveIndex] = useState(0);
  // The current suspect tracks the Who list cursor; default to the top contributor.
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorEvidence | null>(authors[0] ?? null);
  const [providerId, setProviderId] = useState<ProviderId>(defaultProviderId());
  const [language, setLanguage] = useState<Language>("English");

  // The snapshot that actually drives a run.
  const [runRequest, setRunRequest] = useState<AnalysisRequest | null>(null);
  const runIdRef = useRef(0);

  const renderer = useRenderer();
  const perspective = getPerspective(perspectiveIndex);
  const analysis = useAnalysis(runRequest);
  const analysisMatchesRun = analysisStateMatchesRequest(analysis, runRequest);

  // Key availability is fixed for the process; compute the provider list once.
  const providers = useRef(listProviders()).current;
  const activeProvider = providers.find((p) => p.id === providerId) ?? providers[0]!;

  // The result is "fresh" only while it matches the current selection — otherwise
  // the user changed something since the run and the Why pane returns to Ready.
  const fresh =
    runRequest !== null &&
    analysisMatchesRun &&
    selectedAuthor !== null &&
    runRequest.evidence === selectedAuthor &&
    runRequest.perspective === perspective &&
    runRequest.providerId === providerId &&
    runRequest.language === language;

  const suspectName = selectedAuthor
    ? selectedAuthor.author.name || selectedAuthor.author.email || "(unknown)"
    : null;

  const activeAnalysis =
    analysis.status === "loading" && analysisMatchesRun && runRequest
      ? {
          suspect: runRequest.evidence.author.name || runRequest.evidence.author.email || "(unknown)",
          lens: runRequest.perspective.label,
          model: modelLabel(runRequest.providerId),
          language: runRequest.language,
        }
      : null;

  // Restore the terminal (disable mouse tracking, leave alt screen) before exit,
  // otherwise the shell fills with mouse escape gibberish on cursor movement.
  function quit(): void {
    renderer?.destroy();
    process.exit(0);
  }

  function startAnalysis(): void {
    if (!selectedAuthor) return;
    runIdRef.current += 1;
    setRunRequest({
      id: runIdRef.current,
      evidence: selectedAuthor,
      perspective,
      providerId,
      language,
    });
  }

  function cancelAnalysis(): void {
    setRunRequest(null);
  }

  // Accumulate token spend across analyses (count each completed run once).
  const [sessionTokens, setSessionTokens] = useState(0);
  const countedRef = useRef<AnalysisState | null>(null);
  useEffect(() => {
    if (analysis.status === "done" && countedRef.current !== analysis) {
      countedRef.current = analysis;
      setSessionTokens((t) => t + analysis.usage.total);
    }
  }, [analysis]);

  useKeyboard((key) => {
    if (isBareEscapeKey(key) && analysis.status === "loading") {
      key.preventDefault();
      key.stopPropagation();
      cancelAnalysis();
    } else if (key.name === "tab") {
      key.preventDefault();
      key.stopPropagation();
      setFocusedPane((current) => getNextPaneId(current));
    } else if (key.name === "q") {
      quit();
    } else if (key.name === "m") {
      setProviderId((current) => {
        const i = PROVIDER_ORDER.indexOf(current);
        return PROVIDER_ORDER[(i + 1) % PROVIDER_ORDER.length]!;
      });
    } else if (key.name === "l") {
      setLanguage((current) => {
        const i = LANGUAGES.indexOf(current);
        return LANGUAGES[(i + 1) % LANGUAGES.length]!;
      });
    } else if (key.name === "return" || key.name === "linefeed") {
      if (selectedAuthor) startAnalysis();
    }
  });

  return (
    <box flexGrow={1} flexDirection="row" gap={1}>
      {/* Left half: code on top, selections + model/language on the bottom. */}
      <box flexDirection="column" gap={1} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}>
        <WhatPane focused={focusedPane === "what"} file={file} blame={blame} />
        <box flexDirection="column" gap={1} style={{ flexGrow: 1, flexBasis: 0, minHeight: 0 }}>
          <box flexDirection="row" gap={1} style={{ flexGrow: 1, flexBasis: 0, minHeight: 0 }}>
            <WhoPane focused={focusedPane === "who"} authors={authors} onChange={setSelectedAuthor} />
            <PerspectivePane focused={focusedPane === "type"} onChange={setPerspectiveIndex} />
          </box>
          <box flexDirection="row" gap={1} style={{ height: 3 }}>
            <ModelPane provider={activeProvider} />
            <LanguagePane language={language} />
          </box>
        </box>
      </box>
      {/* Right half: analysis (ready summary, then the result). */}
      <WhyPane
        focused={focusedPane === "why"}
        perspective={perspective}
        state={analysis}
        suspect={suspectName}
        model={modelLabel(providerId)}
        language={language}
        activeAnalysis={activeAnalysis}
        fresh={fresh}
        sessionTokens={sessionTokens}
      />
    </box>
  );
}
