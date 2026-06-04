## 1. Types (`src/types.ts`)

- [x] 1.1 Add `minuteLocal: number` to `EvidenceCommit`, and the provenance fields
  `committerDiverged: boolean`, `landDelayMinutes: number | null` (and keep `isAmend` but
  now genuinely derived), plus per-commit `isFixup: boolean` and
  `subjectChurnMismatch: "trivial-large" | "sweeping-tiny" | null`.
- [x] 1.2 Add `ageDays: number` to `BlamedLineEvidence`.
- [x] 1.3 Add a `DerivedSignals` interface and an `AuthorEvidence.derived: DerivedSignals`
  field. `DerivedSignals` carries: `sessionCount`, `longestSessionMinutes`,
  `longestSessionCommits`, `latestEndingHourLocal`, `avgCommitsPerSession`, `nightOwlRatio`,
  `weekendRatio`, `fixupChainCount`, `fixupCommitCount`, `oldestLineAgeDays`,
  `newestLineAgeDays`, and a `codeScan` object (todos/fixmes/hacks, exclamations,
  allCapsTokens, magicNumbers, maxNestingDepth, maxLineLength, profanity). Comment each
  field in the file's existing style.

## 2. Constants & minute precision (`src/evidence.ts`)

- [x] 2.1 Add named constants at the top: `SESSION_GAP_MINUTES = 90`,
  `NIGHT_HOURS` window (22–4), churn thresholds `CHURN_LARGE = 300` / `CHURN_TINY = 10`, and
  the trivial / sweeping / fixup / profanity regex/wordlists.
- [x] 2.2 Extend `localParts` to also return `minute`; set `minuteLocal` in
  `toEvidenceCommits` (existing `hourLocal` / `weekday` behavior unchanged).

## 3. Derived signal functions (`src/evidence.ts`, pure + exported)

- [x] 3.1 `clusterSessions(commits)` → session summary (count, longest minutes, longest
  commit count, latest-ending local hour, avg commits/session) using
  `minutesSincePrevious` and `SESSION_GAP_MINUTES`.
- [x] 3.2 `temporalRatios(commits)` → `{ nightOwlRatio, weekendRatio }` in [0, 1], `0` when
  there are no commits.
- [x] 3.3 `classifyChurnMismatch(message, additions, deletions)` → the
  `subjectChurnMismatch` value via the trivial/sweeping regexes and churn thresholds.
- [x] 3.4 `markFixups(commits)` → set per-commit `isFixup`; `countFixupChains(commits)` →
  `{ fixupChainCount, fixupCommitCount }` (chains are maximal runs of length ≥ 2).
- [x] 3.5 `lineAgeDays(authorTime, now)` → non-negative days, one-decimal rounded.
- [x] 3.6 `scanCode(codeLines)` → the `codeScan` counts (annotations, sentiment, shape).
- [x] 3.7 `commitProvenance(commit)` → `{ committerDiverged, landDelayMinutes, isAmend }`
  from the Phase 1 committer fields (identity compared by mail then name; `isAmend`
  heuristic = same identity & later committer date), replacing the `isAmend: false` stub.

## 4. Wire into the build (`src/evidence.ts`)

- [x] 4.1 Thread an optional `now: number` (unix ms) param through `buildAuthorEvidence`
  (default to current time only at that boundary) and into `lineAgeDays`.
- [x] 4.2 Populate the new per-commit fields in `toEvidenceCommits` (minute, provenance,
  fixup flag, churn mismatch) and the per-line `ageDays` in `buildAuthorEvidence`.
- [x] 4.3 Assemble `DerivedSignals` per author and set `AuthorEvidence.derived`.
- [x] 4.4 Pass a single captured `now` from `src/index.tsx` into `buildAuthorEvidence`.

## 5. Tests (`src/evidence.test.ts`)

- [x] 5.1 Add the new `EvidenceCommit` / `BlamedLineEvidence` / `RawCommit` fields to the
  test factories with safe defaults.
- [x] 5.2 Unit-test each new pure function against the scenarios in the
  `evidence-aggregates` spec: minute precision, session split/single-commit/latest-ending,
  night-owl & weekend ratios (incl. zero-commit author), churn mismatch (both directions +
  null), fixup chain vs isolated fixup, line age with fixed `now`, code scans (incl. empty),
  and provenance (divergence / amend heuristic / coincident).
- [x] 5.3 Add a determinism test: `buildAuthorEvidence` with a fixed `now` returns identical
  output across two calls, and pre-existing fields are unchanged vs. a Phase-1 baseline.

## 6. Verify & commit

- [x] 6.1 `bun test` — all pass, including the new derived-signal tests.
- [x] 6.2 `bunx tsc --noEmit` — clean.
- [x] 6.3 Smoke run: `bun run src/index.tsx src/evidence.ts` — app launches, authors
  populate, and lens output is unchanged vs. before (no consumer cites `derived` yet).
- [x] 6.4 Commit: `feat: derive coding sessions, ratios, churn, fixups, and provenance`
  (no AI attribution per project + global rules).
