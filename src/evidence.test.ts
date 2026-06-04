import { describe, expect, test } from "bun:test";
import {
  buildAuthorEvidence,
  bucketByAuthor,
  classifyChurnMismatch,
  clusterSessions,
  commitProvenance,
  compactRanges,
  countFixupChains,
  lineAgeDays,
  localParts,
  markFixups,
  scanCode,
  temporalRatios,
  wordFrequencies,
} from "./evidence";
import type { BlameLine, EvidenceCommit, RawCommit } from "./types";

// 10 days from Unix epoch — gives ageDays=10 for all authorTime=0 blame lines.
const NOW_MS = 864_000_000;

// Minimal EvidenceCommit with safe defaults for new derived-signal tests.
function ec(partial: Partial<EvidenceCommit>): EvidenceCommit {
  return {
    sha: "0000000",
    timestamp: "2026-06-05T02:00:00+02:00",
    weekday: "Friday",
    hourLocal: 2,
    minuteLocal: 0,
    message: "",
    additions: 0,
    deletions: 0,
    isAmend: false,
    minutesSincePrevious: null,
    committerDiverged: false,
    landDelayMinutes: null,
    isFixup: false,
    subjectChurnMismatch: null,
    ...partial,
  };
}

// Build a RawCommit with safe defaults for the Phase-1 capture fields (committer
// mirrors author, no body/trailers/rename) so tests need only state what matters.
function commit(partial: Partial<RawCommit>): RawCommit {
  const base: RawCommit = {
    sha: "0000000",
    authorName: "Jane",
    authorMail: "jane@x.com",
    isoDate: "2026-06-05T02:00:00+02:00",
    message: "",
    body: "",
    committerName: "Jane",
    committerMail: "jane@x.com",
    committerDate: "2026-06-05T02:00:00+02:00",
    coAuthors: [],
    aiAssistTrailers: [],
    renamedFrom: null,
    additions: 0,
    deletions: 0,
    ...partial,
  };
  // Keep committer aligned with author unless the test overrides it explicitly.
  if (partial.committerName === undefined) base.committerName = base.authorName;
  if (partial.committerMail === undefined) base.committerMail = base.authorMail;
  if (partial.committerDate === undefined) base.committerDate = base.isoDate;
  return base;
}

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
  test("minute extracted with non-zero offset", () => {
    expect(localParts("2026-03-01T23:47:00+02:00").minute).toBe(47);
  });
  test("minute is 0 for on-the-hour commit", () => {
    expect(localParts("2026-06-05T02:00:00+02:00").minute).toBe(0);
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
    commit({
      sha: "1111111aaaa",
      isoDate: "2026-06-05T02:00:00+02:00",
      message: "fix ugh",
      additions: 80,
      deletions: 5,
    }),
    commit({
      sha: "2222222bbbb",
      isoDate: "2026-06-05T03:00:00+02:00",
      message: "wip revert",
      additions: 12,
      deletions: 40,
    }),
  ];
  const evidence = buildAuthorEvidence(lines, commits, "1: code\n2: code\n3: code", NOW_MS);

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
        ageDays: 10, // NOW_MS = 10 days from epoch; authorTime = 0
      },
      {
        lineNumber: 2,
        sha: "3333333",
        authorTime: 0,
        authorTz: "+0000",
        summary: "missing from log",
        code: "const y = 2;",
        ageDays: 10,
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

  test("isAmend false when committer matches author with same timestamp", () => {
    // test commits have committerDate === isoDate → landDelayMinutes=0 → isAmend=false
    expect(evidence[0]?.blamedCommits.every((c) => c.isAmend === false)).toBe(true);
  });
});

describe("clusterSessions", () => {
  test("single commit → sessionCount 1, longestSessionMinutes 0, avgCommitsPerSession 1", () => {
    const result = clusterSessions([ec({ minutesSincePrevious: null, hourLocal: 10 })]);
    expect(result).toMatchObject({ sessionCount: 1, longestSessionMinutes: 0, longestSessionCommits: 1, avgCommitsPerSession: 1 });
  });

  test("commits split by gap > 90 min → sessionCount >= 2", () => {
    const commits = [
      ec({ minutesSincePrevious: null, hourLocal: 10 }),
      ec({ minutesSincePrevious: 30, hourLocal: 10 }),   // same session (gap 30)
      ec({ minutesSincePrevious: 180, hourLocal: 14 }),  // new session (gap 180 > 90)
      ec({ minutesSincePrevious: 20, hourLocal: 14 }),
      ec({ minutesSincePrevious: 15, hourLocal: 14 }),
    ];
    const result = clusterSessions(commits);
    expect(result.sessionCount).toBe(2);
    expect(result.longestSessionCommits).toBe(3); // session 2 has 3 commits
    expect(result.longestSessionMinutes).toBe(35); // session 2: 20+15
  });

  test("latestEndingHourLocal is max hourLocal of last commits per session", () => {
    const commits = [
      ec({ minutesSincePrevious: null, hourLocal: 21 }),
      ec({ minutesSincePrevious: 60, hourLocal: 22 }),  // session 1 ends at 22
      ec({ minutesSincePrevious: 200, hourLocal: 7 }),  // new session
      ec({ minutesSincePrevious: 60, hourLocal: 8 }),   // session 2 ends at 8
    ];
    expect(clusterSessions(commits).latestEndingHourLocal).toBe(22);
  });

  test("empty commits → all zeros", () => {
    expect(clusterSessions([])).toEqual({ sessionCount: 0, longestSessionMinutes: 0, longestSessionCommits: 0, latestEndingHourLocal: 0, avgCommitsPerSession: 0 });
  });
});

describe("temporalRatios", () => {
  test("half commits in night window → nightOwlRatio 0.5", () => {
    const commits = [
      ec({ hourLocal: 2 }),   // night
      ec({ hourLocal: 23 }),  // night
      ec({ hourLocal: 10 }),  // day
      ec({ hourLocal: 14 }),  // day
    ];
    expect(temporalRatios(commits).nightOwlRatio).toBe(0.5);
  });

  test("no weekend commits → weekendRatio 0", () => {
    const commits = [ec({ weekday: "Monday" }), ec({ weekday: "Friday" })];
    expect(temporalRatios(commits).weekendRatio).toBe(0);
  });

  test("no commits → both 0", () => {
    expect(temporalRatios([])).toEqual({ nightOwlRatio: 0, weekendRatio: 0 });
  });
});

describe("classifyChurnMismatch", () => {
  test("trivial-large: trivial subject + large churn", () => {
    expect(classifyChurnMismatch("minor tweak", 200, 150)).toBe("trivial-large"); // 350 >= 300
  });
  test("sweeping-tiny: sweeping subject + tiny churn (boundary = 10)", () => {
    expect(classifyChurnMismatch("massive refactor", 5, 5)).toBe("sweeping-tiny"); // 10 <= 10
  });
  test("consistent subject and churn → null", () => {
    expect(classifyChurnMismatch("add feature", 50, 10)).toBeNull();
  });
  test("trivial but churn below threshold → null", () => {
    expect(classifyChurnMismatch("minor tweak", 100, 100)).toBeNull(); // 200 < 300
  });
});

describe("markFixups", () => {
  test("sets isFixup true on matching subject, false otherwise", () => {
    const marked = markFixups([ec({ message: "oops typo" }), ec({ message: "add feature" })]);
    expect(marked[0]!.isFixup).toBe(true);
    expect(marked[1]!.isFixup).toBe(false);
  });
});

describe("countFixupChains", () => {
  test("two consecutive fixups = one chain", () => {
    const commits = [
      ec({ message: "fix", isFixup: true }),
      ec({ message: "oops", isFixup: true }),
      ec({ message: "add feature", isFixup: false }),
    ];
    expect(countFixupChains(commits)).toEqual({ fixupChainCount: 1, fixupCommitCount: 2 });
  });

  test("isolated fixup between non-fixups is not a chain", () => {
    const commits = [
      ec({ isFixup: false }),
      ec({ message: "fix typo", isFixup: true }),
      ec({ isFixup: false }),
    ];
    expect(countFixupChains(commits)).toEqual({ fixupChainCount: 0, fixupCommitCount: 1 });
  });
});

describe("lineAgeDays", () => {
  const ONE_DAY_MS = 86_400_000;
  test("age from fixed reference time", () => {
    expect(lineAgeDays(0, 10 * ONE_DAY_MS)).toBe(10);
  });
  test("one-decimal rounding (1.5 days)", () => {
    expect(lineAgeDays(0, 1.5 * ONE_DAY_MS)).toBe(1.5);
  });
  test("non-negative: future authorTime clamped to 0", () => {
    expect(lineAgeDays(1_000_000, 0)).toBe(0);
  });
});

describe("scanCode", () => {
  test("empty input → all zeros", () => {
    const result = scanCode([]);
    expect(result).toEqual({ todos: 0, fixmes: 0, hacks: 0, exclamations: 0, allCapsTokens: 0, magicNumbers: 0, maxNestingDepth: 0, maxLineLength: 0, profanity: 0 });
  });

  test("annotation markers counted", () => {
    const result = scanCode(["// TODO: fix this", "// FIXME: later", "// HACK: workaround"]);
    expect(result.todos).toBe(1);
    expect(result.fixmes).toBe(1);
    expect(result.hacks).toBe(1);
  });

  test("exclamations: ! counted, != not counted", () => {
    const result = scanCode(["if (x != y) { alert!() }"]);
    expect(result.exclamations).toBe(1);
  });

  test("maxLineLength is the longest line", () => {
    expect(scanCode(["abc", "hello world"]).maxLineLength).toBe(11);
  });

  test("magic numbers excludes 0 and 1", () => {
    const result = scanCode(["const x = 1;", "const y = 42;"]);
    expect(result.magicNumbers).toBe(1); // only 42
  });
});

describe("commitProvenance", () => {
  test("committerDiverged when mail differs", () => {
    const c = commit({ committerMail: "other@x.com" });
    const { committerDiverged, isAmend } = commitProvenance(c);
    expect(committerDiverged).toBe(true);
    expect(isAmend).toBe(false); // diverged → not an amend
  });

  test("isAmend heuristic: same identity but later committer date", () => {
    const c = commit({
      isoDate: "2026-06-05T02:00:00+02:00",
      committerDate: "2026-06-05T03:00:00+02:00",
    });
    const result = commitProvenance(c);
    expect(result.committerDiverged).toBe(false);
    expect(result.landDelayMinutes).toBe(60);
    expect(result.isAmend).toBe(true);
  });

  test("coincident timestamps → committerDiverged false, landDelayMinutes 0, isAmend false", () => {
    const result = commitProvenance(commit({}));
    expect(result.committerDiverged).toBe(false);
    expect(result.landDelayMinutes).toBe(0);
    expect(result.isAmend).toBe(false);
  });
});

describe("buildAuthorEvidence — determinism & shape", () => {
  const lines = [
    blame({ lineNumber: 1, sha: "aaa1111", authorMail: "x@x.com" }),
  ];
  const commits = [commit({ sha: "aaa1111xxx", authorMail: "x@x.com" })];

  test("same inputs with fixed now produce identical output", () => {
    const r1 = buildAuthorEvidence(lines, commits, "code", NOW_MS);
    const r2 = buildAuthorEvidence(lines, commits, "code", NOW_MS);
    expect(r1).toEqual(r2);
  });

  test("derived block present and all fields are numbers or nested objects", () => {
    const [author] = buildAuthorEvidence(lines, commits, "code", NOW_MS);
    const d = author!.derived;
    expect(typeof d.sessionCount).toBe("number");
    expect(typeof d.nightOwlRatio).toBe("number");
    expect(typeof d.fixupChainCount).toBe("number");
    expect(typeof d.oldestLineAgeDays).toBe("number");
    expect(typeof d.codeScan).toBe("object");
  });

  test("pre-existing fields retain their shape", () => {
    const [author] = buildAuthorEvidence(lines, commits, "code", NOW_MS);
    expect(author!.linesAuthored).toBe(1);
    expect(author!.lineRanges).toEqual([[1, 1]]);
    expect(typeof author!.authorBaseline.totalFileCommits).toBe("number");
  });
});
