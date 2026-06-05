// Root component: panes, focus cycling, model/language/lens selection, and the
// manual analysis flow. Selecting a suspect, lens, model, or language only sets
// intent — nothing runs until the user presses Enter.

import { useState } from "react";
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import { INITIAL_FOCUSED_PANE_ID, getNextPaneId, type PaneId } from "./ui/focus";
import { getPerspective } from "./ai/perspectives";
import { modelLabel, type Language, type ModelSelection } from "./ai/llm";
import { useModelSelection } from "./ui/useModelSelection";
import { useAnalysisRun } from "./ui/useAnalysisRun";
import { isBareEscapeKey } from "./ui/keys";
import { WhatPane } from "./ui/panes/WhatPane";
import { WhoPane } from "./ui/panes/WhoPane";
import { PerspectivePane } from "./ui/panes/PerspectivePane";
import { WhyPane } from "./ui/panes/WhyPane";
import { ModelPane } from "./ui/panes/ModelPane";
import { LanguagePane } from "./ui/panes/LanguagePane";
import type {
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

  const { selection, language, activeProvider, cycleSelection, cycleLanguage } =
    useModelSelection(initialSelection, initialLanguage);

  const renderer = useRenderer();
  const { height: terminalHeight } = useTerminalDimensions();
  const perspective = getPerspective(perspectiveIndex);

  const {
    displayState,
    displayFresh,
    activeAnalysis,
    sessionTokens,
    sessionCostUsd,
    isRunning,
    startAnalysis,
    cancelAnalysis,
  } = useAnalysisRun(selectedAuthor, perspective, selection, language);

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

  const suspectName = selectedAuthor
    ? selectedAuthor.author.name || selectedAuthor.author.email || "(unknown)"
    : null;

  // Restore the terminal (disable mouse tracking, leave alt screen) before exit,
  // otherwise the shell fills with mouse escape gibberish on cursor movement.
  function quit(): void {
    renderer?.destroy();
    process.exit(0);
  }

  useKeyboard((key) => {
    if (isBareEscapeKey(key) && isRunning) {
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
      cycleSelection(cycleWithinProvider);
    } else if (key.name === "l") {
      cycleLanguage();
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
