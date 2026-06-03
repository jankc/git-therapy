// Root component: three panes, focus cycling, perspective hotkeys, analysis wiring.

import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { INITIAL_FOCUSED_PANE_ID, getNextPaneId, type PaneId } from "./focus";
import { getPerspective, perspectiveIndexForKey } from "./perspectives";
import { useAnalysis } from "./useAnalysis";
import { WhatPane } from "./panes/WhatPane";
import { WhoPane } from "./panes/WhoPane";
import { WhyPane } from "./panes/WhyPane";
import type { AuthorEvidence, BlameLine } from "./types";

export interface AppProps {
  file: string;
  blame: BlameLine[];
  authors: AuthorEvidence[];
}

export function App({ file, blame, authors }: AppProps) {
  const [focusedPane, setFocusedPane] = useState<PaneId>(INITIAL_FOCUSED_PANE_ID);
  const [perspectiveIndex, setPerspectiveIndex] = useState(0);
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorEvidence | null>(null);

  const perspective = getPerspective(perspectiveIndex);
  const analysis = useAnalysis(selectedAuthor, perspective);

  useKeyboard((key) => {
    if (key.name === "tab") {
      setFocusedPane((current) => getNextPaneId(current));
    } else if (key.name === "q") {
      process.exit(0);
    } else {
      const idx = perspectiveIndexForKey(key.name);
      if (idx !== null) setPerspectiveIndex(idx);
    }
  });

  return (
    <box flexGrow={1} flexDirection="row" gap={1}>
      <WhatPane focused={focusedPane === "what"} file={file} blame={blame} />
      <WhoPane
        focused={focusedPane === "who"}
        authors={authors}
        onSelect={setSelectedAuthor}
      />
      <WhyPane
        focused={focusedPane === "why"}
        perspective={perspective}
        state={analysis}
        hasAuthor={selectedAuthor !== null}
      />
    </box>
  );
}
