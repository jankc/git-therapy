export interface KeyLike {
  name: string;
  sequence?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  option?: boolean;
}

// A "bare" Escape: the Escape key pressed with no modifiers. We key off the
// parsed `name`, NOT the raw byte sequence, because opentui delivers Escape two
// different ways depending on the terminal. Legacy terminals send the raw byte
// `\x1B`; terminals that speak the kitty keyboard protocol (Ghostty, Kitty,
// recent WezTerm — and opentui enables it by default) send the CSI form
// `\x1b[27u`. Both are classified as name "escape" by the parser, which has
// already disambiguated genuine escape *sequences* (arrows → "up"/"down",
// shift-tab → "tab", …) under their own names. So `name === "escape"` plus the
// absence of modifiers is the reliable, terminal-independent signal; matching on
// `sequence === "\x1B"` silently broke cancellation under the kitty protocol.
export function isBareEscapeKey(key: KeyLike): boolean {
  return (
    key.name === "escape" &&
    !key.ctrl &&
    !key.meta &&
    !key.shift &&
    !key.option
  );
}
