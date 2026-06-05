// Build an author's whole-repo RepoBaseline from their repo-wide history (gt005).
// Pure and deterministic: fixed-length histograms, bounded top-N maps, and scalars, so the
// output size is independent of how many commits feed it. Reuses the DerivedSignals
// reducers from evidence.ts where the metric is identical to the scoped-file tier.

import type {
  EvidenceCommit,
  RawCommit,
  RepoBaseline,
  RepoLanguageStat,
  RepoRepresentativeCommit,
} from "../types";
import type { NumstatFileChange } from "./git";
import {
  churnPerCommit,
  clusterSessions,
  countFixupChains,
  toEvidenceCommits,
  temporalRatios,
  wordFrequencies,
} from "./evidence";

const TOP_LANGUAGES = 8;
const REPRESENTATIVE_CAP = 5;
// Night window matches evidence.ts (22:00–04:59 local) for cross-tier comparability.
const NIGHT_HOURS = new Set([22, 23, 0, 1, 2, 3, 4]);

/** The file extension of a path (lowercased, no dot), or "(none)" for extensionless/dotfiles. */
export function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  // dot must be interior (> 0) so dotfiles like ".gitignore" count as extensionless.
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "(none)";
}

/** Top-N extensions by changed-file count; ties broken by churn then ext for determinism. */
export function languageBreakdown(files: NumstatFileChange[], topN = TOP_LANGUAGES): RepoLanguageStat[] {
  const byExt = new Map<string, { files: number; churn: number }>();
  for (const f of files) {
    const ext = extensionOf(f.path);
    const acc = byExt.get(ext) ?? { files: 0, churn: 0 };
    acc.files += 1;
    acc.churn += f.additions + f.deletions;
    byExt.set(ext, acc);
  }
  return [...byExt.entries()]
    .map(([ext, v]) => ({ ext, files: v.files, churn: v.churn }))
    .sort((a, b) => b.files - a.files || b.churn - a.churn || a.ext.localeCompare(b.ext))
    .slice(0, topN);
}

/**
 * Deterministically pick up to K salient commits to surface for citation: the latest-night
 * commit, the largest-churn commit, and the longest fixup-worded message — deduped by sha,
 * never the full log. Empty input yields an empty list.
 */
export function representativeCommits(
  commits: EvidenceCommit[],
  cap = REPRESENTATIVE_CAP,
): RepoRepresentativeCommit[] {
  if (commits.length === 0) return [];

  const project = (c: EvidenceCommit, reason: RepoRepresentativeCommit["reason"]): RepoRepresentativeCommit => ({
    sha: c.sha,
    weekday: c.weekday,
    hourLocal: c.hourLocal,
    message: c.message,
    additions: c.additions,
    deletions: c.deletions,
    reason,
  });

  // Stable, deterministic argmax helpers (ties resolved by sha so order can't wobble).
  const pick = (
    score: (c: EvidenceCommit) => number,
    eligible: (c: EvidenceCommit) => boolean = () => true,
  ): EvidenceCommit | null => {
    let best: EvidenceCommit | null = null;
    let bestScore = -Infinity;
    for (const c of commits) {
      if (!eligible(c)) continue;
      const s = score(c);
      if (s > bestScore || (s === bestScore && best !== null && c.sha < best.sha)) {
        best = c;
        bestScore = s;
      }
    }
    return best;
  };

  const candidates: RepoRepresentativeCommit[] = [];
  const night = pick((c) => c.hourLocal, (c) => NIGHT_HOURS.has(c.hourLocal));
  if (night) candidates.push(project(night, "latest-night"));
  const churned = pick((c) => c.additions + c.deletions);
  if (churned) candidates.push(project(churned, "largest-churn"));
  const fixup = pick((c) => (c.isFixup ? c.message.length : -Infinity), (c) => c.isFixup);
  if (fixup) candidates.push(project(fixup, "most-fixup"));

  const seen = new Set<string>();
  const deduped: RepoRepresentativeCommit[] = [];
  for (const c of candidates) {
    if (seen.has(c.sha)) continue;
    seen.add(c.sha);
    deduped.push(c);
  }
  return deduped.slice(0, cap);
}

/**
 * Reduce an author's repo-wide history (commits + changed-file rows) to a fixed-cardinality
 * RepoBaseline. Deterministic: depends only on its inputs (commit timestamps carry their own
 * offset; no wall-clock is read).
 */
export function buildRepoBaseline(commits: RawCommit[], files: NumstatFileChange[]): RepoBaseline {
  const sorted = [...commits].sort(
    (a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime(),
  );
  const evidenceCommits = toEvidenceCommits(sorted);

  const hourHistogram: Record<number, number> = {};
  const weekdayHistogram: Record<string, number> = {};
  let messageLengthTotal = 0;
  let coAuthored = 0;
  let aiAssisted = 0;
  for (const c of evidenceCommits) {
    hourHistogram[c.hourLocal] = (hourHistogram[c.hourLocal] ?? 0) + 1;
    weekdayHistogram[c.weekday] = (weekdayHistogram[c.weekday] ?? 0) + 1;
    messageLengthTotal += c.message.length;
  }
  for (const c of commits) {
    if (c.coAuthors.length > 0) coAuthored += 1;
    if (c.aiAssistTrailers.length > 0) aiAssisted += 1;
  }

  const times = sorted.map((c) => new Date(c.isoDate).getTime());
  const timeSpanDays =
    times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 86_400_000 : 0;

  const { sessionCount, longestSessionMinutes, avgCommitsPerSession } = clusterSessions(evidenceCommits);
  const { nightOwlRatio, weekendRatio } = temporalRatios(evidenceCommits);
  const { fixupChainCount, fixupCommitCount } = countFixupChains(evidenceCommits);
  const total = commits.length;

  return {
    totalRepoCommits: total,
    timeSpanDays,
    hourHistogram,
    weekdayHistogram,
    nightOwlRatio,
    weekendRatio,
    sessionCount,
    avgCommitsPerSession,
    longestSessionMinutes,
    churnPerCommit: churnPerCommit(evidenceCommits),
    avgMessageLength: total > 0 ? messageLengthTotal / total : 0,
    messageWordFrequencies: wordFrequencies(evidenceCommits.map((c) => c.message)),
    fixupChainCount,
    fixupCommitCount,
    coAuthorRate: total > 0 ? coAuthored / total : 0,
    aiAssistTrailerRate: total > 0 ? aiAssisted / total : 0,
    languageBreakdown: languageBreakdown(files),
    representativeCommits: representativeCommits(evidenceCommits),
  };
}
