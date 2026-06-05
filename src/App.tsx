// Root component: panes, focus cycling, model/language/lens selection, and the
// manual analysis flow. Selecting a suspect, lens, model, or language only sets
// intent — nothing runs until the user presses Enter.

import { useEffect, useRef, useState } from "react";
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import { INITIAL_FOCUSED_PANE_ID, getNextPaneId, type PaneId } from "./focus";
import { getPerspective } from "./perspectives";
import {
  cycleModel,
  cycleProvider,
  LANGUAGES,
  listProviders,
  modelLabel,
  type Language,
  type ModelSelection,
} from "./ai";
import {
  analysisStateMatchesRequest,
  diagnosisKey,
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
import type {
  AnalysisState,
  AuthorEvidence,
  BlameLine,
  EvidenceCollectionSummary,
} from "./types";

export interface AppProps {
  file: string;
  blame: BlameLine[];
  authors: AuthorEvidence[];
  evidenceSummary: EvidenceCollectionSummary;
  /** Starting (provider, model) — from config/env/flags, resolved in index.tsx. */
  initialSelection: ModelSelection;
  /** Starting output language — from config/flags. */
  initialLanguage: Language;
}

const COMPACT_CHOICE_ROW_HEIGHT = 6;
const EXPANDED_CHOICE_ROW_HEIGHT = 14;
const SELECTOR_ROW_HEIGHT = 3;
const LOWER_CONTROLS_GAP = 1;
const LEFT_STACK_GAP = 1;
const MIN_SYMPTOMS_HEIGHT = 5;

export function App({
  file,
  blame,
  authors,
  evidenceSummary,
  initialSelection,
  initialLanguage,
}: AppProps) {
  const [focusedPane, setFocusedPane] = useState<PaneId>(INITIAL_FOCUSED_PANE_ID);
  const [whatView, setWhatView] = useState<"code" | "evidence">("code");
  const [perspectiveIndex, setPerspectiveIndex] = useState(0);
  // The current suspect tracks the Who list cursor; default to the top contributor.
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorEvidence | null>(authors[0] ?? null);
  const [selection, setSelection] = useState<ModelSelection>(initialSelection);
  const [language, setLanguage] = useState<Language>(initialLanguage);

  // The snapshot that actually drives a run.
  const [runRequest, setRunRequest] = useState<AnalysisRequest | null>(null);
  const runIdRef = useRef(0);

  // Finished diagnoses, keyed by (author, lens, model, language). Written only on
  // full completion, so a cancelled or superseded run never clobbers a cached one.
  const cacheRef = useRef<Map<string, Extract<AnalysisState, { status: "done" }>>>(new Map());

  const renderer = useRenderer();
  const { height: terminalHeight } = useTerminalDimensions();
  const perspective = getPerspective(perspectiveIndex);
  const analysis = useAnalysis(runRequest);
  const analysisMatchesRun = analysisStateMatchesRequest(analysis, runRequest);
  const choicePaneFocused = focusedPane === "who" || focusedPane === "type";
  const maxChoiceRowHeight = Math.max(
    COMPACT_CHOICE_ROW_HEIGHT,
    terminalHeight -
      MIN_SYMPTOMS_HEIGHT -
      LEFT_STACK_GAP -
      LOWER_CONTROLS_GAP -
      SELECTOR_ROW_HEIGHT,
  );
  const choiceRowHeight = choicePaneFocused
    ? Math.min(EXPANDED_CHOICE_ROW_HEIGHT, maxChoiceRowHeight)
    : COMPACT_CHOICE_ROW_HEIGHT;
  const lowerControlsHeight = choiceRowHeight + LOWER_CONTROLS_GAP + SELECTOR_ROW_HEIGHT;

  // Key availability is fixed for the process; compute the provider list once.
  const providers = useRef(listProviders()).current;
  const activeProvider = providers.find((p) => p.id === selection.providerId) ?? providers[0]!;

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

  const suspectName = selectedAuthor
    ? selectedAuthor.author.name || selectedAuthor.author.email || "(unknown)"
    : null;

  // The spinner only belongs to the current selection: navigating away from a
  // running combo (fresh -> false) hides it so the new combo's cache can show.
  const activeAnalysis =
    analysis.status === "loading" && fresh && runRequest
      ? {
          suspect: runRequest.evidence.author.name || runRequest.evidence.author.email || "(unknown)",
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
      selection,
      language,
    });
  }

  function cancelAnalysis(): void {
    setRunRequest(null);
  }

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
    } else if (key.name === "v") {
      setWhatView((current) => (current === "code" ? "evidence" : "code"));
    } else if (key.name === "m" || key.name === "M") {
      // 'm' cycles the provider (landing on its default model); 'M' (shift)
      // cycles the model within the current provider. Node-style key parsing
      // reports both as name "m" + a shift flag; tolerate an upper-case name too.
      const cycleWithinProvider =
        key.shift === true || key.name === "M" || key.sequence === "M";
      setSelection((current) =>
        cycleWithinProvider ? cycleModel(current) : cycleProvider(current),
      );
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
        <WhatPane
          focused={focusedPane === "what"}
          file={file}
          blame={blame}
          authors={authors}
          evidenceSummary={evidenceSummary}
          selectedAuthor={selectedAuthor}
          perspective={perspective}
          view={whatView}
        />
        <box
          flexDirection="column"
          gap={LOWER_CONTROLS_GAP}
          style={{ height: lowerControlsHeight, minHeight: lowerControlsHeight, flexShrink: 0 }}
        >
          <box
            flexDirection="row"
            gap={1}
            style={{ height: choiceRowHeight, minHeight: choiceRowHeight, flexShrink: 0 }}
          >
            <WhoPane focused={focusedPane === "who"} authors={authors} onChange={setSelectedAuthor} />
            <PerspectivePane focused={focusedPane === "type"} onChange={setPerspectiveIndex} />
          </box>
          <box flexDirection="row" gap={1} style={{ height: SELECTOR_ROW_HEIGHT }}>
            <ModelPane selection={selection} hasKey={activeProvider.hasKey} />
            <LanguagePane language={language} />
          </box>
        </box>
      </box>
      {/* Right half: analysis (ready summary, then the result). */}
      <WhyPane
        focused={focusedPane === "why"}
        perspective={perspective}
        state={displayState}
        suspect={suspectName}
        model={modelLabel(selection)}
        language={language}
        activeAnalysis={activeAnalysis}
        fresh={displayFresh}
        sessionTokens={sessionTokens}
        sessionCostUsd={sessionCostUsd}
      />
    </box>
  );
}
