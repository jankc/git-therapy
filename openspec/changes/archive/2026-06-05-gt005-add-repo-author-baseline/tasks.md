## 1. Types (additive contract extension)

- [x] 1.1 Add `RepoBaseline` to `src/types.ts`: scalars (`totalRepoCommits`, `timeSpanDays`, `nightOwlRatio`, `weekendRatio`, `churnPerCommit`, `fixupChainCount`, `fixupCommitCount`, `coAuthorRate`, `aiAssistTrailerRate`, session aggregates), a 24-key `hourHistogram`, a 7-key `weekdayHistogram`, bounded top-N `messageWordFrequencies` and `languageBreakdown`, and an optional bounded `representativeCommits`.
- [x] 1.2 Add optional `repoBaseline?: RepoBaseline` to `AuthorEvidence`, keeping every existing field untouched; add a code comment noting the additive, gt002/gt003-style extension of the locked contract.
- [x] 1.3 Add optional repo-pass fields (commit count, timing) to `EvidenceCollectionSummary` without altering existing fields.

## 2. Repo-wide collection (`src/core/git.ts`)

- [x] 2.1 Add an author-scoped, mailmap-resolved log command: `git log --author=<email> --use-mailmap --numstat` (no `--follow`), reusing the existing `RawCommit` parser.
- [x] 2.2 Make the collector tolerant: on git error / shallow clone / empty result it resolves to an empty history rather than throwing.
- [x] 2.3 Tests: parse multi-file repo-wide output into `RawCommit[]`; mailmap-collapsed identity yields one bucket; failure path returns empty.

## 3. Baseline reducer (`src/core/baseline.ts`)

- [x] 3.1 Build `RepoBaseline` from repo-wide `RawCommit[]`, reusing `DerivedSignals` reducers (`clusterSessions`, `temporalRatios`, `countFixupChains`, `wordFrequencies`, `churnPerCommit`, hour histogram) over the mapped `EvidenceCommit[]`.
- [x] 3.2 Implement baseline-only fields: `weekdayHistogram`, `languageBreakdown` (top-N file extensions from `--numstat` paths, bounded), `coAuthorRate`, `aiAssistTrailerRate`, `totalRepoCommits`, `timeSpanDays`.
- [x] 3.3 Implement `representativeCommits` as a deterministic top-K salience selection (latest-night / largest-churn / most-fixup), capped at K.
- [x] 3.4 Keep the reducer pure and deterministic (reference time injected, no `Date.now()` inside).
- [x] 3.5 Tests: fixed-cardinality invariant (huge-history vs tiny-history author ⇒ same field set, same max cardinality); determinism (same input ⇒ identical output); top-K cap respected.

## 4. Wire into the evidence build

- [x] 4.1 In `src/index.tsx`, run the repo-wide pass per analyzed author alongside the scoped pass (independent; may run in parallel), tolerating failure.
- [x] 4.2 In `src/core/evidence.ts` (`buildAuthorEvidence`), attach `repoBaseline` when present; leave it absent on failure/empty, with all existing fields unchanged.
- [x] 4.3 Record optional repo-pass timing/commit count on the collection summary.
- [x] 4.4 Test: evidence builds identically (baseline absent) when the repo pass is skipped/fails.

## 5. Deviation-aware lenses (`src/ai/perspectives.ts`)

- [x] 5.1 Extend each lens projection so that when `repoBaseline` is present it emits a labeled file-specimen-vs-career-baseline line for that lens's signal; when absent it returns today's projection verbatim.
- [x] 5.1a Apply the targeted per-lens reframing (no new metrics): mental → judge stress/sleep/caffeine vs the author's career night-owl/session norm; skill → ground experience in career time span + language breadth, flag in/out of dominant languages; context → read resignation/vacation as anomalies vs repo cadence; ghostwriter → judge AI-authorship as deviation from career style fingerprint + AI-trailer rate; hidden → unchanged.
- [x] 5.2 Ensure rendered baseline figures are concrete, quotable data covered by the existing grounded-citation requirement; draw only from `repoBaseline` fields.
- [x] 5.3 Surface the baseline tier in the rendered evidence block in `src/ai/llm.ts` if needed for the projection.
- [x] 5.4 Tests: deviation framing present with a baseline and labeled by tier; projection byte-identical to pre-change output when baseline is absent.

## 6. Display in the Evidence view (`src/ui/panes/WhatPane.tsx`)

- [x] 6.1 In `EvidenceView`, append the selected author's `repoBaseline` to the existing evidence summary (career commits/time span, night-owl & weekend ratios, top languages) — no new toggle, key, or pane; reuse the pane's `NEUTRAL`/`ACCENT`/`GUTTER` colors.
- [x] 6.2 Render nothing extra when `repoBaseline` is absent, so the view is unchanged for no-baseline runs.

## 7. Verify

- [x] 7.1 `bunx tsc --noEmit` clean; `bun test` green.
- [x] 7.2 Manual run against this repo on a multi-file author confirms a populated baseline shown in the Evidence view; run on a single-file/no-mailmap case confirms graceful absence.
- [x] 7.3 Update `CLAUDE.md` module map and `README.md` (the Evidence view now shows a career baseline).
