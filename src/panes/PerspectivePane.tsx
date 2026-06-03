// The Examination pane: a keyboard-selectable list of the analysis lenses.
// The highlighted row IS the chosen lens (live via onChange) — no number keys,
// nothing runs until the user starts analysis. Selecting here only sets intent.

import { useEffect, useRef } from "react";
import { RGBA, type SelectOption, type SelectRenderable } from "@opentui/core";
import { PERSPECTIVES } from "../perspectives";

const NEUTRAL = "#4B5563";
const ACCENT = "#A6E22E";
const TRANSPARENT = RGBA.fromValues(0, 0, 0, 0); // inherit the pane background
const CURSOR_BG = "#1F2937"; // subtle dark band for the highlighted row

interface PerspectivePaneProps {
  focused: boolean;
  onChange: (index: number) => void;
}

export function PerspectivePane({ focused, onChange }: PerspectivePaneProps) {
  const ref = useRef<SelectRenderable>(null);
  // Imperatively grab keyboard focus so arrow keys move the lens cursor.
  useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);

  const options: SelectOption[] = PERSPECTIVES.map((p) => ({
    name: p.label,
    description: p.renderer === "metric-bars" ? "metrics" : "narrative",
    value: p.id,
  }));

  return (
    <box
      title="Examination"
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
        onChange={(i: number) => onChange(i)}
      />
    </box>
  );
}
