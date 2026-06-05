import { describe, expect, test } from "bun:test";
import {
  buildRepoBaseline,
  extensionOf,
  languageBreakdown,
  representativeCommits,
} from "./baseline";
import type { EvidenceCommit, RawCommit } from "../types";
import type { NumstatFileChange } from "./git";

// A RawCommit with safe defaults so each test states only what it exercises.
function commit(partial: Partial<RawCommit>): RawCommit {
  return {
    sha: "0000000",
    authorName: "Jane",
    authorMail: "jane@x.com",
    isoDate: "2026-06-05T14:00:00+02:00",
    message: "",
    body: "",
    committerName: "Jane",
    committerMail: "jane@x.com",
    committerDate: "2026-06-05T14:00:00+02:00",
    coAuthors: [],
    aiAssistTrailers: [],
    renamedFrom: null,
    additions: 0,
    deletions: 0,
    ...partial,
  };
}

function ec(partial: Partial<EvidenceCommit>): EvidenceCommit {
  return {
    sha: "0000000",
    timestamp: "2026-06-05T14:00:00+02:00",
    weekday: "Friday",
    hourLocal: 14,
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

function file(path: string, additions = 1, deletions = 0): NumstatFileChange {
  return { path, additions, deletions };
}

describe("extensionOf", () => {
  test("normal extension lowercased, no dot", () => {
    expect(extensionOf("src/core/git.TS")).toBe("ts");
  });
  test("dotfiles and extensionless paths are (none)", () => {
    expect(extensionOf(".gitignore")).toBe("(none)");
    expect(extensionOf("Makefile")).toBe("(none)");
    expect(extensionOf("dir/.env")).toBe("(none)");
  });
});

describe("languageBreakdown", () => {
  test("aggregates by extension, sorted by file count then churn then ext", () => {
    const result = languageBreakdown([
      file("a.ts", 5, 1),
      file("b.ts", 2, 0),
      file("c.md", 10, 0),
      file("Makefile", 1, 0),
    ]);
    expect(result[0]).toEqual({ ext: "ts", files: 2, churn: 8 });
    // md and (none) each have 1 file; md has more churn so it ranks first.
    expect(result[1]).toEqual({ ext: "md", files: 1, churn: 10 });
    expect(result[2]).toEqual({ ext: "(none)", files: 1, churn: 1 });
  });

  test("respects the top-N cap", () => {
    const rows = Array.from({ length: 20 }, (_, i) => file(`f${i}.e${i}`));
    expect(languageBreakdown(rows, 8)).toHaveLength(8);
  });
});

describe("representativeCommits", () => {
  test("empty input yields empty list", () => {
    expect(representativeCommits([])).toEqual([]);
  });

  test("selects latest-night, largest-churn, most-fixup; deduped and capped", () => {
    const commits = [
      ec({ sha: "night01", hourLocal: 2 }),
      ec({ sha: "churn01", hourLocal: 14, additions: 500, deletions: 100 }),
      ec({ sha: "fixup01", hourLocal: 10, isFixup: true, message: "oops fix the thing again" }),
      ec({ sha: "plain01", hourLocal: 12 }),
    ];
    const reps = representativeCommits(commits);
    const byReason = Object.fromEntries(reps.map((r) => [r.reason, r.sha]));
    expect(byReason["latest-night"]).toBe("night01");
    expect(byReason["largest-churn"]).toBe("churn01");
    expect(byReason["most-fixup"]).toBe("fixup01");
    expect(reps.length).toBeLessThanOrEqual(5);
  });

  test("a commit that wins two reasons is deduped to one entry", () => {
    const reps = representativeCommits([
      ec({ sha: "both001", hourLocal: 3, additions: 999, deletions: 0 }),
      ec({ sha: "small01", hourLocal: 12, additions: 1 }),
    ]);
    expect(reps.filter((r) => r.sha === "both001")).toHaveLength(1);
  });
});

describe("buildRepoBaseline", () => {
  const commits = [
    commit({ sha: "c1", isoDate: "2026-06-01T23:30:00+02:00", additions: 10, deletions: 2, message: "add thing", coAuthors: ["Sam <s@x.com>"] }),
    commit({ sha: "c2", isoDate: "2026-06-06T02:15:00+02:00", additions: 4, deletions: 4, message: "oops fix", aiAssistTrailers: ["Co-authored-by: Copilot <c@github.com>"] }),
    commit({ sha: "c3", isoDate: "2026-06-11T10:00:00+02:00", additions: 100, deletions: 0, message: "refactor core" }),
  ];
  const files = [file("a.ts", 10, 2), file("b.ts", 4, 4), file("README.md", 100, 0)];
  const baseline = buildRepoBaseline(commits, files);

  test("scalar aggregates", () => {
    expect(baseline.totalRepoCommits).toBe(3);
    expect(baseline.timeSpanDays).toBeCloseTo(9.44, 1); // Jun 1 23:30 → Jun 11 10:00
    expect(baseline.coAuthorRate).toBeCloseTo(1 / 3, 5);
    expect(baseline.aiAssistTrailerRate).toBeCloseTo(1 / 3, 5);
    expect(baseline.churnPerCommit).toBeCloseTo((12 + 8 + 100) / 3, 5);
  });

  test("histograms have fixed keys per observed bucket and sum to commit count", () => {
    const hourTotal = Object.values(baseline.hourHistogram).reduce((a, b) => a + b, 0);
    const weekdayTotal = Object.values(baseline.weekdayHistogram).reduce((a, b) => a + b, 0);
    expect(hourTotal).toBe(3);
    expect(weekdayTotal).toBe(3);
  });

  test("language breakdown is populated from the changed-file rows", () => {
    expect(baseline.languageBreakdown[0]).toEqual({ ext: "ts", files: 2, churn: 20 });
  });

  test("determinism: same input yields deeply-equal output", () => {
    expect(buildRepoBaseline(commits, files)).toEqual(baseline);
  });

  test("fixed cardinality: a 1000-commit author has the same field set and bounded maps", () => {
    const many = Array.from({ length: 1000 }, (_, i) =>
      commit({ sha: `m${i}`, isoDate: "2026-06-05T14:00:00+02:00", message: `commit number ${i} word${i}` }),
    );
    const manyFiles = Array.from({ length: 1000 }, (_, i) => file(`f${i}.ext${i}`));
    const big = buildRepoBaseline(many, manyFiles);

    expect(Object.keys(big).sort()).toEqual(Object.keys(baseline).sort());
    expect(big.languageBreakdown.length).toBeLessThanOrEqual(8);
    expect(Object.keys(big.messageWordFrequencies).length).toBeLessThanOrEqual(20);
    expect(big.representativeCommits.length).toBeLessThanOrEqual(5);
  });

  test("empty history degrades to zeroed scalars without throwing", () => {
    const empty = buildRepoBaseline([], []);
    expect(empty.totalRepoCommits).toBe(0);
    expect(empty.timeSpanDays).toBe(0);
    expect(empty.coAuthorRate).toBe(0);
    expect(empty.languageBreakdown).toEqual([]);
    expect(empty.representativeCommits).toEqual([]);
  });
});
