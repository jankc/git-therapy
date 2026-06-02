---
phase: 01
slug: opentui-shell
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-02
---

# Phase 01 - Validation Strategy

Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler; optional Bun tests only if pure helpers are extracted |
| **Config file** | `tsconfig.json` |
| **Quick run command** | `bunx tsc --noEmit` |
| **Full suite command** | `bunx tsc --noEmit` plus manual terminal verification |
| **Estimated runtime** | less than 10 seconds for static checks |

## Sampling Rate

- **After every task commit:** Run `bunx tsc --noEmit`.
- **After every plan wave:** Run `bunx tsc --noEmit`.
- **Before `$gsd-verify-work`:** Run static checks and complete manual terminal verification.
- **Max feedback latency:** 10 seconds for automated checks; manual terminal check at plan completion.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01-01 | 1 | TUI-01 | T-01-01 | N/A - static local UI only | source + typecheck | `bunx tsc --noEmit` | yes | pending |
| 01-01-02 | 01-01 | 1 | TUI-05 | T-01-01 | N/A - local focus state only | source + typecheck | `bunx tsc --noEmit` | yes | pending |
| 01-02-01 | 01-02 | 2 | TUI-05 | T-01-02 | Keyboard handler accepts only local key events | source + typecheck | `bunx tsc --noEmit` | yes | pending |
| 01-02-02 | 01-02 | 2 | CLI-03 | T-01-02 | Quit path exits locally without shell command execution | source + typecheck | `bunx tsc --noEmit` | yes | pending |
| 01-02-03 | 01-02 | 2 | TUI-01 | T-01-02 | Perspective hotkeys remain inert and do not call git or AI code | source + typecheck | `bunx tsc --noEmit` | yes | pending |

## Wave 0 Requirements

Existing infrastructure covers this phase:

- `tsconfig.json` exists and is strict enough for Phase 1 source changes.
- `package.json` exposes `bun dev` for manual terminal verification.
- No test framework installation is required before planning.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Three-pane terminal rendering | TUI-01 | OpenTUI rendering depends on a real terminal viewport | Run `bun dev`; confirm `What`, `Who`, and `Why` panes are visible simultaneously. |
| Tab focus cycle | TUI-05 | Focus border behavior is visual terminal output | Press Tab four times and confirm focus advances `What -> Who -> Why -> What`. |
| Quit key | CLI-03 | Process exit behavior is interactive | Press `q`; confirm control returns to the shell with no unhandled error. |
| Inert perspective hotkeys | TUI-01 | Behavior is no visible state change in Phase 1 | Press `1`, `2`, `3`, and `4`; confirm the shell does not crash and no perspective UI appears. |

## Required Source Assertions

- `src/index.tsx` contains pane titles `What`, `Who`, and `Why`.
- `src/index.tsx` contains body copy `No file under examination`, `No suspects identified`, and `No theory formed`.
- `src/index.tsx` imports `useKeyboard` from `@opentui/react`.
- `src/index.tsx` handles `key.name === "tab"`.
- `src/index.tsx` handles `key.name === "q"`.
- `src/index.tsx` explicitly registers hotkeys `1`, `2`, `3`, and `4` without invoking git or AI code.

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual terminal verification.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags in automated checks.
- [x] Feedback latency below 10 seconds for automated checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending execution
