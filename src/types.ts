// Shared types for git-therapy.

/** One line of `git blame --line-porcelain` output, parsed. */
export interface BlameLine {
  lineNumber: number;
  sha: string; // short (7) sha
  author: string;
  authorMail: string;
  authorTime: number; // unix seconds (commit author time)
  authorTz: string; // e.g. "+0200"
  summary: string; // commit subject
  code: string; // the source text of the line
}

/** One commit touching the scoped file, from `git log --numstat`. */
export interface RawCommit {
  sha: string;
  authorName: string;
  authorMail: string;
  isoDate: string; // strict ISO-8601 with offset (%aI)
  message: string; // commit subject (%s)
  body: string; // full multi-line commit body (%b), distinct from the subject
  committerName: string; // committer name (%cn), may differ from author on rebase/cherry-pick
  committerMail: string; // committer email (%ce)
  committerDate: string; // strict ISO-8601 committer date with offset (%cI)
  coAuthors: string[]; // `Co-authored-by:` trailer entries
  aiAssistTrailers: string[]; // trailers attributing AI assistants / bots
  renamedFrom: string | null; // prior path when this commit renamed the file, else null
  additions: number;
  deletions: number;
}

export interface BlamedLineEvidence {
  lineNumber: number;
  sha: string; // short (7) sha
  authorTime: number; // unix seconds (commit author time)
  authorTz: string; // e.g. "+0200"
  summary: string; // blame summary for the line
  code: string;
  ageDays: number; // days from authorTime to the captured reference time (one decimal)
}

export interface EvidenceCommit {
  sha: string;
  timestamp: string; // ISO
  weekday: string; // "Monday"…
  hourLocal: number; // 0-23, from the commit's own offset
  minuteLocal: number; // 0-59, from the commit's own offset
  message: string;
  additions: number;
  deletions: number;
  isAmend: boolean; // heuristic: same identity, later committer date
  minutesSincePrevious: number | null;
  committerDiverged: boolean; // committer identity differs from author
  landDelayMinutes: number | null; // committerDate − authorDate in whole minutes; null on parse error
  isFixup: boolean; // subject matches fixup wording
  subjectChurnMismatch: "trivial-large" | "sweeping-tiny" | null; // subject ↔ churn contradiction
}

/** Precomputed behavioral aggregates over an author's blame evidence. */
export interface DerivedSignals {
  // Session clustering
  sessionCount: number; // number of distinct coding sessions
  longestSessionMinutes: number; // duration of the longest session
  longestSessionCommits: number; // commit count in the longest session
  latestEndingHourLocal: number; // local hour of the last commit of the latest-ending session
  avgCommitsPerSession: number; // mean commits per session

  // Temporal ratios
  nightOwlRatio: number; // share of commits in 22:00–04:59 local, [0, 1]
  weekendRatio: number; // share of commits on Sat/Sun, [0, 1]

  // Fixup chains
  fixupChainCount: number; // maximal consecutive fixup runs of length ≥ 2
  fixupCommitCount: number; // total fixup-worded commits

  // Line age
  oldestLineAgeDays: number; // age of the oldest currently blamed line
  newestLineAgeDays: number; // age of the newest currently blamed line

  // In-code scan
  codeScan: {
    todos: number;
    fixmes: number;
    hacks: number;
    exclamations: number; // ! not part of !=
    allCapsTokens: number; // tokens of ≥ 3 consecutive uppercase letters
    magicNumbers: number; // numeric literals other than 0/1/-1
    maxNestingDepth: number; // maximum leading-indent depth across blamed lines
    maxLineLength: number; // longest blamed line in characters
    profanity: number; // conservative profanity wordlist match count
  };
}

export interface AuthorBaseline {
  totalFileCommits: number;
  hourHistogram: Record<number, number>;
  avgMessageLength: number;
  wordFrequencies: Record<string, number>;
  timeSpanDays: number;
}

/** One metric expressed relative to all authors in the scoped file. */
export interface RelativeStat {
  value: number; // this author's absolute value for the metric
  median: number; // file-wide median across compared authors
  ratioToMedian: number; // value / median; guarded to 0 when the file median is 0
  rank: number; // 1-based, with 1 = highest value; ties share the same rank
  percentile: number; // fraction of compared authors with value <= this author's value, [0, 1]
}

/** Per-author comparison against peers who touched the same scoped file. */
export interface RelativeToFile {
  authorCount: number;
  nightOwlRatio: RelativeStat;
  weekendRatio: RelativeStat;
  avgCommitsPerSession: RelativeStat;
  longestSessionMinutes: RelativeStat;
  avgMessageLength: RelativeStat;
  totalFileCommits: RelativeStat;
  fixupCommitCount: RelativeStat;
  linesAuthored: RelativeStat;
  churnPerCommit: RelativeStat;
}

/** One file-extension bucket in an author's repo-wide work, top-N by changed-file count. */
export interface RepoLanguageStat {
  ext: string; // lowercased file extension without the dot, or "(none)" when absent
  files: number; // changed-file rows touching this extension across the author's history
  churn: number; // additions + deletions across those files
}

/** A bounded, salient repo-wide commit surfaced for citation (never the full log). */
export interface RepoRepresentativeCommit {
  sha: string; // short (7) sha
  weekday: string;
  hourLocal: number; // 0-23, from the commit's own offset
  message: string;
  additions: number;
  deletions: number;
  reason: "latest-night" | "largest-churn" | "most-fixup"; // why it was selected
}

/**
 * An author's whole-repo career profile, reduced to fixed cardinality regardless of how
 * many commits feed it (fixed-length histograms, bounded top-N maps, scalars). The "career
 * chart" tier that sits beside the scoped-file specimen, used for deviation-from-norm.
 */
export interface RepoBaseline {
  totalRepoCommits: number;
  timeSpanDays: number; // first to last repo commit, 0 when < 2 commits
  hourHistogram: Record<number, number>; // local hour 0-23 → count
  weekdayHistogram: Record<string, number>; // "Monday"… → count
  nightOwlRatio: number; // share of commits in 22:00–04:59 local, [0, 1]
  weekendRatio: number; // share of commits on Sat/Sun, [0, 1]
  sessionCount: number;
  avgCommitsPerSession: number;
  longestSessionMinutes: number;
  churnPerCommit: number;
  avgMessageLength: number;
  messageWordFrequencies: Record<string, number>; // bounded top-N
  fixupChainCount: number;
  fixupCommitCount: number;
  coAuthorRate: number; // share of commits with ≥1 co-author, [0, 1]
  aiAssistTrailerRate: number; // share of commits with an AI-assist trailer, [0, 1]
  languageBreakdown: RepoLanguageStat[]; // bounded top-N by commit count
  representativeCommits: RepoRepresentativeCommit[]; // bounded top-K
}

/** The structured evidence object fed to the LLM, per author. (Locked shape.) */
export interface AuthorEvidence {
  author: { name: string; email: string };
  linesAuthored: number;
  lineRanges: Array<[number, number]>;
  /** Current blamed lines owned by this author. Primary model evidence. */
  blamedLines: BlamedLineEvidence[];
  /** Commits that introduced the current blamed lines. Primary model evidence. */
  blamedCommits: EvidenceCommit[];
  /** Broader author-in-this-file pattern data. Background context only. */
  authorBaseline: AuthorBaseline;
  scopeCode: string; // the scoped lines, with line numbers
  /** Precomputed behavioral aggregates. Cited by lenses from Phase 4 onward. */
  derived: DerivedSignals;
  /** Cross-author comparison data. Cited by lenses from Phase 4 onward. */
  relativeToFile: RelativeToFile;
  /**
   * The author's whole-repo career baseline, when the repo-wide pass succeeded. Additive,
   * optional extension of the locked contract (same pattern as `derived`/`relativeToFile`
   * in gt002/gt003): consumers that ignore it are unaffected, and absent ⇒ pre-gt005 flow.
   */
  repoBaseline?: RepoBaseline;
}

/** Compact facts about the pre-TUI git collection pass. */
export interface EvidenceCollectionSummary {
  scopedLines: number;
  historyCommits: number;
  authorCount: number;
  sourceCharacters: number;
  gitCollectionMs: number;
  evidenceBuildMs: number;
  /** Repo-wide baseline pass (gt005), absent when it was skipped or failed for all authors. */
  repoCollectionMs?: number;
  repoHistoryCommits?: number; // total commits gathered across all authors' repo histories
}

/** Token spend for one analysis call (summed across any retries). */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export type AnalysisActivityStatus = "active" | "done" | "error";

/** One visible lifecycle step for a running analysis. */
export interface AnalysisActivity {
  id: string;
  label: string;
  status: AnalysisActivityStatus;
  startedAt: number;
  endedAt?: number;
  detail?: string;
}

/** Live model diagnostics emitted while an analysis is running. */
export interface AnalysisProgress {
  approxOutputTokens: number;
  approxReasoningTokens: number;
  activities: AnalysisActivity[];
  markdown: string;
}

/** Result of analysis — async state machine for the Why pane. */
export type AnalysisState =
  | { status: "idle" }
  | {
      status: "loading";
      requestId: number;
      startedAt: number;
      progress: AnalysisProgress;
    }
  | {
      status: "done";
      requestId: number;
      markdown: string;
      usage: TokenUsage;
      costUsd?: number;
      progress: AnalysisProgress;
      generatedAt: number;
      elapsedMs: number;
    }
  | {
      status: "error";
      requestId: number;
      message: string;
      startedAt: number;
      elapsedMs: number;
      progress: AnalysisProgress;
    };
