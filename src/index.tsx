import { createCliRenderer, TextAttributes } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { useState } from "react";
import { INITIAL_FOCUSED_PANE_ID, getNextPaneId, type PaneId } from "./focus";

interface PaneDef {
  id: PaneId;
  title: string;
  body: string;
}

const PANE_DEFS: PaneDef[] = [
  { id: "what", title: "What", body: "No file under examination" },
  { id: "who", title: "Who", body: "No suspects identified" },
  { id: "why", title: "Why", body: "No theory formed" },
];

const PERSPECTIVE_HOTKEYS = new Set(["1", "2", "3", "4"]);

const PANE_FLEX: Record<PaneId, number> = {
  what: 3,
  who: 1,
  why: 1,
};

function App() {
  const [focusedPane, setFocusedPane] = useState<PaneId>(INITIAL_FOCUSED_PANE_ID);

  useKeyboard((key) => {
    if (key.name === "tab") {
      setFocusedPane((current) => getNextPaneId(current));
    } else if (key.name === "q") {
      process.exit(0);
    } else if (PERSPECTIVE_HOTKEYS.has(key.name)) {
      // Inert: perspective hotkeys registered but not active in Phase 1
    }
  });

  return (
    <box flexGrow={1} flexDirection="row" gap={1}>
      {PANE_DEFS.map((pane) => (
        <box
          key={pane.id}
          title={pane.title}
          border
          borderColor="#4B5563"
          focusedBorderColor="#A6E22E"
          focusable
          focused={focusedPane === pane.id}
          padding={1}
          style={{ flexGrow: PANE_FLEX[pane.id] }}
        >
          <text attributes={TextAttributes.DIM}>{pane.body}</text>
        </box>
      ))}
    </box>
  );
}

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
