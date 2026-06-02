# Phase 1: OpenTUI Shell - Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.08 (gate: <= 0.20)
**Requirements:** 4 locked

## Goal

A user can run the app and see a stable three-pane terminal shell with basic keyboard handling and no git analysis yet.

## Background

The repo currently contains a generated OpenTUI React starter in `src/index.tsx` that renders static centered placeholder text. No three-pane layout, focus model, or keymap exists.

## Requirements

1. **Three-pane shell**: The UI displays source, authors, and analysis panes at startup.
   - Current: `src/index.tsx` renders a single centered placeholder.
   - Target: App renders three bordered panes with approximate 60/20/20 horizontal allocation.
   - Acceptance: Running the app shows all three panes simultaneously without needing git data.

2. **Focus cycle**: Tab cycles focus between panes.
   - Current: No focus state exists.
   - Target: App tracks the focused pane and visibly distinguishes it.
   - Acceptance: Pressing Tab repeatedly cycles through source, authors, and analysis focus states.

3. **Quit key**: `q` exits the app.
   - Current: No custom quit key exists.
   - Target: Pressing `q` cleanly exits the TUI.
   - Acceptance: Pressing `q` returns control to the shell without an unhandled error.

4. **Registered perspective hotkeys**: Hotkeys `1`, `2`, `3`, and `4` are recognized but do not trigger analysis yet.
   - Current: No hotkey handling exists.
   - Target: Hotkeys update active perspective state or are wired as no-op handlers.
   - Acceptance: Pressing `1`-`4` does not crash and can be observed through state/debug UI or tests.

## Boundaries

**In scope:**
- Three static pane layout.
- Basic focus state and Tab behavior.
- Quit behavior.
- Placeholder perspective hotkey registration.

**Out of scope:**
- Git file loading - Phase 2 owns it.
- Author list and selection - Phase 3 owns it.
- AI analysis - Phase 5 owns it.
- Visual polish beyond readable pane boundaries - Phase 7 owns it.

## Constraints

- Preserve the existing Bun/OpenTUI scaffold.
- Do not add app dependencies unless required for keyboard/layout behavior.
- Keep the first slice runnable and demonstrable without git or network access.

## Acceptance Criteria

- [ ] App starts with `bun dev` and renders three panes.
- [ ] Tab cycles focus between the panes.
- [ ] `q` exits cleanly.
- [ ] Hotkeys `1`-`4` are registered without triggering model calls.

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|-----------|-------|-----|--------|-------|
| Goal Clarity | 0.95 | 0.75 | met | Static shell behavior is explicit |
| Boundary Clarity | 0.92 | 0.70 | met | No git or AI in this phase |
| Constraint Clarity | 0.82 | 0.65 | met | Bun/OpenTUI scaffold preserved |
| Acceptance Criteria | 0.86 | 0.70 | met | Four pass/fail checks |
| **Ambiguity** | 0.08 | <=0.20 | met | Imported from DESIGN.md |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| import | Design import | What is the first demonstrable artifact? | Three empty panes, focus, and no-op hotkeys |

---
*Phase: GT-01-opentui-shell*
*Spec created: 2026-06-02*
*Next step: $gsd-discuss-phase 1 - implementation decisions*
