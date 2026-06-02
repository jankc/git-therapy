# Architecture

**Analysis Date:** 2026-06-02

## Pattern Overview

**Overall:** Single-entry terminal UI application

**Key Characteristics:**
- One source entry point: `src/index.tsx`
- React component tree rendered into a terminal UI through OpenTUI
- No routing, persistence, command parsing, services, or module layers yet
- Top-level `await` creates the renderer before mounting the React tree

## Layers

**Application Component Layer:**
- Purpose: Defines what the terminal UI displays
- Contains: `App` React function component
- Location: `src/index.tsx`
- Depends on: OpenTUI JSX primitives and `TextAttributes`
- Used by: Render bootstrap in the same file

**Renderer Bootstrap Layer:**
- Purpose: Initializes OpenTUI and mounts React
- Contains: `createCliRenderer()` and `createRoot(renderer).render(<App />)`
- Location: `src/index.tsx`
- Depends on: `@opentui/core` and `@opentui/react`
- Used by: Bun runtime when executing `src/index.tsx`

**Configuration Layer:**
- Purpose: Declares runtime scripts and TypeScript behavior
- Contains: `package.json`, `tsconfig.json`, `bun.lock`
- Depends on: Bun and TypeScript
- Used by: Development commands and editor/tooling

## Data Flow

**Terminal App Startup:**

1. Developer runs `bun dev`
2. Bun executes `bun run --watch src/index.tsx`
3. `src/index.tsx` imports OpenTUI core and React renderer helpers
4. `createCliRenderer()` initializes the terminal renderer
5. `createRoot(renderer).render(<App />)` mounts the component tree
6. `App` renders centered OpenTUI boxes, an `ascii-font`, and dim text

**State Management:**
- No persistent state exists
- No React state hooks are currently used
- No application data model has been introduced

## Key Abstractions

**`App`:**
- Purpose: Root component for the terminal UI
- Examples: Renders the "OpenTUI" ascii font and "What will you build?" prompt
- Pattern: Stateless React function component

**OpenTUI Primitives:**
- Purpose: Terminal layout and text rendering
- Examples: `<box>`, `<ascii-font>`, `<text>`
- Pattern: JSX primitives provided through `@opentui/react`

## Entry Points

**Runtime Entry:**
- Location: `src/index.tsx`
- Triggers: `bun dev` or direct Bun execution
- Responsibilities: Initialize renderer and mount root component

**Development Script:**
- Location: `package.json`
- Triggers: `bun dev`
- Responsibilities: Run `src/index.tsx` in watch mode

## Error Handling

**Strategy:** Not yet established

**Patterns:**
- No explicit try/catch blocks exist
- Renderer initialization errors would currently bubble to the Bun process
- No user-facing error state exists in the terminal UI

## Cross-Cutting Concerns

**Logging:**
- No logging pattern has been established

**Validation:**
- No input validation is needed by the current static UI

**Authentication:**
- Not present

**Accessibility:**
- Terminal UI accessibility behavior depends on OpenTUI and terminal capabilities
- No application-specific accessibility patterns have been added yet

---
*Architecture analysis: 2026-06-02*
*Update when major patterns change*
