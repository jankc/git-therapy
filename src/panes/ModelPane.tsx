// The model selector: a one-line segmented cycler. 'm' cycles the provider, 'M'
// the model within it. Shows the active provider · model and a dot for API-key
// availability.

import { TextAttributes } from "@opentui/core";
import type { ModelSelection } from "../ai";
import { ACCENT, DIM, KEY_MISSING, KEY_OK, NEUTRAL } from "./theme";

interface ModelPaneProps {
  selection: ModelSelection;
  hasKey: boolean;
}

export function ModelPane({ selection, hasKey }: ModelPaneProps) {
  return (
    <box
      title="Model  [m/M]"
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
          {selection.providerId} · {selection.model}
        </span>
        <span fg={DIM}> ›  </span>
        <span fg={hasKey ? KEY_OK : KEY_MISSING}>{hasKey ? "●" : "○"}</span>
      </text>
    </box>
  );
}
