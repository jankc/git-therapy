import { describe, expect, test } from "bun:test";
import {
  buildAuthorEvidence,
  bucketByAuthor,
  compactRanges,
  localParts,
  wordFrequencies,
} from "./evidence";
import type { BlameLine, RawCommit } from "./types";

function blame(partial: Partial<BlameLine>): BlameLine {
  return {
    lineNumber: 1,
    sha: "abc1234",
    author: "Jane",
    authorMail: "jane@x.com",
    authorTime: 0,
    authorTz: "+0000",
    summary: "",
    code: "",
    ...partial,
  };
}

describe("compactRanges", () => {
  test("empty", () => expect(compactRanges([])).toEqual([]));
  test("contiguous + gap", () => {
    expect(compactRanges([1, 2, 3, 5])).toEqual([[1, 3], [5, 5]]);
  });
  test("unsorted input", () => {
    expect(compactRanges([5, 1, 2, 3])).toEqual([[1, 3], [5, 5]]);
  });
  test("single", () => expect(compactRanges([7])).toEqual([[7, 7]]));
});

describe("localParts", () => {
  // The offset is baked into the displayed time, so the local wall-clock equals
  // the digits in the string — independent of the host machine's timezone.
  test("reads the embedded wall-clock (+02:00)", () => {
    const { weekday, hour } = localParts("2026-06-05T02:00:00+02:00");
    expect(hour).toBe(2);
    expect(weekday).toBe("Friday");
  });
  test("honors the embedded offset, not the host TZ (-05:00)", () => {
    const { weekday, hour } = localParts("2026-06-05T22:00:00-05:00");
    expect(hour).toBe(22);
    expect(weekday).toBe("Friday");
  });
  test("late-evening hour is preserved (not host-shifted)", () => {
    expect(localParts("2026-06-05T23:30:00+02:00").hour).toBe(23);
  });
});

describe("wordFrequencies", () => {
  test("lowercases, drops stopwords + short tokens, counts", () => {
    const wf = wordFrequencies(["fix the bug", "fix fix wip", "the and for"]);
    expect(wf["fix"]).toBe(3);
    expect(wf["wip"]).toBe(1);
    expect(wf["bug"]).toBe(1);
    expect(wf["the"]).toBeUndefined(); // stopword
    expect(wf["and"]).toBeUndefined();
  });
});

describe("bucketByAuthor", () => {
  test("groups by email", () => {
    const buckets = bucketByAuthor([
      blame({ lineNumber: 1, authorMail: "a@x.com" }),
      blame({ lineNumber: 2, authorMail: "b@x.com" }),
      blame({ lineNumber: 3, authorMail: "a@x.com" }),
    ]);
    expect(buckets.size).toBe(2);
    expect(buckets.get("a@x.com")?.lineNumbers).toEqual([1, 3]);
  });
});

describe("buildAuthorEvidence", () => {
  const lines: BlameLine[] = [
    blame({
      lineNumber: 1,
      sha: "1111111",
      author: "Jane",
      authorMail: "jane@x.com",
      summary: "fix ugh",
      code: "const x = 1;",
    }),
    blame({
      lineNumber: 2,
      sha: "3333333",
      author: "Jane",
      authorMail: "jane@x.com",
      summary: "missing from log",
      code: "const y = 2;",
    }),
    blame({ lineNumber: 3, author: "Bob", authorMail: "bob@x.com" }),
  ];
  const commits: RawCommit[] = [
    {
      sha: "1111111aaaa",
      authorName: "Jane",
      authorMail: "jane@x.com",
      isoDate: "2026-06-05T02:00:00+02:00",
      message: "fix ugh",
      additions: 80,
      deletions: 5,
    },
    {
      sha: "2222222bbbb",
      authorName: "Jane",
      authorMail: "jane@x.com",
      isoDate: "2026-06-05T03:00:00+02:00",
      message: "wip revert",
      additions: 12,
      deletions: 40,
    },
  ];
  const evidence = buildAuthorEvidence(lines, commits, "1: code\n2: code\n3: code");

  test("one entry per author, sorted by linesAuthored desc", () => {
    expect(evidence.length).toBe(2);
    expect(evidence[0]?.author.email).toBe("jane@x.com");
    expect(evidence[0]?.linesAuthored).toBe(2);
    expect(evidence[1]?.author.email).toBe("bob@x.com");
  });

  test("line ranges compacted", () => {
    expect(evidence[0]?.lineRanges).toEqual([[1, 2]]);
  });

  test("blamed lines include only the selected author's blamed lines", () => {
    const jane = evidence[0]!;
    expect(jane.blamedLines).toEqual([
      {
        lineNumber: 1,
        sha: "1111111",
        authorTime: 0,
        authorTz: "+0000",
        summary: "fix ugh",
        code: "const x = 1;",
      },
      {
        lineNumber: 2,
        sha: "3333333",
        authorTime: 0,
        authorTz: "+0000",
        summary: "missing from log",
        code: "const y = 2;",
      },
    ]);
  });

  test("blamed commits include only commits matching blamed line shas", () => {
    const jane = evidence[0]!;
    expect(jane.blamedCommits.map((c) => c.sha)).toEqual(["1111111"]);
    expect(jane.blamedCommits[0]?.minutesSincePrevious).toBeNull();
  });

  test("hour histogram uses local offset", () => {
    expect(evidence[0]?.authorBaseline.hourHistogram).toEqual({ 2: 1, 3: 1 });
  });

  test("author baseline includes all file commits by that author", () => {
    const baseline = evidence[0]!.authorBaseline;
    expect(baseline.totalFileCommits).toBe(2);
    expect(baseline.avgMessageLength).toBeGreaterThan(0);
    expect(baseline.wordFrequencies["wip"]).toBe(1);
  });

  test("author with no matching commits still appears", () => {
    const bob = evidence[1]!;
    expect(bob.blamedLines.length).toBe(1);
    expect(bob.blamedCommits.length).toBe(0);
    expect(bob.authorBaseline.totalFileCommits).toBe(0);
    expect(bob.authorBaseline.timeSpanDays).toBe(0);
  });

  test("isAmend stubbed false", () => {
    expect(evidence[0]?.blamedCommits.every((c) => c.isAmend === false)).toBe(true);
  });
});
