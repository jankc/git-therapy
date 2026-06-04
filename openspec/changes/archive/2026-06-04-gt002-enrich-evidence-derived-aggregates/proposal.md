## Why

Raw git fields are noisy, and LLMs are unreliable at doing arithmetic over JSON arrays —
today every lens must compute its own stats from raw `blamedLines` / `blamedCommits`,
which wastes tokens and produces vague claims. Precomputing sharp, citable aggregates
turns raw data into signal. This is Phase 2 of the 4-phase evidence effort and depends on
the raw fields captured in Phase 1 (`gt001-enrich-evidence-data-capture`).

## What Changes

- Add a derived-signals layer over the per-author evidence (extending `AuthorBaseline` /
  `EvidenceCommit`, or a new `derived` block):
  - **Coding sessions** — cluster commits by `minutesSincePrevious` (gap < ~90 min);
    surface longest session, latest-ending session, commits-per-session.
  - **Night-owl & weekend ratios** as scalars (% commits 22:00–05:00; % Sat/Sun).
  - **Subject ↔ churn mismatch** flags ("minor tweak" with +400/−300, and the inverse).
  - **Fixup chains** — count of sequential `fix|oops|typo|revert|nvm|actually` commits.
  - **Line age / survival** — per blamed line, age in days from `authorTime`.
  - **In-code scans** over blamed `code`: TODO/FIXME/HACK counts, profanity / exclamation
    / ALL-CAPS counts, naming-style ratios, magic-number density, max nesting, line length.
  - **Minute precision** — `localParts` also returns the minute (raw `isoDate` already has
    it).
  - **`isAmend` / committer-divergence / land-delay** booleans, derived from the Phase 1
    committer fields (replaces the stubbed `isAmend: false`).

## Capabilities

### New Capabilities
- `evidence-aggregates`: derived, precomputed behavioral signals over an author's blamed
  lines and commits, designed to be cited directly by the lenses.

### Modified Capabilities
<!-- None at spec level; builds on git-evidence-capture but adds a distinct capability. -->

## Impact

- `src/evidence.ts` — new pure aggregation functions; `localParts` minute; `isAmend` fix.
- `src/types.ts` — extend `AuthorBaseline` / `EvidenceCommit` (or add a `derived` block).
- `src/evidence.test.ts` — unit tests for each new pure function.
- Depends on Phase 1 fields; no prompt changes yet (Phase 4 consumes these).

## Dependencies

- **Order:** Phase 2 of 4.
- **Depends on:** `gt001-enrich-evidence-data-capture` (✅ implemented) — uses its new
  `RawCommit` fields (`body`, committer\*, `coAuthors`, `aiAssistTrailers`, `renamedFrom`).
- **Blocks:** `gt003-enrich-evidence-cross-author`.
- **Status:** ⏳ Proposal only — this is the **next** change to implement. Its specs /
  design / tasks are written just-in-time (Phase 1 is done).
