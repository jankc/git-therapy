# Phase 1: OpenTUI Shell - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the first runnable terminal shell for git-therapy: three always-visible panes, a visible focus cycle, clean quit behavior, and registered no-op perspective hotkeys. It does not load git data, list real authors, run AI analysis, or add later visual polish.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**4 requirements are locked.** See `01-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `01-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Three static pane layout.
- Basic focus state and Tab behavior.
- Quit behavior.
- Placeholder perspective hotkey registration.

**Out of scope (from SPEC.md):**
- Git file loading - Phase 2 owns it.
- Author list and selection - Phase 3 owns it.
- AI analysis - Phase 5 owns it.
- Visual polish beyond readable pane boundaries - Phase 7 owns it.

</spec_lock>

<decisions>
## Implementation Decisions

### Pane Content and Labels
- **D-01:** Use `What`, `Who`, and `Why` as the three pane titles. These map to source/blame, author selection, and analysis without making Phase 1 feel busy.
- **D-02:** Use deadpan empty-state body copy:
  - `What`: `No file under examination`
  - `Who`: `No suspects identified`
  - `Why`: `No theory formed`
- **D-03:** Omit active perspective text entirely in Phase 1. Perspective labels and analysis state belong to later analysis phases.
- **D-04:** Do not show counts or status hints such as `0 lines`, `0 authors`, or `idle`. Keep the empty shell clean.

### the agent's Discretion
- **D-05:** For areas not explicitly discussed, choose the cleanest minimal implementation that preserves core functionality.
- **D-06:** Focus indication should be minimal but unambiguous: visually distinguish the focused pane from the other panes using the smallest available OpenTUI styling change, such as border/title emphasis or a simple focus marker. Avoid animation, decorative styling, or Phase 7 polish work.
- **D-07:** Hotkeys `1`, `2`, `3`, and `4` should be registered as inert handlers in Phase 1. They must not trigger model calls, analysis state, or visible perspective UI. Verification can rely on source assertions and manual no-crash behavior.
- **D-08:** Do not add a keymap footer or status line in Phase 1. The first shell should consist of the three panes only; later phases can introduce hotkey affordances when the controls affect real data or analysis.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/phases/GT-01-opentui-shell/01-SPEC.md` — Locked Phase 1 requirements, boundaries, and acceptance criteria.
- `.planning/ROADMAP.md` — Phase ordering, Phase 1 goal, and the required two-plan split.
- `.planning/REQUIREMENTS.md` — Requirement IDs `CLI-03`, `TUI-01`, and `TUI-05`.

### Product Context
- `.planning/PROJECT.md` — Core value, v1 constraints, and demo posture.
- `.planning/STATE.md` — Current project position and accumulated decisions.

### Codebase Context
- `.planning/codebase/STACK.md` — Bun, React, and OpenTUI runtime constraints.
- `.planning/codebase/STRUCTURE.md` — Current source layout and where new code should go.
- `.planning/codebase/CONVENTIONS.md` — Formatting, naming, and module conventions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/index.tsx` currently contains the entire OpenTUI React app and renderer bootstrap. Phase 1 should preserve this scaffold and evolve it rather than reinitializing the project.
- OpenTUI JSX primitives already in use include `<box>`, `<text>`, and `<ascii-font>`. The new pane shell should use existing OpenTUI/React primitives before introducing any dependency.

### Established Patterns
- Source uses two-space indentation, double-quoted imports/strings, semicolons, and a compact executable `index.tsx`.
- Renderer setup uses top-level `await createCliRenderer()` followed by `createRoot(renderer).render(<App />)`.
- No test framework or feature-module layout exists yet, so any extraction should be minimal and justified by readability or testability.

### Integration Points
- `App` in `src/index.tsx` is the root UI component to replace with the three-pane shell.
- `createCliRenderer()` is the likely point for terminal input/quit integration if OpenTUI exposes key handling there.
- `package.json` currently runs `bun run --watch src/index.tsx` through `bun dev`; Phase 1 should remain runnable through that script.

</code_context>

<specifics>
## Specific Ideas

The shell copy should feel deadpan and clinical, but not jokey. The selected labels are intentionally short:

- `What` asks what file/source is under examination.
- `Who` asks which author is implicated.
- `Why` reserves the analysis pane for later forensic interpretation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-OpenTUI Shell*
*Context gathered: 2026-06-02*
