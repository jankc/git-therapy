// A bordered, keyboard-selectable list pane. The highlighted row IS the live
// selection (via onChange); nothing runs until the user starts an analysis.
// WhoPane and PerspectivePane are thin wrappers that only supply options.

import { type SelectOption, type SelectRenderable } from "@opentui/core";
import { ACCENT, CURSOR_BG, NEUTRAL, TRANSPARENT } from "./theme";
import { useFocusRef } from "./useFocusRef";

interface SelectPaneProps {
  title: string;
  focused: boolean;
  options: SelectOption[];
  onChange: (index: number) => void;
  showDescription?: boolean;
}

export function SelectPane({
  title,
  focused,
  options,
  onChange,
  showDescription = true,
}: SelectPaneProps) {
  const ref = useFocusRef<SelectRenderable>(focused);

  return (
    <box
      title={title}
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
        showDescription={showDescription}
        style={{ flexGrow: 1 }}
        onChange={onChange}
      />
    </box>
  );
}
