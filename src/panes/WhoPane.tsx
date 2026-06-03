// The authors pane: a keyboard-selectable list of contributors in scope.

import type { SelectOption } from "@opentui/core";
import type { AuthorEvidence } from "../types";

const NEUTRAL = "#4B5563";
const ACCENT = "#A6E22E";

interface WhoPaneProps {
  focused: boolean;
  authors: AuthorEvidence[];
  onSelect: (author: AuthorEvidence) => void;
}

export function WhoPane({ focused, authors, onSelect }: WhoPaneProps) {
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
      title="Who"
      border
      borderColor={NEUTRAL}
      focusedBorderColor={ACCENT}
      focusable
      focused={focused}
      padding={1}
      style={{ flexGrow: 1 }}
    >
      <select
        focused={focused}
        options={options}
        focusedBackgroundColor={ACCENT}
        showDescription
        onSelect={(index) => {
          const picked = authors[index];
          if (picked) onSelect(picked);
        }}
      />
    </box>
  );
}
