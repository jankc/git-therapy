---
phase: GT-01-opentui-shell
reviewed: 2026-06-02T13:11:04Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/focus.ts
  - src/focus.test.ts
  - src/index.tsx
  - package.json
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase GT-01: Code Review Report

**Reviewed:** 2026-06-02T13:11:04Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Phase 1 OpenTUI shell: the focus cycling module, its tests, the root application component, and the package manifest. The focus module and its tests are correct and well-structured. Three quality issues were found — one mismatched constant, one missing cleanup path, and one package manifest misconfiguration — none of which are data-loss or security risks, but two can cause silent incorrect behavior or operational friction.

## Warnings

### WR-01: PERSPECTIVE_HOTKEYS contains "4" but only 3 panes exist

**File:** `src/index.tsx:18`
**Issue:** `PERSPECTIVE_HOTKEYS` is defined as `new Set(["1", "2", "3", "4"])`, registering four hotkeys. There are exactly three panes (`what`, `who`, `why`). Pressing `"4"` silently enters the inert branch with no feedback to the user and no apparent future pane planned. If these keys are intended to eventually map to pane indices, registering `"4"` is a future-facing mistake; if the set is intended to match pane count, the fourth entry is an off-by-one error now.

**Fix:** Align the set with the actual number of panes, or add a comment explaining the intent of the fourth key:

```typescript
// If matching pane count exactly:
const PERSPECTIVE_HOTKEYS = new Set(["1", "2", "3"]);

// If "4" is intentional and reserved for a future pane, document it:
// "4" reserved for future "when" pane (Phase 2)
const PERSPECTIVE_HOTKEYS = new Set(["1", "2", "3", "4"]);
```

---

### WR-02: Renderer is not closed on normal exit

**File:** `src/index.tsx:33` and `src/index.tsx:60`
**Issue:** `process.exit(0)` is called directly in the keyboard handler without tearing down the renderer. If `createCliRenderer()` sets up terminal state (raw mode, alternate screen buffer, cursor hiding), a hard `process.exit` may leave the terminal in a broken state on some platforms. Additionally, if an unhandled exception is thrown after `createCliRenderer()` but before the process is ready to handle it, the renderer cleanup is never invoked.

**Fix:** Store the renderer and call its cleanup method before exiting, or register a `process.on('exit')` handler:

```typescript
const renderer = await createCliRenderer();

// Register cleanup for all exit paths
process.on("exit", () => {
  renderer.destroy?.(); // or the appropriate cleanup method per @opentui/core API
});

// Keyboard handler can then call process.exit(0) as before — cleanup runs automatically
```

---

### WR-03: `typescript` listed as peerDependency in an application package

**File:** `package.json:14-16`
**Issue:** `peerDependencies` is a signal to package managers that a dependency is provided by the consuming project. For an application (`"private": true`) this has no meaningful effect on consumers — there are none — but it means `typescript` is not automatically installed by `bun install` / `npm install`. If a contributor clones the repo and runs `bun run dev` or the test suite, TypeScript may be missing, producing confusing errors.

**Fix:** Move `typescript` to `devDependencies`:

```json
"devDependencies": {
  "@types/bun": "latest",
  "@types/react": "^19.2.16",
  "typescript": "^5"
}
```

Remove the now-empty `peerDependencies` block entirely.

---

## Info

### IN-01: No `test` script defined in package.json

**File:** `package.json:6-8`
**Issue:** Tests exist in `src/focus.test.ts` and use `bun:test`, but no `"test"` script is defined in `scripts`. The conventional entry point (`bun test`, `npm test`) is absent. A new contributor, CI pipeline, or the `/gsd-code-review` tooling that invokes tests would find no standard way to run the test suite.

**Fix:** Add a test script:

```json
"scripts": {
  "dev": "bun run --watch src/index.tsx",
  "test": "bun test"
}
```

---

_Reviewed: 2026-06-02T13:11:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
