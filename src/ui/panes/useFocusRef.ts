// Shared focus boilerplate: imperatively grab keyboard focus when a pane becomes
// focused. Works for any renderable exposing `focus()` (select, scrollbox, …).

import { useEffect, useRef, type RefObject } from "react";

export function useFocusRef<T extends { focus: () => void }>(
  focused: boolean,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);
  return ref;
}
