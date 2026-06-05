export const PANE_IDS = ["what", "who", "type", "why"] as const;

export type PaneId = (typeof PANE_IDS)[number];

export const INITIAL_FOCUSED_PANE_ID: PaneId = "what";

export function getNextPaneId(current: PaneId): PaneId {
  const index = PANE_IDS.indexOf(current);
  const nextIndex = (index + 1) % PANE_IDS.length;
  return PANE_IDS[nextIndex] as PaneId;
}
