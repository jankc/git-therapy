// The authors pane: a keyboard-selectable list of contributors in scope.
// The highlighted row IS the current suspect (live via onChange); nothing runs
// until the user starts an analysis.

import { useEffect, useRef } from "react";
import { RGBA, type SelectOption, type SelectRenderable } from "@opentui/core";
import type { AuthorEvidence } from "../types";

const NEUTRAL = "#4B5563";
const ACCENT = "#A6E22E";
const TRANSPARENT = RGBA.fromValues(0, 0, 0, 0); // inherit the pane background
const CURSOR_BG = "#1F2937"; // subtle dark band for the highlighted row

interface WhoPaneProps {
  focused: boolean;
  authors: AuthorEvidence[];
  onChange: (author: AuthorEvidence) => void;
}

export function WhoPane({ focused, authors, onChange }: WhoPaneProps) {
  const ref = useRef<SelectRenderable>(null);
  // Imperatively grab keyboard focus so arrow keys move the author cursor.
  useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);

  const totalLines = authors.reduce((s, a) => s + a.linesAuthored, 0) || 1;

  const options: SelectOption[] = authors.map((a) => {
    const pct = Math.round((a.linesAuthored / totalLines) * 100);
    return {
      name: a.author.name || a.author.email || "(unknown)",
      description: `${pct}% · ${a.linesAuthored} lines`,
      value: a.author.email,
    };
  });

  return (
    <box
      title="Subject"
      border
      borderColor={focused ? ACCENT : NEUTRAL}
      padding={1}
      overflow="hidden"
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, minHeight: 0 }}
    >
      <select
        ref={ref}
        focused={focused}
        options={options}
        backgroundColor={TRANSPARENT}
        focusedBackgroundColor={TRANSPARENT}
        selectedBackgroundColor={CURSOR_BG}
        selectedTextColor={ACCENT}
        showDescription
        style={{ flexGrow: 1 }}
        onChange={(index: number) => {
          const picked = authors[index];
          if (picked) onChange(picked);
        }}
      />
    </box>
  );
}
