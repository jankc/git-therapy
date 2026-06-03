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
    blame({ lineNumber: 1, author: "Jane", authorMail: "jane@x.com" }),
    blame({ lineNumber: 2, author: "Jane", authorMail: "jane@x.com" }),
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

  test("commits attached, sorted, with minutesSincePrevious", () => {
    const jane = evidence[0]!;
    expect(jane.commits.length).toBe(2);
    expect(jane.commits[0]?.minutesSincePrevious).toBeNull();
    expect(jane.commits[1]?.minutesSincePrevious).toBe(60);
  });

  test("hour histogram uses local offset", () => {
    expect(evidence[0]?.aggregates.hourHistogram).toEqual({ 2: 1, 3: 1 });
  });

  test("aggregates computed", () => {
    const agg = evidence[0]!.aggregates;
    expect(agg.totalCommits).toBe(2);
    expect(agg.avgMessageLength).toBeGreaterThan(0);
    expect(agg.wordFrequencies["wip"]).toBe(1);
  });

  test("author with no matching commits still appears", () => {
    const bob = evidence[1]!;
    expect(bob.commits.length).toBe(0);
    expect(bob.aggregates.totalCommits).toBe(0);
    expect(bob.aggregates.timeSpanDays).toBe(0);
  });

  test("isAmend stubbed false", () => {
    expect(evidence[0]?.commits.every((c) => c.isAmend === false)).toBe(true);
  });
});
