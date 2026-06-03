// The output-language selector: a one-line segmented cycler driven by the 'l'
// hotkey. Mirrors ModelPane's styling so the two sit side by side.

import { TextAttributes } from "@opentui/core";
import type { Language } from "../ai";

const NEUTRAL = "#4B5563";
const ACCENT = "#A6E22E";
const DIM = "#9CA3AF";

interface LanguagePaneProps {
  language: Language;
}

export function LanguagePane({ language }: LanguagePaneProps) {
  return (
    <box
      title="Lang  [l]"
      border
      borderColor={NEUTRAL}
      paddingLeft={1}
      paddingRight={1}
      overflow="hidden"
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
    >
      <text>
        <span fg={DIM}>‹ </span>
        <span fg={ACCENT} attributes={TextAttributes.BOLD}>
          {language}
        </span>
        <span fg={DIM}> ›</span>
      </text>
    </box>
  );
}
