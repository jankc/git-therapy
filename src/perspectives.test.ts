import { describe, expect, test } from "bun:test";
import { getPerspective, PERSPECTIVES } from "./perspectives";
import type { AuthorEvidence } from "./types";

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

function relativeStat(
  value: number,
  median: number,
  ratioToMedian: number,
  rank: number,
  percentile: number,
): AuthorEvidence["relativeToFile"]["nightOwlRatio"] {
  return { value, median, ratioToMedian, rank, percentile };
}

const MULTI_AUTHOR_EVIDENCE: AuthorEvidence = {
  author: { name: "Jane", email: "jane@x.com" },
  linesAuthored: 12,
  lineRanges: [[10, 21]],
  blamedLines: [
    {
      lineNumber: 12,
      sha: "abc1234",
      authorTime: 0,
      authorTz: "+0000",
      summary: "fix urgent TODO",
      code: "const AI_HELPER_TIMEOUT = 42; // TODO damn",
      ageDays: 4.5,
    },
  ],
  blamedCommits: [
    {
      sha: "abc1234",
      timestamp: "2026-06-05T23:15:00+02:00",
      weekday: "Friday",
      hourLocal: 23,
      minuteLocal: 15,
      message: "fix urgent TODO before demo",
      additions: 240,
      deletions: 12,
      isAmend: true,
      minutesSincePrevious: 45,
      committerDiverged: true,
      landDelayMinutes: 180,
      isFixup: true,
      subjectChurnMismatch: "trivial-large",
    },
  ],
  authorBaseline: {
    totalFileCommits: 4,
    hourHistogram: { 23: 2 },
    avgMessageLength: 31,
    wordFrequencies: { urgent: 2, demo: 1 },
    timeSpanDays: 3,
  },
  scopeCode: "12: const AI_HELPER_TIMEOUT = 42; // TODO damn",
  derived: {
    sessionCount: 2,
    longestSessionMinutes: 135,
    longestSessionCommits: 3,
    latestEndingHourLocal: 23,
    avgCommitsPerSession: 2,
    nightOwlRatio: 0.75,
    weekendRatio: 0.25,
    fixupChainCount: 1,
    fixupCommitCount: 2,
    oldestLineAgeDays: 4.5,
    newestLineAgeDays: 1.2,
    codeScan: {
      todos: 1,
      fixmes: 0,
      hacks: 0,
      exclamations: 0,
      allCapsTokens: 2,
      magicNumbers: 1,
      maxNestingDepth: 3,
      maxLineLength: 48,
      profanity: 1,
    },
  },
  relativeToFile: {
    authorCount: 3,
    nightOwlRatio: relativeStat(0.75, 0.25, 3, 1, 1),
    weekendRatio: relativeStat(0.25, 0.1, 2.5, 2, 0.67),
    avgCommitsPerSession: relativeStat(2, 1, 2, 1, 1),
    longestSessionMinutes: relativeStat(135, 60, 2.25, 1, 1),
    avgMessageLength: relativeStat(31, 20, 1.55, 1, 1),
    totalFileCommits: relativeStat(4, 3, 1.33, 2, 0.67),
    fixupCommitCount: relativeStat(2, 0, 0, 1, 1),
    linesAuthored: relativeStat(12, 8, 1.5, 1, 1),
    churnPerCommit: relativeStat(63, 25, 2.52, 1, 1),
  },
};

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
  relativeToFile: ZERO_RELATIVE,
};

describe("perspective registry", () => {
  test("exactly 5 perspectives", () => {
    expect(PERSPECTIVES.length).toBe(5);
  });

  test("ids are unique", () => {
    expect(new Set(PERSPECTIVES.map((p) => p.id)).size).toBe(5);
  });

  test("every system prompt forbids jokes and requires Markdown-only", () => {
    for (const p of PERSPECTIVES) {
      expect(p.system).toContain("Return ONLY the requested Markdown report");
      expect(p.system).toContain("no JSON");
      expect(p.system).toContain("no code fences");
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

  test("every scored system prompt carries the score template and calibrated scale rules", () => {
    for (const p of PERSPECTIVES.filter((perspective) => perspective.id !== "hidden")) {
      expect(p.system).toContain(`# ${p.label}`);
      expect(p.system).toContain("**<integer from 0 to 100>/100**");
      expect(p.system).toContain("## Notes");
      expect(p.system).toContain("Scale anchors");
      expect(p.system).toContain("0 means no supporting evidence");
      expect(p.system).toContain("~50 means weak or ambiguous evidence");
      expect(p.system).toContain("90+ means multiple converging signals");
      expect(p.system).toContain("above 75 requires at least two distinct cited data points");
      expect(p.system).toContain("Sparse evidence (few owned lines or few blamed commits)");
      expect(p.system).toContain("contradicts a metric's premise");
    }
  });

  test("hidden prompt omits metric-scale text but retains citation requirement", () => {
    const hidden = PERSPECTIVES.find((p) => p.id === "hidden")!;

    expect(hidden.system).not.toContain("Scale anchors");
    expect(hidden.system).not.toContain("0 means no supporting evidence");
    expect(hidden.system).not.toContain("above 75");
    expect(hidden.system).toContain("# Hidden Narratives");
    expect(hidden.system).toContain("## The bug being secretly worked around");
    expect(hidden.system).toContain("Each paragraph MUST cite a concrete datum");
  });

  test("lens prompts include targeted derived signals plus shared core evidence", () => {
    const expectations: Record<string, string[]> = {
      mental: [
        "MENTAL-LENS DERIVED SIGNALS",
        "sessions/night-owl/profanity/intensity",
        "\"nightOwlRatio\":0.75",
        "\"profanity\":1",
      ],
      skill: [
        "SKILL-LENS DERIVED SIGNALS",
        "code shape/age/fixups",
        "\"maxNestingDepth\":3",
        "\"oldestLineAgeDays\":4.5",
      ],
      context: [
        "CONTEXT-LENS DERIVED SIGNALS",
        "committer divergence/weekend ratio/land-delay/commit body",
        "\"committerDiverged\":true",
        "\"landDelayMinutes\":180",
        "commitBodyNote",
      ],
      hidden: [
        "NARRATIVE-LENS SIGNALS",
        "\"wordFrequencies\":{\"urgent\":2,\"demo\":1}",
        "\"fixupChainCount\":1",
      ],
      ghostwriter: [
        "GHOSTWRITER-LENS DERIVED SIGNALS",
        "naming/uniformity and AI-assist trailer evidence",
        "aiAssistTrailerNote",
        "\"allCapsTokens\":2",
      ],
    };

    for (const p of PERSPECTIVES) {
      const prompt = p.buildPrompt(MULTI_AUTHOR_EVIDENCE);

      expect(prompt).toContain("PRIMARY EVIDENCE — BLAMED LINES");
      expect(prompt).toContain("PRIMARY EVIDENCE — BLAMED COMMITS");
      for (const expected of expectations[p.id]!) {
        expect(prompt).toContain(expected);
      }
    }
  });

  test("comparative phrasing appears for multi-author fixtures", () => {
    const prompt = PERSPECTIVES.find((p) => p.id === "mental")!.buildPrompt(MULTI_AUTHOR_EVIDENCE);

    expect(prompt).toContain("COMPARATIVE STANDING");
    expect(prompt).toContain("nightOwlRatio: value 0.75");
    expect(prompt).toContain("ratioToMedian 3");
    expect(prompt).toContain("rank 1/3");
    expect(prompt).toContain("percentile 100%");
  });

  test("single-author fixture uses sole-author phrasing", () => {
    const prompt = PERSPECTIVES.find((p) => p.id === "mental")!.buildPrompt(EVIDENCE);

    expect(prompt).toContain("sole author of this file");
    expect(prompt).not.toContain("rank 1/1");
  });
});

describe("getPerspective", () => {
  test("index resolves, out-of-range falls back to first", () => {
    expect(getPerspective(1).id).toBe("skill");
    expect(getPerspective(99).id).toBe("mental");
  });
});
