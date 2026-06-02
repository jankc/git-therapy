# Phase 9: Demo Prep - Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.13 (gate: <= 0.20)
**Requirements:** 3 locked

## Goal

The project has a one-page README and a reliable demo target that supports the 90-second talk arc.

## Background

After Phase 8, all product behavior should exist. The remaining work is packaging the demo so the tool can be presented reliably on a real file with meaningful author/perspective changes.

## Requirements

1. **One-page README**: README explains premise, install, run, and controls.
   - Current: README is the generated Bun/OpenTUI starter.
   - Target: README describes git-therapy and how to run the demo.
   - Acceptance: A new developer can read README and run the tool against a file.

2. **Demo target**: Demo notes identify a repo/file that produces reliable output.
   - Current: No target repo/file is selected.
   - Target: Notes document the chosen target and why it works.
   - Acceptance: Running the documented command produces multiple authors or otherwise good perspective output.

3. **Talk arc rehearsal**: Demo flow is documented and repeatable.
   - Current: Talk arc exists only in `DESIGN.md`.
   - Target: README or demo notes list the steps: open, select author, stream, switch perspectives, select second author.
   - Acceptance: A presenter can rehearse the sequence from the docs without guessing.

## Boundaries

**In scope:**
- README rewrite/update.
- Demo target notes.
- Rehearsal command and flow.

**Out of scope:**
- Product feature additions.
- Export/share flows.
- Deterministic cache unless rehearsal proves live reliability is inadequate.

## Constraints

- Demo docs should stay short and practical.
- Any deterministic mode remains optional and should not be added unless needed after rehearsal.

## Acceptance Criteria

- [ ] README includes premise, install, run, and controls.
- [ ] Demo target file/repo is documented.
- [ ] Demo flow follows the six-step talk arc from `DESIGN.md`.
- [ ] No new product scope is introduced during demo prep.

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|-----------|-------|-----|--------|-------|
| Goal Clarity | 0.86 | 0.75 | met | Demo prep outputs are concrete |
| Boundary Clarity | 0.84 | 0.70 | met | No product features |
| Constraint Clarity | 0.78 | 0.65 | met | Determinism deferred unless needed |
| Acceptance Criteria | 0.82 | 0.70 | met | Docs and rehearsal checks are pass/fail |
| **Ambiguity** | 0.13 | <=0.20 | met | Imported from DESIGN.md |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| import | Design import | What makes the project demo-ready? | One-page README plus reliable target and talk arc |

---
*Phase: GT-09-demo-prep*
*Spec created: 2026-06-02*
*Next step: $gsd-discuss-phase 9 - implementation decisions*
