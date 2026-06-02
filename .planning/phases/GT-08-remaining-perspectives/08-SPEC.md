# Phase 8: Remaining Perspectives - Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.12 (gate: <= 0.20)
**Requirements:** 4 locked

## Goal

Context & circumstances and Hidden narratives perspectives are available through hotkeys `3` and `4`, with Hidden using a narrative renderer.

## Background

After Phase 7, Mental and Skill perspectives work with metric bars. The final perspective set needs a third metric-bar prompt and a fourth intentionally different narrative output shape.

## Requirements

1. **Context perspective**: Registry includes Context & circumstances on hotkey `3`.
   - Current: Context perspective does not exist.
   - Target: Prompt asks for Time pressure, On-a-call probability, Day-before-vacation energy, Resignation-coding score, and Manager-standing-behind-them score.
   - Acceptance: Pressing `3` streams those metrics with evidence.

2. **Hidden perspective**: Registry includes Hidden narratives on hotkey `4`.
   - Current: Hidden perspective does not exist.
   - Target: Prompt returns the four narrative sections from `DESIGN.md`.
   - Acceptance: Pressing `4` streams Hidden analysis for the selected author.

3. **Narrative renderer**: Hidden output renders narrative sections, not metric bars.
   - Current: Only metric renderer exists.
   - Target: `NarrativeBlock` renders section headings and text progressively.
   - Acceptance: Hidden output does not display metric bars and includes all four section headings.

4. **Footer completion**: Analysis footer shows all four hotkeys and labels.
   - Current: Footer may show only implemented perspectives.
   - Target: Footer lists Mental, Skill, Context, and Hidden.
   - Acceptance: User can see all perspective hotkeys in the UI.

## Boundaries

**In scope:**
- Context metric perspective.
- Hidden narrative perspective.
- Narrative renderer.
- Complete perspective footer.

**Out of scope:**
- Provider/model switching UX.
- Narrative deterministic cache.
- Additional perspectives beyond the four specified.

## Constraints

- Context uses metric-bar output.
- Hidden intentionally uses a different output shape.
- All prompts still require specific evidence and JSON-only structured output.

## Acceptance Criteria

- [ ] Hotkey `3` streams Context metrics.
- [ ] Hotkey `4` streams Hidden narratives.
- [ ] Hidden renderer displays narrative sections instead of metric bars.
- [ ] All four hotkeys are visible in the footer.
- [ ] Each perspective uses the same AuthorEvidence input.

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|-----------|-------|-----|--------|-------|
| Goal Clarity | 0.88 | 0.75 | met | Two remaining perspectives are named |
| Boundary Clarity | 0.87 | 0.70 | met | No extra perspectives |
| Constraint Clarity | 0.84 | 0.65 | met | Renderer split is intentional |
| Acceptance Criteria | 0.81 | 0.70 | met | Hotkey and renderer checks are clear |
| **Ambiguity** | 0.12 | <=0.20 | met | Imported from DESIGN.md |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| import | Design import | How do the last two prompts differ? | Context uses bars; Hidden uses narrative sections |

---
*Phase: GT-08-remaining-perspectives*
*Spec created: 2026-06-02*
*Next step: $gsd-discuss-phase 8 - implementation decisions*
