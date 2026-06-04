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
}

export interface EvidenceCommit {
  sha: string;
  timestamp: string; // ISO
  weekday: string; // "Monday"…
  hourLocal: number; // 0-23, from the commit's own offset
  message: string;
  additions: number;
  deletions: number;
  isAmend: boolean;
  minutesSincePrevious: number | null;
}

export interface AuthorBaseline {
  totalFileCommits: number;
  hourHistogram: Record<number, number>;
  avgMessageLength: number;
  wordFrequencies: Record<string, number>;
  timeSpanDays: number;
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
  | { status: "loading"; requestId: number; approxOutputTokens: number; startedAt: number }
  | {
      status: "done";
      requestId: number;
      value: unknown;
      usage: TokenUsage;
      generatedAt: number;
      elapsedMs: number;
    }
  | { status: "error"; requestId: number; message: string };
