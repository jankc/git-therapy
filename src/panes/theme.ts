// Shared pane theme: every pane color lives here so re-theming is one-touch.
// Per-pane files import these instead of re-declaring the same hex strings.

import { RGBA } from "@opentui/core";

export const ACCENT = "#A6E22E"; // active/selected — the signature green
export const NEUTRAL = "#4B5563"; // unfocused borders
export const DIM = "#9CA3AF"; // secondary text
export const FG = "#E5E7EB"; // primary body text
export const ERROR = "#F87171"; // failures and missing keys
export const GUTTER = "#6B7280"; // blame gutter / muted metadata

// Non-color tokens shared by the selectable panes.
export const TRANSPARENT = RGBA.fromValues(0, 0, 0, 0); // inherit the pane background
export const CURSOR_BG = "#1F2937"; // subtle dark band for the highlighted row

// Semantic aliases (ModelPane's API-key dot).
export const KEY_OK = ACCENT;
export const KEY_MISSING = ERROR;
