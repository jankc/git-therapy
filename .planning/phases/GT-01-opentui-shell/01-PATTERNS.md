# Phase 01: opentui-shell - Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 3
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/index.tsx` | component / entrypoint | event-driven + terminal render | `src/index.tsx` | exact |
| `package.json` | config | request-response command invocation | `package.json` | exact |
| `tsconfig.json` | config | transform / typecheck | `tsconfig.json` | exact |

## Pattern Assignments

### `src/index.tsx` (component / entrypoint, event-driven + terminal render)

**Analog:** `src/index.tsx`

**Imports pattern** (lines 1-2):
```typescript
import { createCliRenderer, TextAttributes } from "@opentui/core";
import { createRoot } from "@opentui/react";
```

Copy the same grouped external-import style. For Phase 1 keyboard/focus, extend this with `useKeyboard` from `@opentui/react` and `useState` from `react`; do not introduce local path aliases or feature folders yet.

**Root component pattern** (lines 4-13):
```tsx
function App() {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box justifyContent="center" alignItems="flex-end">
        <ascii-font font="tiny" text="OpenTUI" />
        <text attributes={TextAttributes.DIM}>What will you build?</text>
      </box>
    </box>
  );
}
```

Replace the starter contents with the three-pane shell, but preserve the local `function App()` shape, direct JSX return, two-space indentation, double-quoted strings, and semicolons.

**Renderer bootstrap pattern** (lines 15-16):
```typescript
const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
```

Keep top-level `await createCliRenderer()` and `createRoot(renderer).render(<App />)`. Do not reinitialize the scaffold or add a separate application bootstrap module in Phase 1.

**OpenTUI box/title pattern** (`node_modules/@opentui/react/README.md` lines 467-475):
```tsx
<box flexDirection="column">
  <box border>
    <text>Simple box</text>
  </box>

  <box title="Settings" border borderStyle="double" padding={2} backgroundColor="blue">
    <text>Box content</text>
  </box>
```

Use `<box title="What" border ...>`, `<box title="Who" border ...>`, and `<box title="Why" border ...>` for the shell panes. Keep styling minimal; Phase 7 owns visual polish.

**Focus state and Tab cycle pattern** (`node_modules/@opentui/react/README.md` lines 783-797):
```tsx
import { createCliRenderer } from "@opentui/core"
import { createRoot, useKeyboard } from "@opentui/react"
import { useCallback, useState } from "react"

function App() {
  const [focused, setFocused] = useState<"username" | "password">("username")

  useKeyboard((key) => {
    if (key.name === "tab") {
      setFocused((prev) => (prev === "username" ? "password" : "username"))
    }
  })
```

Adapt the union to `"what" | "who" | "why"` and cycle `what -> who -> why -> what` using functional `setFocusedPane`. Do not add author, git, AI, or perspective state.

**Focused prop pattern** (`node_modules/@opentui/react/README.md` lines 811-826):
```tsx
<box title="Username" style={{ border: true, width: 40, height: 3 }}>
  <input
    placeholder="Enter username..."
    onInput={setUsername}
    onSubmit={handleSubmit}
    focused={focused === "username"}
  />
</box>

<box title="Password" style={{ border: true, width: 40, height: 3 }}>
  <input
    placeholder="Enter password..."
    onInput={setPassword}
    onSubmit={handleSubmit}
    focused={focused === "password"}
  />
</box>
```

Apply the `focused={focusedPane === pane.id}` pattern to pane boxes. The implementation can use `focusedBorderColor` for a minimal visible focus distinction.

**Keyboard quit pattern** (`node_modules/@opentui/react/README.md` lines 194-205):
```tsx
import { useKeyboard } from "@opentui/react"

function App() {
  useKeyboard((key) => {
    if (key.name === "escape") {
      process.exit(0)
    }
  })

  return <text>Press ESC to exit</text>
}
```

Use the same `useKeyboard` handler shape for `key.name === "q"` and `process.exit(0)`. Register `1`, `2`, `3`, and `4` in the same handler as explicit inert branches or via a `PERSPECTIVE_HOTKEYS` constant, with no visible UI changes.

**Box focus options** (`node_modules/@opentui/core/renderables/Box.d.ts` lines 6-18):
```typescript
export interface BoxOptions<TRenderable extends Renderable = BoxRenderable> extends RenderableOptions<TRenderable> {
    backgroundColor?: string | RGBA;
    borderStyle?: BorderStyle;
    border?: boolean | BorderSides[];
    borderColor?: string | RGBA;
    customBorderChars?: BorderCharacters;
    shouldFill?: boolean;
    title?: string;
    titleAlignment?: "left" | "center" | "right";
    bottomTitle?: string;
    bottomTitleAlignment?: "left" | "center" | "right";
    focusedBorderColor?: ColorInput;
    focusable?: boolean;
```

Use `border`, `title`, `focusable`, and `focusedBorderColor` as the minimal focus styling vocabulary. Avoid decorative styling, animation, footer/keymap UI, counts, or status hints.

---

### `package.json` (config, request-response command invocation)

**Analog:** `package.json`

**Run script pattern** (lines 1-8):
```json
{
  "name": "git-therapy",
  "module": "src/index.tsx",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "bun run --watch src/index.tsx"
  },
```

Phase 1 should remain runnable through `bun dev`. No package or script changes are implied by the phase unless planning explicitly adds a tiny Bun test for pure helpers.

**Dependency pattern** (lines 9-19):
```json
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "@opentui/core": "^0.3.0",
    "@opentui/react": "^0.3.0",
    "react": "^19.2.6"
  }
}
```

Use existing Bun, React, and OpenTUI dependencies. Do not add a browser, routing, AI, git parser, or styling dependency for this phase.

---

### `tsconfig.json` (config, transform / typecheck)

**Analog:** `tsconfig.json`

**OpenTUI JSX pattern** (lines 4-16):
```jsonc
"lib": ["ESNext"],
"target": "ESNext",
"module": "Preserve",
"moduleDetection": "force",
"jsx": "react-jsx",
"jsxImportSource": "@opentui/react",
"allowJs": true,

// Bundler mode
"moduleResolution": "bundler",
"allowImportingTsExtensions": true,
"verbatimModuleSyntax": true,
"noEmit": true,
```

Keep OpenTUI JSX through `jsxImportSource: "@opentui/react"` and use `bunx tsc --noEmit` for static verification. No config edits are needed for Phase 1.

**Strictness pattern** (lines 18-28):
```jsonc
// Best practices
"strict": true,
"skipLibCheck": true,
"noFallthroughCasesInSwitch": true,
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true,

// Some stricter flags (disabled by default)
"noUnusedLocals": false,
"noUnusedParameters": false,
"noPropertyAccessFromIndexSignature": false
```

Preserve strict typing. If helper constants are added in `src/index.tsx`, type pane IDs explicitly enough to satisfy `strict` and `noUncheckedIndexedAccess`.

## Shared Patterns

### Executable TUI Entrypoint

**Source:** `src/index.tsx`
**Apply to:** `src/index.tsx`
```typescript
const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
```

The app remains a Bun-executed OpenTUI React entrypoint. Keep bootstrap at the bottom of the file.

### Keyboard Handling

**Source:** `node_modules/@opentui/react/README.md`
**Apply to:** `src/index.tsx`
```tsx
useKeyboard((key) => {
  if (key.name === "tab") {
    setFocused((prev) => (prev === "username" ? "password" : "username"))
  }
})
```

Use `key.name` checks for `tab`, `q`, `1`, `2`, `3`, and `4`. Perspective hotkeys must be auditable but inert.

### No Explicit Error Layer Yet

**Source:** `src/index.tsx`
**Apply to:** `src/index.tsx`
```typescript
const renderer = await createCliRenderer();
```

There is no established error handling abstraction. Let renderer initialization errors bubble as the existing scaffold does.

### Validation

**Source:** `01-RESEARCH.md`
**Apply to:** Phase 1 implementation plans
```text
bunx tsc --noEmit
```

Use TypeScript static verification plus source assertions for locked pane copy and key handling. Manual terminal verification is still needed for focus and quit behavior.

## No Analog Found

All scoped Phase 1 files have useful analogs in the existing scaffold or installed OpenTUI package examples.

## Metadata

**Analog search scope:** `src/`, `package.json`, `tsconfig.json`, `node_modules/@opentui/react/README.md`, `node_modules/@opentui/core/renderables/Box.d.ts`
**Files scanned:** 8
**Pattern extraction date:** 2026-06-02
