import { describe, expect, test } from "bun:test";
import { act } from "react";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, type Root } from "@opentui/react";
import { PERSPECTIVES } from "../../ai/perspectives";
import type { AnalysisState } from "../../types";
import { WhyPane } from "./WhyPane";

const EMPTY_PROGRESS = {
  approxOutputTokens: 0,
  approxReasoningTokens: 0,
  activities: [],
  markdown: "",
};

async function renderWhyPane(
  state: AnalysisState,
  {
    active = false,
    sessionCostUsd = null,
    height = 14,
  }: {
    active?: boolean;
    sessionCostUsd?: number | null;
    height?: number;
  } = {},
) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const setup = await createTestRenderer({
    width: 60,
    height,
    screenMode: "main-screen",
    bufferedOutput: "memory",
  });
  let root: Root | null = null;
  try {
    act(() => {
      root = createRoot(setup.renderer);
      root.render(
        <WhyPane
          focused={false}
          perspective={PERSPECTIVES[0]!}
          state={state}
          suspect="Ada"
          model="openrouter · test-model"
          language="English"
          activeAnalysis={
            active
              ? {
                  suspect: "Ada",
                  lens: "Mental & Emotional",
                  model: "openrouter · test-model",
                  language: "English",
                }
              : null
          }
          fresh
          sessionTokens={4800}
          sessionCostUsd={sessionCostUsd}
        />,
      );
    });
    await setup.renderOnce();
    return setup.captureSpans().lines.map((line) =>
      line.spans.map((span) => span.text).join(""),
    );
  } finally {
    act(() => {
      root?.unmount();
    });
    setup.renderer.destroy();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  }
}

describe("WhyPane cost footer", () => {
  test("shows run and session cost beside token usage", async () => {
    const rows = await renderWhyPane(
      {
        status: "done",
        requestId: 1,
        markdown: "# Analysis",
        usage: { input: 800, output: 400, total: 1200 },
        costUsd: 0.00014,
        progress: EMPTY_PROGRESS,
        generatedAt: 0,
        elapsedMs: 1000,
      },
      { sessionCostUsd: 0.00053 },
    );
    const footer = rows.find((row) => row.includes("1200 tok")) ?? "";

    expect(footer).toContain("1200 tok · $0.000140");
    expect(footer).toContain("session 4800/$0.000530");
  });

  test("keeps token-only output for providers without reported cost", async () => {
    const rows = await renderWhyPane({
      status: "done",
      requestId: 1,
      markdown: "# Analysis",
      usage: { input: 800, output: 400, total: 1200 },
      progress: EMPTY_PROGRESS,
      generatedAt: 0,
      elapsedMs: 1000,
    });
    const footer = rows.find((row) => row.includes("1200 tok")) ?? "";

    expect(footer).toContain("1200 tok · session 4800 tok");
    expect(footer).not.toContain("$");
  });
});

describe("WhyPane analysis diagnostics", () => {
  const activities = [
    {
      id: "prompt",
      label: "Prompt assembled",
      status: "done" as const,
      startedAt: 1000,
      endedAt: 1000,
      detail: "12,000 chars · ~3,000 tok",
    },
    {
      id: "waiting",
      label: "First model event",
      status: "active" as const,
      startedAt: 1000,
      detail: "waiting for provider/model",
    },
  ];

  test("shows detailed transient stages while loading", async () => {
    const rows = await renderWhyPane(
      {
        status: "loading",
        requestId: 1,
        startedAt: Date.now(),
        progress: {
          approxOutputTokens: 42,
          approxReasoningTokens: 120,
          activities,
          markdown: "# Partial report\n\n## Caffeine probability — **42%**\nLine 1.",
        },
      },
      { active: true, height: 28 },
    );
    const output = rows.join("\n");

    expect(output).toContain("~42 out");
    expect(output).toContain("~120 reasoning");
    expect(output).toContain("Prompt assembled");
    expect(output).toContain("waiting for provider/model");
    expect(output).toContain("Partial report");
    expect(output).toContain("42%");
  });

  test("retains recent diagnostics when analysis fails", async () => {
    const rows = await renderWhyPane({
      status: "error",
      requestId: 1,
      message: "provider failed",
      startedAt: 1000,
      elapsedMs: 2000,
      progress: {
        approxOutputTokens: 0,
        approxReasoningTokens: 0,
        activities,
        markdown: "# Partial report\n\nProvider stopped here.",
      },
    });
    const output = rows.join("\n");

    expect(output).toContain("analysis failed: provider failed");
    expect(output).toContain("Prompt assembled");
    expect(output).toContain("Partial report");
  });

  test("keeps activity stages and puts the analysis below them after completion", async () => {
    const rows = await renderWhyPane(
      {
        status: "done",
        requestId: 1,
        markdown: "# Mental State\n\n## Caffeine probability — **42%**\nLine 1.",
        usage: { input: 10, output: 5, total: 15 },
        progress: {
          approxOutputTokens: 5,
          approxReasoningTokens: 12,
          activities,
          markdown: "# Mental State\n\n## Caffeine probability — **42%**\nLine 1.",
        },
        generatedAt: 0,
        elapsedMs: 1000,
      },
      { height: 28 },
    );
    const output = rows.join("\n");

    expect(output).toContain("Analysis complete Ada");
    expect(output).toContain("Prompt assembled");
    expect(output).toContain("First model event");
    expect(output).toContain("Caffeine probability");
    expect(output.indexOf("Prompt assembled")).toBeLessThan(
      output.indexOf("Caffeine probability"),
    );
  });
});
