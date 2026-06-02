import { describe, expect, test } from "bun:test";
import { getNextPaneId, INITIAL_FOCUSED_PANE_ID, PANE_IDS } from "./focus";

describe("focus cycle", () => {
  test("INITIAL_FOCUSED_PANE_ID is what", () => {
    expect(INITIAL_FOCUSED_PANE_ID).toBe("what");
  });

  test("PANE_IDS equals [what, who, why]", () => {
    expect(PANE_IDS).toEqual(["what", "who", "why"]);
  });

  test("getNextPaneId cycles what -> who", () => {
    expect(getNextPaneId("what")).toBe("who");
  });

  test("getNextPaneId cycles who -> why", () => {
    expect(getNextPaneId("who")).toBe("why");
  });

  test("getNextPaneId cycles why -> what", () => {
    expect(getNextPaneId("why")).toBe("what");
  });
});
