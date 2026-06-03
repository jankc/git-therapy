// Build the per-author AuthorEvidence objects from blame lines + commit log.
// Pure and deterministic — the locked contract fed to the LLM.

import type {
  AuthorBaseline,
  AuthorEvidence,
  BlameLine,
  EvidenceCommit,
  RawCommit,
} from "./types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "are", "was",
  "but", "not", "you", "all", "can", "has", "have", "had", "out", "use",
]);

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

/** Weekday + local hour from an ISO-8601 timestamp, honoring its OWN offset. */
export function localParts(iso: string): { weekday: string; hour: number } {
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
  };
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
    const { weekday, hour } = localParts(c.isoDate);
    const ms = new Date(c.isoDate).getTime();
    const minutesSincePrevious = prevMs === null ? null : Math.round((ms - prevMs) / 60_000);
    prevMs = ms;
    return {
      sha: c.sha.slice(0, 7),
      timestamp: c.isoDate,
      weekday,
      hourLocal: hour,
      message: c.message,
      additions: c.additions,
      deletions: c.deletions,
      isAmend: false, // stubbed for MVP — reliable detection needs reflog
      minutesSincePrevious,
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
): AuthorEvidence[] {
  const buckets = bucketByAuthor(lines);
  const result: AuthorEvidence[] = [];

  for (const bucket of buckets.values()) {
    const authorCommits = commits
      .filter((c) => (c.authorMail || c.authorName) === (bucket.email || bucket.name))
      .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());

    const commitObjs = toEvidenceCommits(authorCommits);
    const blamedShas = new Set(bucket.lines.map((line) => line.sha));

    result.push({
      author: { name: bucket.name, email: bucket.email },
      linesAuthored: bucket.lineNumbers.length,
      lineRanges: compactRanges(bucket.lineNumbers),
      blamedLines: bucket.lines.map((line) => ({
        lineNumber: line.lineNumber,
        sha: line.sha,
        authorTime: line.authorTime,
        authorTz: line.authorTz,
        summary: line.summary,
        code: line.code,
      })),
      blamedCommits: commitObjs.filter((commit) => blamedShas.has(commit.sha)),
      authorBaseline: buildAuthorBaseline(authorCommits),
      scopeCode,
    });
  }

  // Most lines authored first — drives author-pane ordering.
  return result.sort((a, b) => b.linesAuthored - a.linesAuthored);
}
