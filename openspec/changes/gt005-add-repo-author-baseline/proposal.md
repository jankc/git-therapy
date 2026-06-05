## Why

Today the diagnosis sees a person through a single file. Most lenses lean on temporal
signals (sessions, night-owl ratio, sleep debt), but a file the author touched in three
commits is a sample of three — the numbers are noise dressed as measurement. The same
aggregation pipeline that already reduces blame+log to fixed-size signals (`derived`,
`authorBaseline`, `relativeToFile`) can be pointed at the author's **whole-repo history**
without enlarging the prompt: aggregates have fixed cardinality regardless of how many
commits feed them, so a 10,000-commit author and a 50-commit author yield the same-size
blob. This buys the one thing a single file cannot give — a **career baseline to deviate
from** ("on this file they were calmer than usual"), which is the strongest possible
grounding for an evidence-cosplay tool.

## What Changes

- **Second collection pass**: a repo-wide `git log --author=<email> --numstat
  --use-mailmap` gathered in the pre-TUI phase (alongside the existing scoped-file pass,
  ideally in parallel), reduced to a fixed-cardinality **career baseline** per author.
- **Identity resolution**: bucket the repo-wide history through `.mailmap`
  (`--use-mailmap`) so one human's work isn't shattered across work/personal/noreply
  emails — a problem that barely shows in one file but undermines a repo-wide profile.
- **Two-tier evidence**: `AuthorEvidence` additively gains an optional `repoBaseline`
  field (the "career chart") sitting beside the existing scoped "file specimen". The file
  tier is unchanged and remains primary. This follows the gt002/gt003 precedent of
  additively extending `AuthorEvidence`.
- **Deviation-aware lenses**: the per-lens projections gain a `file-vs-career` framing so
  the model can cite how *this file* departs from the author's baseline, rather than
  restating absolute traits.
- **Graceful degradation**: when the repo pass is skipped, fails, or finds no extra
  history, `repoBaseline` is absent and every lens behaves exactly as today.
- **Out of scope** (noted, deferred): repo-wide peer comparison (`relativeToRepo`) and
  agentic thread-following for the Hidden Narratives lens.

## Capabilities

### New Capabilities
- `repo-author-baseline`: collecting an author's whole-repo commit history, resolving
  identity via mailmap, and reducing it to a fixed-cardinality career baseline that sits
  beside the scoped-file evidence as a second tier.

### Modified Capabilities
- `perspective-prompts`: lenses gain a file-vs-career deviation projection, grounding
  output in how the scoped file departs from the author's repo-wide baseline (additive;
  absent-baseline behavior is unchanged).

## Impact

- `src/types.ts` — new `RepoBaseline` type; **additive, optional** `repoBaseline?` field
  on the locked `AuthorEvidence` contract (does not alter any existing field; lenses that
  ignore it are unaffected — same additive pattern as `derived`/`relativeToFile`).
- `src/core/git.ts` — repo-wide, author-scoped, mailmap-resolved log command + parse.
- `src/core/evidence.ts` (or a new `src/core/baseline.ts`) — pure baseline aggregation.
- `src/index.tsx` — run the second collection pass; tolerate failure; thread the result
  into the evidence build.
- `src/ai/perspectives.ts` — baseline-aware per-lens evidence projections.
- `src/ai/llm.ts` — possibly, to surface the new tier in the rendered evidence block.
- `EvidenceCollectionSummary` — optional repo-pass timing/commit-count fields.
- Tests: `git.ts` / `evidence.ts` parse + aggregation, `perspectives.ts` projection.

## Dependencies

- **Order:** Phase 5 of 5 (standalone follow-on to the gt001–gt004 enrichment arc).
- **Depends on:** `gt001-enrich-evidence-data-capture` (✅ implemented),
  `gt002-enrich-evidence-derived-aggregates` (✅ implemented),
  `gt003-enrich-evidence-cross-author` (✅ implemented),
  `gt004-enrich-evidence-prompts-lenses` (✅ implemented) — reuses the `RawCommit`
  capture, the `DerivedSignals` reducers, and the per-lens projection structure.
- **Blocks:** none.
- **Status:** ⏳ Proposal only — specs / design / tasks generated in this change; not yet
  implemented.
