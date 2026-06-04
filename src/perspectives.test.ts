import { describe, expect, test } from "bun:test";
import { getPerspective, MetricsSchema, NarrativeSchema, PERSPECTIVES } from "./perspectives";
import type { AuthorEvidence } from "./types";

const ZERO_CODE_SCAN = { todos: 0, fixmes: 0, hacks: 0, exclamations: 0, allCapsTokens: 0, magicNumbers: 0, maxNestingDepth: 0, maxLineLength: 0, profanity: 0 };
const ZERO_DERIVED = { sessionCount: 0, longestSessionMinutes: 0, longestSessionCommits: 0, latestEndingHourLocal: 0, avgCommitsPerSession: 0, nightOwlRatio: 0, weekendRatio: 0, fixupChainCount: 0, fixupCommitCount: 0, oldestLineAgeDays: 0, newestLineAgeDays: 0, codeScan: ZERO_CODE_SCAN };

const EVIDENCE: AuthorEvidence = {
  author: { name: "Jane", email: "jane@x.com" },
  linesAuthored: 3,
  lineRanges: [[1, 3]],
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
};

describe("perspective registry", () => {
  test("exactly 5 perspectives", () => {
    expect(PERSPECTIVES.length).toBe(5);
  });

  test("ids are unique", () => {
    expect(new Set(PERSPECTIVES.map((p) => p.id)).size).toBe(5);
  });

  test("only Hidden Narratives uses the narrative renderer", () => {
    for (const p of PERSPECTIVES) {
      expect(p.renderer).toBe(p.id === "hidden" ? "narrative" : "metric-bars");
    }
  });

  test("metric perspectives use MetricsSchema, hidden uses NarrativeSchema", () => {
    for (const p of PERSPECTIVES) {
      expect(p.schema).toBe(p.id === "hidden" ? NarrativeSchema : MetricsSchema);
    }
  });

  test("every system prompt forbids jokes and requires JSON-only", () => {
    for (const p of PERSPECTIVES) {
      expect(p.system).toContain("Return ONLY a JSON object");
      expect(p.system.toLowerCase()).toContain("evidence");
      expect(p.system).toContain("BLAMED LINES");
      expect(p.system).toContain("AUTHOR BASELINE");
    }
  });

  test("buildPrompt embeds focused evidence, scope code, and author", () => {
    const prompt = PERSPECTIVES[0]!.buildPrompt(EVIDENCE);
    expect(prompt).toContain("1: const x = 1;");
    expect(prompt).toContain("jane@x.com");
    expect(prompt).toContain("BLAMED LINES");
    expect(prompt).toContain("BLAMED COMMITS");
    expect(prompt).toContain("AUTHOR BASELINE");
    expect(prompt).toContain("SCOPE CODE");
  });
});

describe("getPerspective", () => {
  test("index resolves, out-of-range falls back to first", () => {
    expect(getPerspective(1).id).toBe("skill");
    expect(getPerspective(99).id).toBe("mental");
  });
});

describe("schemas validate", () => {
  test("MetricsSchema accepts a well-formed object", () => {
    const r = MetricsSchema.safeParse({
      author: "Jane",
      metrics: [
        { name: "Mood", value: 30, evidence: "ugh" },
        { name: "Stress", value: 75, evidence: "2am" },
        { name: "Sleep debt", value: 88, evidence: "3am" },
      ],
      notes: [],
    });
    expect(r.success).toBe(true);
  });

  test("MetricsSchema rejects out-of-range value", () => {
    const r = MetricsSchema.safeParse({
      author: "Jane",
      metrics: [{ name: "Mood", value: 200, evidence: "x" }],
      notes: [],
    });
    expect(r.success).toBe(false);
  });

  test("NarrativeSchema accepts sections", () => {
    const r = NarrativeSchema.safeParse({
      sections: [{ heading: "The bug", body: "..." }],
    });
    expect(r.success).toBe(true);
  });
});
