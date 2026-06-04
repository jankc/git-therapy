// Build the per-author AuthorEvidence objects from blame lines + commit log.
// Pure and deterministic — the locked contract fed to the LLM.

import type {
  AuthorBaseline,
  AuthorEvidence,
  BlameLine,
  BlamedLineEvidence,
  DerivedSignals,
  EvidenceCommit,
  RawCommit,
} from "./types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "are", "was",
  "but", "not", "you", "all", "can", "has", "have", "had", "out", "use",
]);

const SESSION_GAP_MINUTES = 90;
const CHURN_LARGE = 300;
const CHURN_TINY = 10;
// Night window: 22:00–04:59 local
const NIGHT_HOURS = new Set([22, 23, 0, 1, 2, 3, 4]);
const TRIVIAL_RE = /\b(tweak|minor|nit|typo|small|tiny|cleanup|polish|wip)\b/i;
const SWEEPING_RE = /\b(refactor|rewrite|overhaul|migrate|rework|massive|huge)\b/i;
const FIXUP_RE = /\b(fix|fixup|oops|typo|revert|nvm|nevermind|actually|whoops|argh)\b/i;
const PROFANITY_LIST = ["shit", "fuck", "crap", "damn", "wtf", "bastard", "asshole"];

/** Collapse a sorted list of line numbers into inclusive ranges. */
export function compactRanges(nums: number[]): Array<[number, number]> {
  if (nums.length === 0) return [];
  const sorted = [...nums].sort((a, b) => a - b);
  const ranges: Array<[number, number]> = [];
  let start = sorted[0]!;
  let prev = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (n === prev + 1) {
      prev = n;
    } else {
      ranges.push([start, prev]);
      start = n;
      prev = n;
    }
  }
  ranges.push([start, prev]);
  return ranges;
}

/** Weekday + local hour + minute from an ISO-8601 timestamp, honoring its OWN offset. */
export function localParts(iso: string): { weekday: string; hour: number; minute: number } {
  // Date parses the offset; shift the UTC epoch by the offset to get local wall-clock.
  const date = new Date(iso);
  const offsetMatch = iso.match(/([+-])(\d{2}):?(\d{2})$/);
  let offsetMinutes = 0;
  if (offsetMatch) {
    const sign = offsetMatch[1] === "-" ? -1 : 1;
    offsetMinutes = sign * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3]));
  } else if (/Z$/.test(iso)) {
    offsetMinutes = 0;
  }
  const localMs = date.getTime() + offsetMinutes * 60_000;
  const local = new Date(localMs);
  return {
    weekday: WEEKDAYS[local.getUTCDay()] ?? "Unknown",
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

/** Cluster time-sorted EvidenceCommits into coding sessions (gap > SESSION_GAP_MINUTES = new session). */
export function clusterSessions(commits: EvidenceCommit[]): {
  sessionCount: number;
  longestSessionMinutes: number;
  longestSessionCommits: number;
  latestEndingHourLocal: number;
  avgCommitsPerSession: number;
} {
  if (commits.length === 0) {
    return { sessionCount: 0, longestSessionMinutes: 0, longestSessionCommits: 0, latestEndingHourLocal: 0, avgCommitsPerSession: 0 };
  }

  const sessions: EvidenceCommit[][] = [];
  let current: EvidenceCommit[] = [commits[0]!];
  for (let i = 1; i < commits.length; i++) {
    const c = commits[i]!;
    if (c.minutesSincePrevious === null || c.minutesSincePrevious > SESSION_GAP_MINUTES) {
      sessions.push(current);
      current = [c];
    } else {
      current.push(c);
    }
  }
  sessions.push(current);

  let longestSessionMinutes = 0;
  let longestSessionCommits = 0;
  let latestEndingHourLocal = 0;

  for (const session of sessions) {
    let durationMinutes = 0;
    for (let i = 1; i < session.length; i++) {
      durationMinutes += session[i]!.minutesSincePrevious ?? 0;
    }
    if (durationMinutes > longestSessionMinutes) longestSessionMinutes = durationMinutes;
    if (session.length > longestSessionCommits) longestSessionCommits = session.length;
    const lastHour = session[session.length - 1]!.hourLocal;
    if (lastHour > latestEndingHourLocal) latestEndingHourLocal = lastHour;
  }

  return {
    sessionCount: sessions.length,
    longestSessionMinutes,
    longestSessionCommits,
    latestEndingHourLocal,
    avgCommitsPerSession: commits.length / sessions.length,
  };
}

/** Fraction of commits in the night window (22:00–04:59) and on weekends, each in [0, 1]. */
export function temporalRatios(commits: EvidenceCommit[]): { nightOwlRatio: number; weekendRatio: number } {
  if (commits.length === 0) return { nightOwlRatio: 0, weekendRatio: 0 };
  let night = 0;
  let weekend = 0;
  for (const c of commits) {
    if (NIGHT_HOURS.has(c.hourLocal)) night++;
    if (c.weekday === "Saturday" || c.weekday === "Sunday") weekend++;
  }
  return {
    nightOwlRatio: night / commits.length,
    weekendRatio: weekend / commits.length,
  };
}

/** Classify whether a commit's subject wording contradicts its diff size. */
export function classifyChurnMismatch(
  message: string,
  additions: number,
  deletions: number,
): "trivial-large" | "sweeping-tiny" | null {
  const churn = additions + deletions;
  if (TRIVIAL_RE.test(message) && churn >= CHURN_LARGE) return "trivial-large";
  if (SWEEPING_RE.test(message) && churn <= CHURN_TINY) return "sweeping-tiny";
  return null;
}

/** Return a new array with `isFixup` set per commit based on subject wording. */
export function markFixups(commits: EvidenceCommit[]): EvidenceCommit[] {
  return commits.map((c) => ({ ...c, isFixup: FIXUP_RE.test(c.message) }));
}

/** Count maximal consecutive fixup runs of length ≥ 2 and total fixup commits. */
export function countFixupChains(commits: EvidenceCommit[]): {
  fixupChainCount: number;
  fixupCommitCount: number;
} {
  let fixupChainCount = 0;
  let fixupCommitCount = 0;
  let runLength = 0;
  for (const c of commits) {
    if (c.isFixup) {
      runLength++;
      fixupCommitCount++;
    } else {
      if (runLength >= 2) fixupChainCount++;
      runLength = 0;
    }
  }
  if (runLength >= 2) fixupChainCount++;
  return { fixupChainCount, fixupCommitCount };
}

/** Age of a blamed line in days from authorTime (unix seconds) to now (unix ms), non-negative. */
export function lineAgeDays(authorTime: number, now: number): number {
  const days = (now / 1000 - authorTime) / 86_400;
  return Math.max(0, Math.round(days * 10) / 10);
}

/** Scan blamed code lines for annotation markers, sentiment, and shape signals. */
export function scanCode(codeLines: string[]): DerivedSignals["codeScan"] {
  let todos = 0, fixmes = 0, hacks = 0, exclamations = 0, allCapsTokens = 0;
  let magicNumbers = 0, maxNestingDepth = 0, maxLineLength = 0, profanity = 0;

  for (const line of codeLines) {
    if (/\bTODO\b/.test(line)) todos++;
    if (/\bFIXME\b/.test(line)) fixmes++;
    if (/\bHACK\b|\bXXX\b/.test(line)) hacks++;

    // ! not part of !=
    exclamations += (line.match(/!(?!=)/g) ?? []).length;

    // runs of ≥ 3 uppercase letters forming a word token
    allCapsTokens += (line.match(/\b[A-Z]{3,}\b/g) ?? []).length;

    // numeric literals other than 0, 1 (excludes -1 pattern too via word boundary)
    for (const n of (line.match(/\b\d+\b/g) ?? [])) {
      const v = parseInt(n, 10);
      if (v !== 0 && v !== 1) magicNumbers++;
    }

    // nesting depth: 2 spaces (or 1 tab) = 1 level
    const raw = line.match(/^(\s*)/)?.[1] ?? "";
    const normalized = raw.replace(/\t/g, "  ");
    const depth = Math.floor(normalized.length / 2);
    if (depth > maxNestingDepth) maxNestingDepth = depth;

    if (line.length > maxLineLength) maxLineLength = line.length;

    const lower = line.toLowerCase();
    for (const word of PROFANITY_LIST) {
      if (lower.includes(word)) profanity++;
    }
  }

  return { todos, fixmes, hacks, exclamations, allCapsTokens, magicNumbers, maxNestingDepth, maxLineLength, profanity };
}

/** Derive committer-divergence, land-delay, and amend heuristic from Phase 1 committer fields. */
export function commitProvenance(c: RawCommit): {
  committerDiverged: boolean;
  landDelayMinutes: number | null;
  isAmend: boolean;
} {
  const committerDiverged =
    c.committerMail !== c.authorMail || c.committerName !== c.authorName;

  let landDelayMinutes: number | null = null;
  try {
    const authorMs = new Date(c.isoDate).getTime();
    const committerMs = new Date(c.committerDate).getTime();
    const diff = Math.floor((committerMs - authorMs) / 60_000);
    landDelayMinutes = isNaN(diff) ? null : diff;
  } catch {
    landDelayMinutes = null;
  }

  // Same identity AND committer date is later — heuristic for --amend
  const isAmend = !committerDiverged && landDelayMinutes !== null && landDelayMinutes > 0;
  return { committerDiverged, landDelayMinutes, isAmend };
}

/** Count word frequencies across commit messages (filtered, top-N). */
export function wordFrequencies(messages: string[], topN = 20): Record<string, number> {
  const counts = new Map<string, number>();
  for (const msg of messages) {
    for (const tok of msg.toLowerCase().split(/[^a-z0-9]+/)) {
      if (tok.length < 3 || STOPWORDS.has(tok)) continue;
      counts.set(tok, (counts.get(tok) ?? 0) + 1);
    }
  }
  return Object.fromEntries(
    [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN),
  );
}

/** Group blame lines by author email → line numbers. */
export function bucketByAuthor(
  lines: BlameLine[],
): Map<string, { name: string; email: string; lineNumbers: number[]; lines: BlameLine[] }> {
  const buckets = new Map<
    string,
    { name: string; email: string; lineNumbers: number[]; lines: BlameLine[] }
  >();
  for (const line of lines) {
    const key = line.authorMail || line.author;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { name: line.author, email: line.authorMail, lineNumbers: [], lines: [] };
      buckets.set(key, bucket);
    }
    bucket.lineNumbers.push(line.lineNumber);
    bucket.lines.push(line);
  }
  return buckets;
}

function toEvidenceCommits(commits: RawCommit[]): EvidenceCommit[] {
  let prevMs: number | null = null;

  return commits.map((c) => {
    const { weekday, hour, minute } = localParts(c.isoDate);
    const ms = new Date(c.isoDate).getTime();
    const minutesSincePrevious = prevMs === null ? null : Math.round((ms - prevMs) / 60_000);
    prevMs = ms;
    const { committerDiverged, landDelayMinutes, isAmend } = commitProvenance(c);
    return {
      sha: c.sha.slice(0, 7),
      timestamp: c.isoDate,
      weekday,
      hourLocal: hour,
      minuteLocal: minute,
      message: c.message,
      additions: c.additions,
      deletions: c.deletions,
      isAmend,
      minutesSincePrevious,
      committerDiverged,
      landDelayMinutes,
      isFixup: FIXUP_RE.test(c.message),
      subjectChurnMismatch: classifyChurnMismatch(c.message, c.additions, c.deletions),
    };
  });
}

function buildAuthorBaseline(authorCommits: RawCommit[]): AuthorBaseline {
  const hourHistogram: Record<number, number> = {};
  const messages: string[] = [];

  for (const c of authorCommits) {
    const { hour } = localParts(c.isoDate);
    hourHistogram[hour] = (hourHistogram[hour] ?? 0) + 1;
    messages.push(c.message);
  }

  const times = authorCommits.map((c) => new Date(c.isoDate).getTime());
  const timeSpanDays =
    times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 86_400_000 : 0;
  const avgMessageLength =
    messages.length > 0 ? messages.reduce((s, m) => s + m.length, 0) / messages.length : 0;

  return {
    totalFileCommits: authorCommits.length,
    hourHistogram,
    avgMessageLength,
    wordFrequencies: wordFrequencies(messages),
    timeSpanDays,
  };
}

export function buildAuthorEvidence(
  lines: BlameLine[],
  commits: RawCommit[],
  scopeCode: string,
  now: number = Date.now(),
): AuthorEvidence[] {
  const buckets = bucketByAuthor(lines);
  const result: AuthorEvidence[] = [];

  for (const bucket of buckets.values()) {
    const authorCommits = commits
      .filter((c) => (c.authorMail || c.authorName) === (bucket.email || bucket.name))
      .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());

    const commitObjs = toEvidenceCommits(authorCommits);
    const blamedShas = new Set(bucket.lines.map((line) => line.sha));

    const blamedLines: BlamedLineEvidence[] = bucket.lines.map((line) => ({
      lineNumber: line.lineNumber,
      sha: line.sha,
      authorTime: line.authorTime,
      authorTz: line.authorTz,
      summary: line.summary,
      code: line.code,
      ageDays: lineAgeDays(line.authorTime, now),
    }));

    const ages = blamedLines.map((l) => l.ageDays);
    const { fixupChainCount, fixupCommitCount } = countFixupChains(commitObjs);

    const derived: DerivedSignals = {
      ...clusterSessions(commitObjs),
      ...temporalRatios(commitObjs),
      fixupChainCount,
      fixupCommitCount,
      oldestLineAgeDays: ages.length > 0 ? Math.max(...ages) : 0,
      newestLineAgeDays: ages.length > 0 ? Math.min(...ages) : 0,
      codeScan: scanCode(bucket.lines.map((l) => l.code)),
    };

    result.push({
      author: { name: bucket.name, email: bucket.email },
      linesAuthored: bucket.lineNumbers.length,
      lineRanges: compactRanges(bucket.lineNumbers),
      blamedLines,
      blamedCommits: commitObjs.filter((commit) => blamedShas.has(commit.sha)),
      authorBaseline: buildAuthorBaseline(authorCommits),
      scopeCode,
      derived,
    });
  }

  // Most lines authored first — drives author-pane ordering.
  return result.sort((a, b) => b.linesAuthored - a.linesAuthored);
}
