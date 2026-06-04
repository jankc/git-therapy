## Context

Phase 1 (`gt001-enrich-evidence-data-capture`) shipped richer raw fields on `RawCommit`
(`body`, committer name/mail/date, `coAuthors`, `aiAssistTrailers`, `renamedFrom`). They
are captured but unused — `src/evidence.ts` still folds only the original fields into
`AuthorEvidence`, and `EvidenceCommit.isAmend` is hard-stubbed to `false`. Every lens that
wants behavioral signal (night-owl tendencies, churn-vs-claim mismatch, fixup spirals) must
re-derive it from raw arrays at inference time — wasteful in tokens and unreliable, since
LLMs do arithmetic over JSON arrays badly.

`evidence.ts` is already a collection of small, pure, exported functions (`compactRanges`,
`localParts`, `wordFrequencies`, `bucketByAuthor`) each unit-tested. This phase follows that
same grain: every new signal is a pure function with its own test, composed into the build.

## Goals / Non-Goals

**Goals:**
- Precompute sharp, citable behavioral aggregates so lenses can quote a number instead of
  estimating one.
- Keep all derivation **pure and deterministic** — including time-relative signals (line
  age), by threading a single captured `now`.
- Replace the stubbed `isAmend: false` and add committer-divergence / land-delay signals
  derived from the Phase 1 committer fields.
- Add minute precision to `localParts` and `EvidenceCommit`.

**Non-Goals:**
- Any cross-author comparison or ranking — that is Phase 3 (`gt003-enrich-evidence-cross-author`).
- Any prompt or lens schema change to *consume* these signals — that is Phase 4
  (`gt004-enrich-evidence-prompts-lenses`). This phase only produces the data.
- Reflog-grade amend detection. `isAmend` stays a documented heuristic (see Risks).

## Decisions

- **A `derived` block, not overloaded baseline.** `AuthorBaseline` is documented as
  "background context only"; the new author-level signals are foreground evidence. Add a new
  `DerivedSignals` interface on `AuthorEvidence.derived` rather than swelling
  `AuthorBaseline`. Per-commit signals extend `EvidenceCommit`; the per-line age extends
  `BlamedLineEvidence`. This keeps raw aggregates and derived signals visibly separate and
  matches the new capability name `evidence-aggregates`.

- **Thread `now` for purity.** Line age and land-delay-from-now are time-relative. Rather
  than calling `Date.now()` inside the aggregators (which would make them untestable and
  non-deterministic), `buildAuthorEvidence` gains an optional `now: number` (unix ms) param,
  captured once at the call site in `index.tsx`, defaulting to the current time only at that
  boundary. All derived functions take `now` explicitly; tests pass a fixed value.

- **`localParts` returns `minute`.** Extend the return to `{ weekday, hour, minute }` using
  the same offset-shift it already does for `hour`. `EvidenceCommit` gains `minuteLocal`.
  Existing callers ignore the extra field; no behavior change to `hourLocal`/`weekday`.

- **Session clustering.** Over an author's commits sorted ascending by time, start a new
  session whenever `minutesSincePrevious` is `null` or `> 90`. Per author surface:
  `sessionCount`, `longestSessionMinutes`, `longestSessionCommits`,
  `latestEndingHourLocal`, and `avgCommitsPerSession`.

- **Temporal ratios as scalars.** `nightOwlRatio` = share of commits with `hourLocal` in
  [22, 23] ∪ [0, 4]; `weekendRatio` = share with weekday Saturday/Sunday. Both in [0, 1],
  computed over the author's blamed commits, `0` when there are none.

- **Subject ↔ churn mismatch.** Per commit, classify the subject as "trivial" if it matches
  `/\b(tweak|minor|nit|typo|small|tiny|cleanup|polish|wip)\b/i` and as "sweeping" if it
  matches `/\b(refactor|rewrite|overhaul|migrate|rework|massive|huge)\b/i`. Flag
  `subjectChurnMismatch`: `"trivial-large"` when trivial wording carries
  `additions + deletions >= 300`; `"sweeping-tiny"` when sweeping wording carries
  `additions + deletions <= 10`; else `null`.

- **Fixup chains.** A commit is a fixup if its subject matches
  `/\b(fix|fixup|oops|typo|revert|nvm|nevermind|actually|whoops|argh)\b/i`. Mark per-commit
  `isFixup`; surface author-level `fixupChainCount` = number of maximal runs of length ≥ 2
  consecutive fixup commits (the spiral signal), and `fixupCommitCount` overall.

- **Line age / survival.** Per blamed line, `ageDays` = `(now/1000 - authorTime) / 86400`,
  rounded to one decimal, floored at 0. Surfaced on `BlamedLineEvidence`; author-level
  `oldestLineAgeDays` / `newestLineAgeDays` summarize the spread.

- **In-code scans over blamed `code`.** A single pure `scanCode(lines)` over the author's
  blamed line text returns counts: `todos` / `fixmes` / `hacks`
  (`/\bTODO\b/`, `/\bFIXME\b/`, `/\bHACK\b|\bXXX\b/`), `exclamations` (`!` not part of `!=`),
  `allCapsTokens` (run of ≥ 3 uppercase letters, excluding common constants test), and code
  shape: `magicNumbers` (numeric literals other than 0/1/-1 outside obvious contexts),
  `maxNestingDepth` (max leading-indent depth seen), and `maxLineLength`. Profanity is a
  small fixed wordlist count, kept conservative. All are counts on `DerivedSignals.codeScan`.

- **Commit provenance signals.** From Phase 1 committer fields, per commit derive:
  `committerDiverged` (committer identity ≠ author identity, comparing mail then name),
  `landDelayMinutes` (`committerDate − isoDate` in whole minutes, `null` if equal/unparsable),
  and `isAmend` — heuristic: same identity **and** a non-zero `landDelayMinutes`, i.e. the
  author re-committed their own work later. Documented as a heuristic, replacing the stub.

- **Composition mirrors the file.** Each signal is its own exported pure function
  (`clusterSessions`, `temporalRatios`, `classifyChurnMismatch`, `countFixupChains`,
  `lineAgeDays`, `scanCode`, `commitProvenance`), each with a dedicated test, wired together
  inside `toEvidenceCommits` / `buildAuthorEvidence` — the same grain as the existing helpers.

## Risks / Trade-offs

- **`isAmend` remains heuristic.** Same-identity-later-commit catches genuine `--amend` and
  some rebases/cherry-picks of one's own work; it cannot distinguish them without reflog
  (unavailable from `git log`). Accepted: it is strictly better than the constant `false`,
  and the divergence/land-delay scalars give lenses the raw signal to reason from.

- **Threading `now` changes the `buildAuthorEvidence` signature.** Mitigated by making it an
  optional trailing param defaulting to the current time; the only production caller
  (`index.tsx`) passes a captured value, and tests pass a fixed one. No `AuthorEvidence`
  consumer downstream is affected by the new param.

- **`AuthorEvidence` shape grows.** This is a deliberate, sequenced edit to the "locked"
  contract: new optional-by-construction fields (`derived`, per-commit, per-line) are added,
  but nothing existing is removed or retyped, so the byte-for-byte lens output is unchanged
  until Phase 4 chooses to cite them. The `evidence.test.ts` factories gain defaults.

- **Heuristic thresholds (90 min, churn 300/10, regex wordlists) are judgement calls.**
  They are centralized as named constants at the top of `evidence.ts` so Phase 4 tuning is a
  one-line change, and each is covered by a boundary test.
