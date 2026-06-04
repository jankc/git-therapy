## Why

Comparative framing is the single highest-signal lever the app isn't using: "commits at
2am 4× more than anyone else in this file" lands far harder — and is more forensically
meaningful — than an absolute number. Every author for the scoped file is already in hand,
so the comparison is essentially free. This is Phase 3 of the 4-phase effort and depends
on the aggregates from Phase 2 (`gt002-enrich-evidence-derived-aggregates`).

## What Changes

- Compute **file-level distributions** (median / spread) across all authors for the key
  aggregates (night-owl ratio, weekend ratio, message length, session intensity, churn,
  etc.).
- Attach **per-author relative stats** to `AuthorEvidence` (e.g. ratio-to-median,
  rank, percentile) so each author's evidence carries how they compare to their peers in
  the same file.
- Restructure `buildAuthorEvidence` into a two-pass build: first collect all authors'
  aggregates, then compute and attach the relative stats. The locked `AuthorEvidence`
  contract gains a `relativeToFile` block.

## Capabilities

### New Capabilities
- `cross-author-comparison`: per-author evidence expressed relative to the other authors of
  the same file (medians, ratios, ranks), enabling comparative claims.

### Modified Capabilities
<!-- None at spec level; introduces a distinct comparison capability. -->

## Impact

- `src/evidence.ts` — two-pass `buildAuthorEvidence`; file-level distribution helpers.
- `src/types.ts` — add `relativeToFile` to `AuthorEvidence`.
- `src/evidence.test.ts` — tests for distribution math and relative-stat attachment.
- Depends on Phase 2 aggregates; consumed by Phase 4 prompts.

## Dependencies

- **Order:** Phase 3 of 4.
- **Depends on:** `gt002-enrich-evidence-derived-aggregates` — compares its aggregates across
  authors (needs the aggregate field names finalized there first).
- **Blocks:** `gt004-enrich-evidence-prompts-lenses`.
- **Status:** ⏳ Proposal only — specs / design / tasks deferred until Phase 2 lands.
