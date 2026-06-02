---
phase: 01-opentui-shell
plan: "01"
subsystem: tui-shell
tags: [tui, opentui, react, focus, tdd]
dependency_graph:
  requires: []
  provides: [src/focus.ts, src/focus.test.ts, src/index.tsx, PaneId, PANE_IDS, INITIAL_FOCUSED_PANE_ID, getNextPaneId]
  affects: [src/index.tsx]
tech_stack:
  added: ["@types/react@19.2.16"]
  patterns: [opentui-box-layout, typed-union-focus, bun-test-tdd, useKeyboard-handler]
key_files:
  created:
    - src/focus.ts
    - src/focus.test.ts
  modified:
    - src/index.tsx
    - package.json
    - bun.lock
decisions:
  - "PANE_IDS uses as const readonly tuple to derive PaneId type union without enums"
  - "getNextPaneId uses PANE_IDS.indexOf + modulo arithmetic for deterministic cycling"
  - "PANE_FLEX record maps PaneId to flexGrow values 3/1/1 for ~60/20/20 width allocation"
  - "PERSPECTIVE_HOTKEYS constant makes inert hotkey registration auditable in source"
  - "@types/react added as devDependency for TypeScript correctness (tsc --noEmit)"
metrics:
  duration_seconds: 166
  completed_date: "2026-06-02"
  tasks_completed: 3
  files_modified: 5
---

# Phase 01 Plan 01: Three-Pane Shell with Typed Focus Model Summary

Typed focus cycle helper with Bun tests plus a three-pane OpenTUI shell replacing the ascii-font starter.

## What Was Built

`src/focus.ts` exports a readonly `PANE_IDS` tuple, the derived `PaneId` type union, `INITIAL_FOCUSED_PANE_ID = "what"`, and `getNextPaneId(current: PaneId): PaneId` cycling `what -> who -> why -> what`. The helper is pure with no terminal, React, git, or AI imports.

`src/focus.test.ts` uses `bun:test` to verify the cycle constants and round-trip behavior across all three pane IDs.

`src/index.tsx` replaces the `ascii-font` placeholder with a root horizontal `<box>` containing three bordered pane boxes (What, Who, Why) using a 3/1/1 `flexGrow` ratio for approximately 60/20/20 width allocation. Focus state is tracked with `useState<PaneId>` initialized to `INITIAL_FOCUSED_PANE_ID`. `useKeyboard` wires Tab to `getNextPaneId`, `q` to `process.exit(0)`, and registers `1`-`4` as explicit inert branches via a `PERSPECTIVE_HOTKEYS` constant.

## TDD Gate Compliance

| Gate | Commit | Message |
|------|--------|---------|
| RED | a72da46 | test(01-01): add failing focus-cycle tests |
| GREEN | be00f9d | feat(01-01): implement typed pane focus helpers |
| REFACTOR | 9e83ef2 | refactor(01-01): replace starter view with three-pane shell |

RED confirmed failing with `Cannot find module './focus'` before implementation. GREEN confirmed all 5 tests pass plus `tsc --noEmit` exits 0.

## Commits

| Task | Type | Hash | Description |
|------|------|------|-------------|
| Task 1 (RED) | test | a72da46 | test(01-01): add failing focus-cycle tests |
| Task 2 (GREEN) | feat | be00f9d | feat(01-01): implement typed pane focus helpers |
| Task 3 (REFACTOR) | refactor | 9e83ef2 | refactor(01-01): replace starter view with three-pane shell |

## Verification Results

- `bun test src/focus.test.ts`: 5 pass, 0 fail
- `bunx tsc --noEmit`: exits 0
- `src/index.tsx` contains `title: "What"`, `title: "Who"`, `title: "Why"`
- `src/index.tsx` contains `No file under examination`, `No suspects identified`, `No theory formed`
- `src/index.tsx` contains `focused={focusedPane === pane.id}`
- `src/index.tsx` does not contain `ascii-font`
- `src/index.tsx` does not contain `0 lines`, `0 authors`, `idle`, `Mental`, `Skill`, `Context`, or `Hidden`

## Requirements Satisfied

| Requirement | Status | Evidence |
|-------------|--------|----------|
| TUI-01 | Satisfied | Three bordered panes What/Who/Why render at startup |
| TUI-05 | Satisfied | getNextPaneId provides deterministic what->who->why->what cycle |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `PANE_IDS` as const tuple | Derives `PaneId` union type without separate enum; satisfies `noUncheckedIndexedAccess` |
| `flexGrow` 3/1/1 | Approximates 60/20/20 without hard pixel widths; adapts to terminal size |
| `PERSPECTIVE_HOTKEYS` constant | Makes inert hotkey registration explicit and source-auditable per D-07 |
| `@types/react` devDependency | Required for TypeScript to resolve `useState` — react already a dependency, types are correctness requirement |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Installed @types/react for TypeScript correctness**
- **Found during:** Task 3 (REFACTOR)
- **Issue:** `bunx tsc --noEmit` failed with `TS7016: Could not find a declaration file for module 'react'` and `TS7006: Parameter 'prev' implicitly has an 'any' type`
- **Fix:** Ran `bun add -d @types/react` — the package is a well-known legitimate npm package (npmjs.com/package/@types/react) covering `react@19` which is already a declared dependency
- **Files modified:** `package.json`, `bun.lock`
- **Commit:** 9e83ef2 (included with REFACTOR)

## Known Stubs

None. All pane body copy is intentional locked empty-state copy per D-02. No data wiring is deferred; Phase 1 renders static copy by design.

## Self-Check: PASSED

- src/focus.ts exists: FOUND
- src/focus.test.ts exists: FOUND
- src/index.tsx modified: FOUND
- Commit a72da46 exists: FOUND
- Commit be00f9d exists: FOUND
- Commit 9e83ef2 exists: FOUND
