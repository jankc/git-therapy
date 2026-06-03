// The model selector: a one-line segmented cycler driven by the 'm' hotkey.
// Shows the active provider · model and a dot for API-key availability.

import { TextAttributes } from "@opentui/core";
import type { ProviderInfo } from "../ai";

const NEUTRAL = "#4B5563";
const ACCENT = "#A6E22E";
const DIM = "#9CA3AF";
const KEY_OK = "#A6E22E";
const KEY_MISSING = "#F87171";

interface ModelPaneProps {
  provider: ProviderInfo;
}

export function ModelPane({ provider }: ModelPaneProps) {
  return (
    <box
      title="Model  [m]"
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
          {provider.id} · {provider.model}
        </span>
        <span fg={DIM}> ›  </span>
        <span fg={provider.hasKey ? KEY_OK : KEY_MISSING}>
          {provider.hasKey ? "●" : "○"}
        </span>
      </text>
    </box>
  );
}
