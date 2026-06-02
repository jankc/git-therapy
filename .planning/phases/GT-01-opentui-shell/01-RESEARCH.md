---
phase: 01
slug: opentui-shell
created: 2026-06-02
status: complete
sources: local-codebase
---

# Phase 01: OpenTUI Shell - Research

## Research Question

What does the executor need to know to plan the first runnable OpenTUI shell well?

## Inputs Reviewed

- `.planning/phases/GT-01-opentui-shell/01-SPEC.md`
- `.planning/phases/GT-01-opentui-shell/01-CONTEXT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/CONVENTIONS.md`
- `src/index.tsx`
- `package.json`
- `tsconfig.json`
- Installed OpenTUI package declarations and README examples under `node_modules/@opentui/*`

## Implementation Findings

### Current Scaffold

The whole application currently lives in `src/index.tsx`. It imports `createCliRenderer` and `TextAttributes` from `@opentui/core`, imports `createRoot` from `@opentui/react`, defines a stateless `App`, creates the renderer with top-level `await createCliRenderer()`, then mounts `<App />`.

Phase 1 should preserve that executable shape. A small local `Pane` component and a `PANE_DEFS` array are enough for this phase. New feature directories are premature until Phase 2 introduces git parsing or Phase 5 introduces the perspective registry.

### OpenTUI Layout API

The installed React component types expose `<box>` with `title`, `border`, `borderStyle`, `borderColor`, `focusedBorderColor`, `focusable`, `gap`, and flex-style layout properties through the `style` prop. README examples use:

- `style={{ border: true, padding: 2, flexDirection: "column", gap: 1 }}`
- child boxes with `title`, `width`, `height`, and `focused`

For Phase 1, the safest layout is a root horizontal box with three bordered child boxes:

- `What`: source/blame placeholder, approximately 60 percent width
- `Who`: authors placeholder, approximately 20 percent width
- `Why`: analysis placeholder, approximately 20 percent width

Because this is a terminal UI and exact percentages may vary by terminal width, the phase should verify stable simultaneous visibility rather than pixel-perfect ratios.

### Focus Model

OpenTUI React components accept a `focused` prop on boxes. The `BoxOptions` type also includes `focusedBorderColor`, so the focused pane can be distinguished without extra decoration. This matches the context decision to use minimal but unambiguous focus indication.

Represent focus with a local union:

- `"what"`
- `"who"`
- `"why"`

Cycle order should be `what -> who -> why -> what`.

### Keyboard API

`@opentui/react` exports `useKeyboard(handler, options?)`. The handler receives an OpenTUI `KeyEvent` with:

- `name`
- `sequence`
- `raw`
- `ctrl`
- `meta`
- `shift`
- `repeated`
- `eventType`

Installed README examples use `key.name === "tab"` to move focus and `process.exit(0)` to exit from a key handler. This is the concrete API for Phase 1.

Keyboard behavior should be:

- `tab`: advance focus using functional `setFocusedPane`
- `q`: exit cleanly with `process.exit(0)`
- `1`, `2`, `3`, `4`: route through inert handlers so key registration is explicit, but no analysis state or visible perspective UI is introduced

The context says perspective hotkeys should be registered as inert handlers and must not trigger model calls, analysis state, or visible perspective UI. The source should make this auditable, for example with a `PERSPECTIVE_HOTKEYS` constant and a no-op branch in the keyboard handler.

### Text and Tone

Pane titles and empty-state copy are locked:

| Pane | Title | Body |
|------|-------|------|
| Source/blame | `What` | `No file under examination` |
| Authors | `Who` | `No suspects identified` |
| Analysis | `Why` | `No theory formed` |

Phase 1 must not add counts, status hints, active perspective labels, keymap footers, git placeholders, AI placeholders, or decorative polish.

## Recommended Plan Split

The roadmap requires two plans:

1. `01-01`: Layout shell and focus state.
   - Replace the starter placeholder with the three-pane OpenTUI shell.
   - Add typed pane definitions and local focus state.
   - Verify all three panes and locked copy render.

2. `01-02`: Keyboard handling for Tab, q, and perspective hotkeys.
   - Import and use `useKeyboard`.
   - Wire Tab focus cycling.
   - Wire q exit behavior.
   - Register `1` through `4` as inert handlers.
   - Verify no model calls, git loading, perspective UI, or footer are introduced.

## Testing and Verification Findings

There is no test framework configured. The installed OpenTUI packages expose test utilities under `@opentui/core/testing`, but Phase 1 can stay conservative:

- Automated verification should at minimum run `bunx tsc --noEmit` because TypeScript is configured with `noEmit`.
- Source assertions can verify the locked pane titles, locked body copy, `useKeyboard`, `key.name === "tab"`, `key.name === "q"`, and the hotkey constant or branch for `1` to `4`.
- Manual verification should run the app in a real terminal with `bun dev`, confirm the three panes, press Tab through all focus states, press `1` to `4` without visible changes or crashes, then press `q` to return to the shell.

If execution adds automated tests, prefer the smallest possible Bun test file around pure helpers such as focus cycling. Do not introduce a browser test stack for a terminal UI.

## Validation Architecture

Phase 1 validation should combine fast static checks, source assertions, and a small manual terminal check:

- Framework: TypeScript compiler plus optional Bun tests if pure helper functions are extracted.
- Quick command: `bunx tsc --noEmit`
- Source assertions:
  - `src/index.tsx` contains pane titles `What`, `Who`, `Why`.
  - `src/index.tsx` contains body copy `No file under examination`, `No suspects identified`, and `No theory formed`.
  - `src/index.tsx` imports `useKeyboard` from `@opentui/react`.
  - `src/index.tsx` checks `key.name === "tab"` and `key.name === "q"`.
  - `src/index.tsx` explicitly registers hotkeys `1`, `2`, `3`, and `4`.
- Manual command: `bun dev`.
- Manual behavior:
  - Startup shows all three panes simultaneously.
  - Tab cycles focus between What, Who, and Why.
  - `1` to `4` do not alter the visible shell and do not crash.
  - `q` exits without an unhandled error.

## Risks and Planning Notes

- OpenTUI keyboard behavior is terminal-dependent, so the plan should include a manual verification step in addition to source checks.
- `process.exit(0)` is documented in the installed OpenTUI React README examples and is acceptable for the first shell. Later cleanup can revisit renderer lifecycle if needed.
- The UI safety gate is enabled for this project. Planning this phase should not proceed without a `UI-SPEC.md` unless the operator explicitly invokes plan-phase with `--skip-ui`.
- Keep Phase 1 source scope narrow. Git parsing, author derivation, perspective registry, analysis state, model calls, and hotkey affordance UI belong to later phases.

## Research Complete

Phase 1 can be planned with local OpenTUI APIs only. No network research or dependency changes are required.
