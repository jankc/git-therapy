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
  message: string;
  additions: number;
  deletions: number;
}

/** The structured evidence object fed to the LLM, per author. (Locked shape.) */
export interface AuthorEvidence {
  author: { name: string; email: string };
  linesAuthored: number;
  lineRanges: Array<[number, number]>;
  commits: Array<{
    sha: string;
    timestamp: string; // ISO
    weekday: string; // "Monday"…
    hourLocal: number; // 0-23, from the commit's own offset
    message: string;
    additions: number;
    deletions: number;
    isAmend: boolean;
    minutesSincePrevious: number | null;
  }>;
  aggregates: {
    totalCommits: number;
    hourHistogram: Record<number, number>;
    avgMessageLength: number;
    wordFrequencies: Record<string, number>;
    timeSpanDays: number;
  };
  scopeCode: string; // the scoped lines, with line numbers
}

/** Token spend for one analysis call (summed across any retries). */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

/** Result of analysis — async state machine for the Why pane. */
export type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; approxOutputTokens: number }
  | { status: "done"; value: unknown; usage: TokenUsage }
  | { status: "error"; message: string };
