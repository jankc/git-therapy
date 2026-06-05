// The Examination pane: a keyboard-selectable list of the analysis lenses.
// The highlighted row IS the chosen lens (live via onChange) — no number keys,
// nothing runs until the user starts analysis. Selecting here only sets intent.

import { type SelectOption } from "@opentui/core";
import { PERSPECTIVES } from "../perspectives";
import { SelectPane } from "./SelectPane";

interface PerspectivePaneProps {
  focused: boolean;
  onChange: (index: number) => void;
}

const DESCRIPTIONS: Record<string, string> = {
  mental: "mood · stress · sleep",
  skill: "experience · habits · understanding",
  context: "pressure · timing · circumstances",
  hidden: "workarounds · history · subtext",
  ghostwriter: "AI signals · style · boilerplate",
};

export function PerspectivePane({ focused, onChange }: PerspectivePaneProps) {
  const options: SelectOption[] = PERSPECTIVES.map((p) => ({
    name: p.label,
    description: DESCRIPTIONS[p.id] ?? "",
    value: p.id,
  }));

  return (
    <SelectPane title="Examination" focused={focused} options={options} onChange={onChange} />
  );
}
