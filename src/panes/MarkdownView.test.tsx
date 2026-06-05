import { describe, expect, test } from "bun:test";
import { act } from "react";
import { createTestRenderer } from "@opentui/core/testing";
import { TextAttributes } from "@opentui/core";
import { createRoot, type Root } from "@opentui/react";
import { MarkdownView } from "./MarkdownView";

async function renderMarkdown(content: string) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const setup = await createTestRenderer({
    width: 60,
    height: 8,
    screenMode: "main-screen",
    bufferedOutput: "memory",
  });
  let root: Root | null = null;
  try {
    act(() => {
      root = createRoot(setup.renderer);
      root.render(<MarkdownView content={content} />);
    });
    await setup.renderOnce();
    return setup.captureSpans();
  } finally {
    act(() => {
      root?.unmount();
    });
    setup.renderer.destroy();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  }
}

describe("MarkdownView", () => {
  test("keeps incomplete streaming Markdown visible", async () => {
    const frame = await renderMarkdown("## Stress — **90/");
    const output = frame.lines.flatMap((line) => line.spans).map((span) => span.text).join("");

    expect(output).toContain("Stress — **90/");
  });

  test("highlights a completed score", async () => {
    const frame = await renderMarkdown("## Stress — **90/100**\nEvidence.");
    const scoreSpan = frame.lines
      .flatMap((line) => line.spans)
      .find((span) => span.text.includes("90/100"));

    expect(scoreSpan).toBeDefined();
    expect(scoreSpan!.attributes & TextAttributes.BOLD).toBe(TextAttributes.BOLD);
    expect(scoreSpan!.fg.toInts()).toEqual([166, 226, 46, 255]);
  });
});
