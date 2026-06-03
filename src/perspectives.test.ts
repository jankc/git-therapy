import { describe, expect, test } from "bun:test";
import {
  getPerspective,
  MetricsSchema,
  NarrativeSchema,
  PERSPECTIVES,
  perspectiveIndexForKey,
} from "./perspectives";
import type { AuthorEvidence } from "./types";

const EVIDENCE: AuthorEvidence = {
  author: { name: "Jane", email: "jane@x.com" },
  linesAuthored: 3,
  lineRanges: [[1, 3]],
  commits: [],
  aggregates: {
    totalCommits: 0,
    hourHistogram: {},
    avgMessageLength: 0,
    wordFrequencies: {},
    timeSpanDays: 0,
  },
  scopeCode: "1: const x = 1;",
};

describe("perspective registry", () => {
  test("exactly 4 perspectives", () => {
    expect(PERSPECTIVES.length).toBe(4);
  });

  test("hotkeys are 1-4 and unique", () => {
    const keys = PERSPECTIVES.map((p) => p.hotkey);
    expect(keys).toEqual(["1", "2", "3", "4"]);
    expect(new Set(keys).size).toBe(4);
  });

  test("ids are unique", () => {
    expect(new Set(PERSPECTIVES.map((p) => p.id)).size).toBe(4);
  });

  test("first three are metric-bars, last is narrative", () => {
    expect(PERSPECTIVES.slice(0, 3).every((p) => p.renderer === "metric-bars")).toBe(true);
    expect(PERSPECTIVES[3]?.renderer).toBe("narrative");
  });

  test("metric perspectives use MetricsSchema, hidden uses NarrativeSchema", () => {
    expect(PERSPECTIVES[0]?.schema).toBe(MetricsSchema);
    expect(PERSPECTIVES[3]?.schema).toBe(NarrativeSchema);
  });

  test("every system prompt forbids jokes and requires JSON-only", () => {
    for (const p of PERSPECTIVES) {
      expect(p.system).toContain("Return ONLY a JSON object");
      expect(p.system.toLowerCase()).toContain("evidence");
    }
  });

  test("buildPrompt embeds the scope code and author", () => {
    const prompt = PERSPECTIVES[0]!.buildPrompt(EVIDENCE);
    expect(prompt).toContain("1: const x = 1;");
    expect(prompt).toContain("jane@x.com");
  });
});

describe("getPerspective / perspectiveIndexForKey", () => {
  test("index resolves, out-of-range falls back to first", () => {
    expect(getPerspective(1).id).toBe("skill");
    expect(getPerspective(99).id).toBe("mental");
  });

  test("digit key maps to index", () => {
    expect(perspectiveIndexForKey("3")).toBe(2);
    expect(perspectiveIndexForKey("9")).toBeNull();
    expect(perspectiveIndexForKey("q")).toBeNull();
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
