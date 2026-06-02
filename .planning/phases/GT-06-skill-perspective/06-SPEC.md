# Phase 6: Skill Perspective - Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.09 (gate: <= 0.20)
**Requirements:** 3 locked

## Goal

Hotkey `2` switches from Mental to Skill & experience and triggers a fresh stream for the same selected author evidence.

## Background

After Phase 5, one perspective works end to end. The demo cut line requires proving that the same input can be reinterpreted by changing the prompt and schema entry.

## Requirements

1. **Skill perspective registration**: Registry includes Skill & experience.
   - Current: Only Mental perspective exists.
   - Target: Skill entry includes hotkey `2`, metric schema, prompt, and `metrics` renderer.
   - Acceptance: Registry exposes both Mental and Skill entries.

2. **Skill metric set**: Skill prompt asks for the design-specified metrics.
   - Current: No Skill prompt exists.
   - Target: Metrics are Inferred years of experience, Prior-language tells, Docs-read probability, Stack Overflow ratio, and Understanding-vs-passing-tests ratio.
   - Acceptance: Prompt/schema expects those metric names and evidence citations.

3. **Fresh re-stream on perspective switch**: Switching perspective clears old analysis and starts a new stream.
   - Current: No multi-perspective switching exists.
   - Target: Hotkey `1` selects Mental, hotkey `2` selects Skill, and switching triggers a fresh model call.
   - Acceptance: The analysis pane shows the new perspective's analyzing state and does not reuse cached v1 results.

## Boundaries

**In scope:**
- Skill perspective prompt/schema.
- Hotkey `1` and `2` active switching.
- Fresh stream behavior.

**Out of scope:**
- Context and Hidden perspectives - Phase 8.
- Mid-session provider/model switching - open question after the cut line.
- Caching prior results - v2.

## Constraints

- This phase is the minimum talk cut line.
- The same selected author evidence must feed both Mental and Skill perspectives.
- No cache should be introduced for v1.

## Acceptance Criteria

- [ ] Registry contains Mental and Skill perspectives.
- [ ] Hotkey `1` selects Mental.
- [ ] Hotkey `2` selects Skill.
- [ ] Switching perspective triggers a fresh stream and clears previous result state.
- [ ] Skill prompt uses the specified metrics and evidence requirements.

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|-----------|-------|-----|--------|-------|
| Goal Clarity | 0.94 | 0.75 | met | Cut-line behavior is explicit |
| Boundary Clarity | 0.91 | 0.70 | met | Other perspectives deferred |
| Constraint Clarity | 0.84 | 0.65 | met | No v1 cache constraint |
| Acceptance Criteria | 0.86 | 0.70 | met | Hotkey and stream behavior are verifiable |
| **Ambiguity** | 0.09 | <=0.20 | met | Imported from DESIGN.md |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| import | Design import | What is enough for the talk if polish slips? | Mental plus Skill with hotkey re-streaming |

---
*Phase: GT-06-skill-perspective*
*Spec created: 2026-06-02*
*Next step: $gsd-discuss-phase 6 - implementation decisions*
