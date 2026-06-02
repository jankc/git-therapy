# Phase 4: Evidence Collector - Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.10 (gate: <= 0.20)
**Requirements:** 3 locked

## Goal

For selected author(s), the app produces the complete `AuthorEvidence` shape required by the LLM prompts.

## Background

After Phase 3, the app knows which lines and authors are selected. It still lacks the broader commit-history evidence needed to ground inferences in timestamps, messages, diff sizes, commit frequency, and code scope.

## Requirements

1. **Commit history collection**: App collects per-author commit history relevant to the selected file scope.
   - Current: No git log integration exists.
   - Target: `src/git/log.ts` returns commits with SHA, timestamp, message, additions, deletions, amend flag, and sequence timing.
   - Acceptance: For a selected author, collector returns at least the commits that authored the selected scoped lines when available.

2. **Aggregate evidence**: App computes per-author aggregates.
   - Current: No aggregate metrics exist.
   - Target: `src/git/evidence.ts` computes total commits, hour histogram, average message length, word frequencies, and time span days.
   - Acceptance: Aggregates are deterministic for a fixed set of commit fixtures.

3. **AuthorEvidence contract**: App emits the exact evidence shape from `DESIGN.md`.
   - Current: No LLM input object exists.
   - Target: Evidence object includes author, linesAuthored, lineRanges, commits, aggregates, and scopeCode.
   - Acceptance: A schema/type check verifies all required fields are present for selected author(s).

## Boundaries

**In scope:**
- `src/git/log.ts` commit history collection.
- `src/git/evidence.ts` aggregation.
- Unit-testable evidence shape.
- Support for multiple selected authors.

**Out of scope:**
- LLM prompts or provider calls - Phase 5.
- Rendering metric bars - Phase 5.
- Repo-wide rollups - v2.

## Constraints

- Every future AI inference depends on this phase's evidence contract.
- Word frequencies must include design-specified signal words such as `fix`, `wip`, `revert`, `actually`, `ugh`, and `finally` when present.
- Evidence must include `scopeCode` with line numbers for the selected scope.

## Acceptance Criteria

- [ ] Commit records include required metadata fields.
- [ ] Aggregates include total commits, hour histogram, message length, word frequencies, and time span days.
- [ ] Evidence includes selected scope code with line numbers.
- [ ] Evidence collector can be tested without rendering the TUI.

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|-----------|-------|-----|--------|-------|
| Goal Clarity | 0.91 | 0.75 | met | AuthorEvidence shape is specified |
| Boundary Clarity | 0.88 | 0.70 | met | AI call deferred |
| Constraint Clarity | 0.86 | 0.65 | met | Evidence fields are explicit |
| Acceptance Criteria | 0.84 | 0.70 | met | Contract can be tested |
| **Ambiguity** | 0.10 | <=0.20 | met | Imported from DESIGN.md |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| import | Design import | What grounds the LLM? | Complete AuthorEvidence shape from blame plus log |

---
*Phase: GT-04-evidence-collector*
*Spec created: 2026-06-02*
*Next step: $gsd-discuss-phase 4 - implementation decisions*
