# Phase 2: Git Blame Parser - Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.09 (gate: <= 0.20)
**Requirements:** 4 locked

## Goal

The app accepts a file path or line range, parses real `git blame --line-porcelain` output, and renders blame-prefixed source lines.

## Background

The current app does not parse CLI arguments, inspect files, or call git. The design requires the left pane to mirror `git blame` with short SHA, author, date, and scoped source text.

## Requirements

1. **File invocation**: User can run `git-therapy <path>`.
   - Current: No CLI scope parsing exists.
   - Target: Runtime receives and validates a repo-relative or filesystem file path.
   - Acceptance: Launching with an existing tracked file loads that file's scoped lines.

2. **Line range invocation**: User can run `git-therapy <path>:<start>-<end>`.
   - Current: No range syntax exists.
   - Target: Parser extracts file path plus inclusive line range.
   - Acceptance: Launching with `src/index.tsx:1-5` renders only lines 1 through 5.

3. **Blame parser**: App parses `git blame --line-porcelain` into typed line records.
   - Current: No git parser exists.
   - Target: `src/git/blame.ts` returns typed records including source line number, SHA, author, date, and text.
   - Acceptance: Parser handles porcelain output from a real tracked file and returns one record per scoped line.

4. **Source pane rendering**: Source pane renders blame prefix plus code text.
   - Current: Source pane is only a placeholder from Phase 1.
   - Target: Each displayed line includes short SHA, author, date, and source text.
   - Acceptance: Source pane output visibly resembles `git blame` for the selected file.

## Boundaries

**In scope:**
- CLI path/range parsing.
- `simple-git` setup if needed for this phase.
- `git blame --line-porcelain` parsing.
- Source pane real blame rendering.

**Out of scope:**
- Author selection UI - Phase 3.
- Commit history and aggregates - Phase 4.
- AI analysis - Phase 5.
- Repo-wide analysis - v2.

## Constraints

- Use real git evidence, not mocked line ownership, for the runtime path.
- Parser should be unit-testable with captured porcelain text.
- Keep output scoped to a single file and optional line range.

## Acceptance Criteria

- [ ] `git-therapy <path>` loads blame lines for a tracked file.
- [ ] `git-therapy <path>:<start>-<end>` limits displayed lines to the inclusive range.
- [ ] Blame parser returns typed line records from porcelain output.
- [ ] Source pane renders short SHA, author, date, and source text per line.

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|-----------|-------|-----|--------|-------|
| Goal Clarity | 0.93 | 0.75 | met | Invocation and parser output are concrete |
| Boundary Clarity | 0.90 | 0.70 | met | Commit history deferred |
| Constraint Clarity | 0.84 | 0.65 | met | Single-file real git evidence |
| Acceptance Criteria | 0.86 | 0.70 | met | CLI and parser checks are pass/fail |
| **Ambiguity** | 0.09 | <=0.20 | met | Imported from DESIGN.md |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| import | Design import | What must the first git slice prove? | Real blame data rendered in the left pane |

---
*Phase: GT-02-git-blame-parser*
*Spec created: 2026-06-02*
*Next step: $gsd-discuss-phase 2 - implementation decisions*
