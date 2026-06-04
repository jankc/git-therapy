## 1. Types (`src/types.ts`)

- [x] 1.1 Add a `RelativeStat` interface: `value`, `median`, `ratioToMedian`, `rank`,
  `percentile` (all `number`). Comment each field in the file's existing style, including the
  rank convention (1 = highest) and the zero-median guard on `ratioToMedian`.
- [x] 1.2 Add a `RelativeToFile` interface: `authorCount: number` plus one `RelativeStat`
  per compared metric — `nightOwlRatio`, `weekendRatio`, `avgCommitsPerSession`,
  `longestSessionMinutes`, `avgMessageLength`, `totalFileCommits`, `fixupCommitCount`,
  `linesAuthored`, `churnPerCommit`.
- [x] 1.3 Add a required `relativeToFile: RelativeToFile` field to `AuthorEvidence`, sibling
  to `derived`, with a comment noting it is cited by lenses from Phase 4 onward.

## 2. Comparison metric set & distribution math (`src/evidence.ts`, pure + exported)

- [x] 2.1 Declare the fixed comparison set once near the top: a list of descriptors
  `{ key, extract: (e: AuthorEvidence) => number }` covering the nine metrics above
  (`churnPerCommit` = mean `additions + deletions` over `e.blamedCommits`, `0` when empty).
- [x] 2.2 `median(values: number[])` → the middle value (mean of the two middle values for an
  even count), `0` for an empty list.
- [x] 2.3 `relativeStat(value, allValues)` → a `RelativeStat`: `median` from 2.2,
  `ratioToMedian = median > 0 ? round2(value / median) : 0`, `rank` (1 = highest, ties share
  the lower rank), and `percentile` (fraction of values `<= value`, in [0, 1], round2).

## 3. Two-pass build (`src/evidence.ts`)

- [x] 3.1 Keep the current per-author work as pass 1, producing the interim
  `AuthorEvidence[]` exactly as today (no `relativeToFile` yet).
- [x] 3.2 Add `attachRelativeStats(authors: AuthorEvidence[])` (pure): for each descriptor,
  gather the metric's values across all authors once, then write a `RelativeStat` back onto
  each author; assemble each author's `RelativeToFile` with `authorCount = authors.length`.
- [x] 3.3 Wire pass 2 into `buildAuthorEvidence` between the per-author build and the final
  `linesAuthored`-desc sort, so the returned evidence always carries `relativeToFile`
  (including the single-author degenerate case: median = value, rank 1, percentile 1,
  ratio 1).

## 4. Tests (`src/evidence.test.ts`)

- [x] 4.1 Update the test factories / helpers so built `AuthorEvidence` carries
  `relativeToFile` (build through `buildAuthorEvidence`, or add a default block).
- [x] 4.2 Unit-test `median` (odd, even, empty) and `relativeStat` (ratio-to-median, rank
  with the highest-first convention, tie sharing a rank, percentile bounds, and the
  zero-median guard yielding finite `0`).
- [x] 4.3 Build a multi-author fixture and assert end-to-end via `buildAuthorEvidence`: each
  author has a `relativeToFile` with correct `authorCount`, the top author of a metric has
  `rank` 1 / `percentile` 1, `churnPerCommit` is the mean over blamed commits (and `0` with
  none), and the comparison set covers all nine metrics.
- [x] 4.4 Single-author test: `relativeToFile` present, `authorCount` 1, every metric rank 1
  / percentile 1 / ratioToMedian 1.
- [x] 4.5 Determinism test: `buildAuthorEvidence` with a fixed `now` returns identical output
  (including every `relativeToFile` field) across two calls, and pre-existing fields
  (incl. the Phase 2 `derived` block) are unchanged vs. a Phase-2 baseline.

## 5. Verify & commit

- [x] 5.1 `bun test` — all pass, including the new comparison tests.
- [x] 5.2 `bunx tsc --noEmit` — clean.
- [x] 5.3 Smoke run: `bun run src/index.tsx src/evidence.ts` — app launches, multiple authors
  populate, and lens output is unchanged vs. before (no consumer cites `relativeToFile` yet).
- [x] 5.4 Commit: `feat: compare authors against file-level medians, ranks, percentiles`
  (no AI attribution per project + global rules).
