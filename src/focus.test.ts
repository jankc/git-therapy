import { describe, expect, test } from "bun:test";
import { getNextPaneId, INITIAL_FOCUSED_PANE_ID, PANE_IDS } from "./focus";

describe("focus cycle", () => {
  test("INITIAL_FOCUSED_PANE_ID is what", () => {
    expect(INITIAL_FOCUSED_PANE_ID).toBe("what");
  });

  test("PANE_IDS equals [what, who, type, why]", () => {
    expect(PANE_IDS).toEqual(["what", "who", "type", "why"]);
  });

  test("getNextPaneId cycles what -> who", () => {
    expect(getNextPaneId("what")).toBe("who");
  });

  test("getNextPaneId cycles who -> type", () => {
    expect(getNextPaneId("who")).toBe("type");
  });

  test("getNextPaneId cycles type -> why", () => {
    expect(getNextPaneId("type")).toBe("why");
  });

  test("getNextPaneId cycles why -> what", () => {
    expect(getNextPaneId("why")).toBe("what");
  });
});
