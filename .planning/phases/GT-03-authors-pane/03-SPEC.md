# Phase 3: Authors Pane - Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.08 (gate: <= 0.20)
**Requirements:** 3 locked

## Goal

The authors pane derives contributors from blame data, shows their line-count share, and supports keyboard single-author selection.

## Background

After Phase 2, the app has typed blame lines in the source pane. It still needs the middle pane to summarize who touched the scope and let the user choose one author for later analysis.

## Requirements

1. **Author derivation**: Authors are derived from scoped blame lines.
   - Current: No author model exists.
   - Target: App groups blame records by author identity.
   - Acceptance: A scoped file with N unique authors displays N author rows.

2. **Line share display**: Each author row shows line-count share.
   - Current: Authors pane is static/empty.
   - Target: Row displays authored line count and percentage of scoped lines.
   - Acceptance: Percentages sum to approximately 100% for all displayed authors.

3. **Keyboard selection**: User can move cursor with Up/Down and select the highlighted author with Space or Enter.
   - Current: Focus exists but no author cursor/selection.
   - Target: Authors pane tracks cursor and one selected author.
   - Acceptance: Pressing Space or Enter selects the highlighted author and replaces the previous selection.

## Boundaries

**In scope:**
- Author grouping from blame lines.
- Line counts and percentages.
- Up/Down cursor movement.
- Space or Enter single-select.

**Out of scope:**
- Triggering AI analysis - Phase 5.
- Highlighting source lines for the selected author - Phase 7.
- Comparing multiple authors side by side - v2/deferred.

## Constraints

- Selection is single-author only; the demo can move from one author to another to re-run the same perspective.
- Author identity should preserve name and email when available from blame data.

## Acceptance Criteria

- [ ] Authors pane lists each scoped author.
- [ ] Author rows include line-count share.
- [ ] Up/Down changes the cursor row.
- [ ] Space or Enter selects the highlighted author and replaces the prior selection.

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|-----------|-------|-----|--------|-------|
| Goal Clarity | 0.94 | 0.75 | met | Pane behavior is explicit |
| Boundary Clarity | 0.91 | 0.70 | met | AI and highlighting deferred |
| Constraint Clarity | 0.80 | 0.65 | met | Single-select required |
| Acceptance Criteria | 0.87 | 0.70 | met | Keyboard behavior is testable |
| **Ambiguity** | 0.08 | <=0.20 | met | Imported from DESIGN.md |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| import | Design update | What does the middle pane do? | Author share list plus cursor and single-select |

---
*Phase: GT-03-authors-pane*
*Spec created: 2026-06-02*
*Next step: $gsd-discuss-phase 3 - implementation decisions*
