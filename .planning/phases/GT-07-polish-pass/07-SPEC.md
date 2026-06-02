# Phase 7: Polish Pass - Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.14 (gate: <= 0.20)
**Requirements:** 4 locked

## Goal

The core two-perspective demo is readable, resilient, and visually aligned with the deadpan `git blame` aesthetic.

## Background

After Phase 6, the tool should work but may still lack highlight polish, loading/error clarity, retry behavior, and final color choices. This phase makes the experience reliable enough before adding more perspectives.

## Requirements

1. **Selected line highlighting**: Source lines for selected authors are highlighted.
   - Current: Selection affects author pane and analysis only.
   - Target: Source pane subtly highlights lines belonging to selected author(s).
   - Acceptance: Toggling an author visibly changes that author's source lines.

2. **Loading state**: Analysis pane clearly shows active perspective while streaming.
   - Current: Basic analyzing state may exist from Phase 5.
   - Target: Loading state includes perspective name and does not obscure existing panes.
   - Acceptance: During a stream, user can identify which perspective is being analyzed.

3. **Error and retry**: Model failures show a visible error state and retry path.
   - Current: Failure handling is not fully defined.
   - Target: Analysis pane reports failure and offers a retry key.
   - Acceptance: Simulated model failure renders error UI; pressing retry starts a new stream.

4. **Deadpan visual polish**: Colors and styling mirror a restrained blame-like forensic tool.
   - Current: Visual choices may be default/rough.
   - Target: Styling is readable, subdued, and avoids joke-like presentation.
   - Acceptance: UI remains legible and the report tone stays clinical.

## Boundaries

**In scope:**
- Line highlighting.
- Loading state.
- Error and retry.
- Color and spacing polish.

**Out of scope:**
- Adding new perspectives - Phase 8.
- README/demo docs - Phase 9.
- Major layout redesign - preserve three-pane structure.

## Constraints

- Do not undermine the straight-faced forensic tone.
- Keep panes always visible.
- Retry should re-use the current author selection and perspective.

## Acceptance Criteria

- [ ] Selected author lines highlight in source pane.
- [ ] Loading state names the active perspective.
- [ ] Simulated model failure shows an error state.
- [ ] Retry starts a fresh stream after failure.
- [ ] Visual style remains readable and restrained.

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|-----------|-------|-----|--------|-------|
| Goal Clarity | 0.82 | 0.75 | met | Polish items are listed |
| Boundary Clarity | 0.86 | 0.70 | met | No new perspectives |
| Constraint Clarity | 0.76 | 0.65 | met | Tone constraint is explicit |
| Acceptance Criteria | 0.78 | 0.70 | met | Error/retry can be simulated |
| **Ambiguity** | 0.14 | <=0.20 | met | Imported from DESIGN.md |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| import | Design import | What polish matters before more prompts? | Highlighting, loading, errors, retry, subdued color |

---
*Phase: GT-07-polish-pass*
*Spec created: 2026-06-02*
*Next step: $gsd-discuss-phase 7 - implementation decisions*
