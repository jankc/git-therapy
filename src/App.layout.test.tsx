import { describe, expect, test } from "bun:test";
import { act } from "react";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, type Root } from "@opentui/react";
import { App } from "./App";
import type { AuthorEvidence, BlameLine } from "./types";

const blame: BlameLine[] = [
  {
    lineNumber: 1,
    sha: "abc1234",
    author: "Ada",
    authorMail: "ada@example.com",
    authorTime: 0,
    authorTz: "+0000",
    summary: "initial",
    code: "const x = 1;",
  },
];

const ZERO_CODE_SCAN = { todos: 0, fixmes: 0, hacks: 0, exclamations: 0, allCapsTokens: 0, magicNumbers: 0, maxNestingDepth: 0, maxLineLength: 0, profanity: 0 };
const ZERO_DERIVED = { sessionCount: 0, longestSessionMinutes: 0, longestSessionCommits: 0, latestEndingHourLocal: 0, avgCommitsPerSession: 0, nightOwlRatio: 0, weekendRatio: 0, fixupChainCount: 0, fixupCommitCount: 0, oldestLineAgeDays: 0, newestLineAgeDays: 0, codeScan: ZERO_CODE_SCAN };
const ZERO_RELATIVE_STAT = { value: 0, median: 0, ratioToMedian: 0, rank: 1, percentile: 1 };
const ZERO_RELATIVE = {
  authorCount: 1,
  nightOwlRatio: ZERO_RELATIVE_STAT,
  weekendRatio: ZERO_RELATIVE_STAT,
  avgCommitsPerSession: ZERO_RELATIVE_STAT,
  longestSessionMinutes: ZERO_RELATIVE_STAT,
  avgMessageLength: ZERO_RELATIVE_STAT,
  totalFileCommits: ZERO_RELATIVE_STAT,
  fixupCommitCount: ZERO_RELATIVE_STAT,
  linesAuthored: ZERO_RELATIVE_STAT,
  churnPerCommit: ZERO_RELATIVE_STAT,
};

function author(name: string, linesAuthored: number): AuthorEvidence {
  return {
    author: { name, email: `${name.toLowerCase()}@example.com` },
    linesAuthored,
    lineRanges: [[1, linesAuthored]],
    blamedLines: [
      {
        lineNumber: 1,
        sha: "abc1234",
        authorTime: 0,
        authorTz: "+0000",
        summary: "initial",
        code: "const x = 1;",
        ageDays: 0,
      },
    ],
    blamedCommits: [],
    authorBaseline: {
      totalFileCommits: 0,
      hourHistogram: {},
      avgMessageLength: 0,
      wordFrequencies: {},
      timeSpanDays: 0,
    },
    scopeCode: "1: const x = 1;",
    derived: ZERO_DERIVED,
    relativeToFile: ZERO_RELATIVE,
  };
}

const authors: AuthorEvidence[] = [
  author("Ada", 10),
  author("Bob", 8),
  author("Cy", 6),
  author("Dee", 4),
];
const evidenceSummary = {
  scopedLines: 1,
  historyCommits: 1,
  authorCount: authors.length,
  sourceCharacters: 13,
  gitCollectionMs: 10,
  evidenceBuildMs: 2,
};

async function renderRows(
  height: number,
  tabCount = 0,
  toggleEvidence = false,
): Promise<string[]> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const setup = await createTestRenderer({
    width: 120,
    height,
    screenMode: "main-screen",
    bufferedOutput: "memory",
  });
  let root: Root | null = null;
  try {
    act(() => {
      root = createRoot(setup.renderer);
      root.render(
        <App
          file="src/App.tsx"
          blame={blame}
          authors={authors}
          evidenceSummary={evidenceSummary}
          initialSelection={{ providerId: "ollama", model: "test-model" }}
          initialLanguage="English"
        />,
      );
    });
    await setup.renderOnce();
    for (let i = 0; i < tabCount; i++) {
      act(() => {
        setup.mockInput.pressTab();
      });
      await setup.renderOnce();
    }
    if (toggleEvidence) {
      act(() => {
        setup.mockInput.pressKey("v");
      });
      await setup.renderOnce();
    }
    return setup.captureSpans().lines.map((line) => line.spans.map((span) => span.text).join(""));
  } finally {
    act(() => {
      root?.unmount();
    });
    setup.renderer.destroy();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  }
}

describe("App terminal layout", () => {
  function leftRows(rows: string[], height: number): string[] {
    const diagnosisStart = rows[0]?.indexOf("┌─Diagnosis") ?? -1;

    expect(diagnosisStart, `diagnosis pane boundary at height ${height}`).toBeGreaterThan(-1);

    return rows.map((row) => row.slice(0, diagnosisStart));
  }

  test("keeps the model/language selector fully visible at the bottom", async () => {
    for (const height of [16, 24, 40]) {
      const left = leftRows(await renderRows(height), height);
      const subjectTitleRow = left.findIndex((row) => row.includes("Subject"));
      const modelTitleRow = left.findIndex((row) => row.includes("Model"));
      const selectorTextRow = left.findIndex(
        (row) => row.includes("ollama") && row.includes("English"),
      );

      expect(subjectTitleRow, `subject title row at height ${height}`).toBeGreaterThan(-1);
      expect(modelTitleRow, `model title row at height ${height}`).toBeGreaterThan(subjectTitleRow);
      expect(
        modelTitleRow - subjectTitleRow,
        `control cluster spacing at height ${height}`,
      ).toBeLessThanOrEqual(7);
      expect(left.some((row) => row.includes("Ada")), `subject content at height ${height}`).toBe(true);
      expect(
        left.some((row) => row.includes("Mental & Emotional")),
        `examination content at height ${height}`,
      ).toBe(true);
      expect(selectorTextRow, `selector text row at height ${height}`).toBeGreaterThan(-1);
      expect(
        left[selectorTextRow + 1] ?? "",
        `selector bottom row at height ${height}`,
      ).toContain("\u2514");
      expect(left[height - 1] ?? "", `terminal bottom row at height ${height}`).toContain("\u2514");
    }
  });

  test("expands Subject and Examination together when either pane is focused", async () => {
    for (const tabCount of [1, 2]) {
      const left = leftRows(await renderRows(24, tabCount), 24);
      const subjectTitleRow = left.findIndex((row) => row.includes("Subject"));
      const modelTitleRow = left.findIndex((row) => row.includes("Model"));

      expect(subjectTitleRow, `subject title row after ${tabCount} tab(s)`).toBeGreaterThan(-1);
      expect(modelTitleRow, `model title row after ${tabCount} tab(s)`).toBeGreaterThan(
        subjectTitleRow,
      );
      expect(
        modelTitleRow - subjectTitleRow,
        `expanded paired choice row after ${tabCount} tab(s)`,
      ).toBeGreaterThan(10);
      expect(left.some((row) => row.includes("Ada")), "first author visible").toBe(true);
      expect(left.some((row) => row.includes("Bob")), "second author visible").toBe(true);
      expect(left.some((row) => row.includes("Cy")), "third author visible").toBe(true);
      expect(left.some((row) => row.includes("Mental & Emotional")), "first lens visible").toBe(true);
      expect(left.some((row) => row.includes("Skill & Experience")), "second lens visible").toBe(true);
    }
  });

  test("toggles the Symptoms pane to a compact evidence summary", async () => {
    const code = leftRows(await renderRows(24), 24);
    const compact = leftRows(await renderRows(24, 0, true), 24);
    const expanded = leftRows(await renderRows(40, 0, true), 40);

    expect(code.some((row) => row.includes("src/App.tsx"))).toBe(false);
    expect(compact.some((row) => row.includes("Code | [Evidence]"))).toBe(true);
    expect(compact.some((row) => row.includes("Examined file: src/App.tsx"))).toBe(true);
    expect(expanded.some((row) => row.includes("Examined file: src/App.tsx"))).toBe(true);
    const pathRow = compact.findIndex((row) => row.includes("Examined file: src/App.tsx"));
    const suspectRow = compact.findIndex((row) => row.includes("Selected suspect"));
    expect(suspectRow - pathRow).toBe(2);
    expect(compact.some((row) => row.includes("10 owned lines"))).toBe(true);
    expect(compact.some((row) => row.includes("Mental & Emotional"))).toBe(true);
    expect(expanded.some((row) => row.includes("git blame --line-porcelain"))).toBe(true);
    expect(expanded.some((row) => row.includes("1 history commits"))).toBe(true);
  });
});
