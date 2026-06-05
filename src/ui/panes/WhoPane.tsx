// The authors pane: a keyboard-selectable list of contributors in scope.
// The highlighted row IS the current suspect (live via onChange); nothing runs
// until the user starts an analysis.

import { type SelectOption } from "@opentui/core";
import type { AuthorEvidence } from "../../types";
import { SelectPane } from "./SelectPane";

interface WhoPaneProps {
  focused: boolean;
  authors: AuthorEvidence[];
  onChange: (author: AuthorEvidence) => void;
}

export function WhoPane({ focused, authors, onChange }: WhoPaneProps) {
  const totalLines = authors.reduce((s, a) => s + a.linesAuthored, 0) || 1;

  const options: SelectOption[] = authors.map((a) => {
    const pct = Math.round((a.linesAuthored / totalLines) * 100);
    const name = a.author.name || a.author.email || "(unknown)";
    const label = a.author.email ? `${name} · ${a.author.email}` : name;
    return {
      name: label,
      description: `${pct}% · ${a.linesAuthored} lines`,
      value: a.author.email,
    };
  });

  return (
    <SelectPane
      title="Subject"
      focused={focused}
      options={options}
      onChange={(index) => {
        const picked = authors[index];
        if (picked) onChange(picked);
      }}
    />
  );
}
