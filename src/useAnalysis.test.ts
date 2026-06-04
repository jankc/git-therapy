import { describe, expect, test } from "bun:test";
import { PERSPECTIVES } from "./perspectives";
import type { AuthorEvidence } from "./types";
import {
  analysisStateMatchesRequest,
  type AnalysisRequest,
} from "./useAnalysis";

const ZERO_CODE_SCAN = { todos: 0, fixmes: 0, hacks: 0, exclamations: 0, allCapsTokens: 0, magicNumbers: 0, maxNestingDepth: 0, maxLineLength: 0, profanity: 0 };
const ZERO_DERIVED = { sessionCount: 0, longestSessionMinutes: 0, longestSessionCommits: 0, latestEndingHourLocal: 0, avgCommitsPerSession: 0, nightOwlRatio: 0, weekendRatio: 0, fixupChainCount: 0, fixupCommitCount: 0, oldestLineAgeDays: 0, newestLineAgeDays: 0, codeScan: ZERO_CODE_SCAN };

const evidence: AuthorEvidence = {
  author: { name: "Ada", email: "ada@example.com" },
  linesAuthored: 1,
  lineRanges: [[1, 1]],
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

function request(id: number): AnalysisRequest {
  return {
    id,
    evidence,
    perspective: PERSPECTIVES[0]!,
    selection: { providerId: "ollama", model: "qwen3.6:27b-mlx" },
    language: "English",
  };
}

describe("analysisStateMatchesRequest", () => {
  test("matches loading, done, and error states by request id", () => {
    expect(
      analysisStateMatchesRequest(
        { status: "loading", requestId: 1, approxOutputTokens: 0, startedAt: 0 },
        request(1),
      ),
    ).toBe(true);
    expect(
      analysisStateMatchesRequest(
        {
          status: "done",
          requestId: 1,
          value: {},
          usage: { input: 1, output: 1, total: 2 },
          generatedAt: 0,
          elapsedMs: 0,
        },
        request(1),
      ),
    ).toBe(true);
    expect(
      analysisStateMatchesRequest(
        { status: "error", requestId: 1, message: "failed" },
        request(1),
      ),
    ).toBe(true);
  });

  test("does not match stale completed state from an earlier run", () => {
    expect(
      analysisStateMatchesRequest(
        {
          status: "done",
          requestId: 1,
          value: { sections: [{ heading: "old", body: "old" }] },
          usage: { input: 1, output: 1, total: 2 },
          generatedAt: 0,
          elapsedMs: 0,
        },
        request(2),
      ),
    ).toBe(false);
  });

  test("idle and missing request never match", () => {
    expect(analysisStateMatchesRequest({ status: "idle" }, request(1))).toBe(false);
    expect(
      analysisStateMatchesRequest(
        { status: "loading", requestId: 1, approxOutputTokens: 0, startedAt: 0 },
        null,
      ),
    ).toBe(false);
  });
});
