<!-- GSD:project-start source:PROJECT.md -->

## Project

**git-therapy**

git-therapy is a terminal UI tool for forensic analysis of git history: `git blame` tells you who, git-therapy tells you why. It analyzes a single file's blame and nearby commit history through multiple LLM-powered interpretive perspectives, then presents an absurd but evidence-grounded forensic report in a three-pane TUI.

The product is built for a short technical demo: one real file, multiple authors, one evidence set, four prompts, and visibly different analyses streaming into the terminal.

**Core Value:** Every absurd inference must be grounded in specific git evidence while the tool plays the analysis completely straight.

### Constraints

- **Scope**: v1 must remain single-file analysis - preserves demo clarity and implementation focus.
- **Evidence grounding**: every metric must cite specific facts from git data - this is the core value and prevents ungrounded LLM output.
- **Streaming**: analysis must stream live and render progressively - the demo depends on seeing interpretation appear.
- **Provider boundary**: model provider must be swappable at the AI module boundary - enables future model comparison without redesign.
- **No v1 caching**: every author/perspective change triggers a fresh call - simpler behavior and clearer demo.
- **Tone**: prompts must forbid jokes and require calm forensic analyst style - humor comes from what is measured.
- **Build order**: phases must proceed sequentially through the design's build order - each phase creates a demonstrable artifact.
- **Source scaffold**: preserve the existing Bun/OpenTUI starter - do not reinitialize the app scaffold.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript - Application source in `src/index.tsx`
- TSX - OpenTUI React component rendering in `src/index.tsx`
- JSON with comments - TypeScript configuration in `tsconfig.json`
- Markdown - Project documentation in `README.md`

## Runtime

- Bun - Package manager and runtime for the current application
- Terminal UI runtime - The app renders in a CLI terminal through OpenTUI, not a browser
- Bun
- Lockfile: `bun.lock` present

## Frameworks

- React 19.2.6 - Component model for the terminal UI
- `@opentui/react` 0.3.0 - React renderer for OpenTUI terminal primitives
- `@opentui/core` 0.3.0 - CLI renderer and terminal UI primitives
- No test framework is currently configured
- No test files are currently present
- Bun watch mode - `bun run --watch src/index.tsx` via `bun dev`
- TypeScript 5 peer dependency - Type checking and TSX language support
- `@types/bun` latest - Bun runtime types

## Key Dependencies

- `@opentui/core` - Provides `createCliRenderer`, terminal elements, and text attributes
- `@opentui/react` - Provides `createRoot` and JSX integration for OpenTUI
- `react` - Component model used by the app
- Bun built-ins - Runtime execution and package management
- TypeScript compiler options - Strict type checking with `noEmit`

## Configuration

- No environment variables are required by current code
- No `.env` or env example files are present
- `package.json` - Bun entrypoint, scripts, and dependencies
- `tsconfig.json` - ESNext target, bundler module resolution, React JSX with `@opentui/react`
- `bun.lock` - Locked dependency graph

## Platform Requirements

- Bun installed locally
- Terminal capable of running OpenTUI output
- No production packaging or deployment target is configured yet
- Current app is run directly with `bun dev`

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Current application source uses `index.tsx` as the root entry point
- No established feature file naming pattern yet
- No test file naming pattern yet
- React components use PascalCase, as in `App`
- Imported framework functions use their library names, as in `createCliRenderer` and `createRoot`
- No event-handler naming pattern exists yet
- Current code uses camelCase for variables, as in `renderer`
- No constant naming pattern has been established
- No private member pattern exists
- No local interfaces, type aliases, or enums are currently defined
- Imported type/value names follow upstream library naming, as in `TextAttributes`

## Code Style

- Two-space indentation in `src/index.tsx`
- Double quotes for imports and string props
- Semicolons are used
- JSX attributes are inline for compact components
- No ESLint configuration is present
- No lint script exists in `package.json`

## Import Organization

- Current code has one grouped block of external imports
- No blank-line grouping pattern beyond the initial imports has been established
- No path aliases are configured in `tsconfig.json`
- Module resolution is set to `bundler`

## Error Handling

- No explicit error handling exists in current source
- Renderer initialization currently relies on top-level `await` and normal exception bubbling
- No custom errors are defined
- No Result-style or error-object pattern exists

## Logging

- No logging framework is configured
- No `console.*` calls exist in current source
- Logging conventions should be defined when runtime interactions or command flows are added

## Comments

- Current source has no comments
- Keep future comments focused on non-obvious terminal rendering or interaction behavior
- Not currently used
- No TODO/FIXME comments were found in application files

## Function Design

- Current root component is intentionally small
- Extract helper components once UI branches or stateful flows emerge
- No custom function parameters are currently used
- Components return JSX directly
- Top-level bootstrap does not export values

## Module Design

- No local exports currently exist
- `src/index.tsx` is executable entry code rather than a reusable module
- No barrel files exist
- Avoid introducing barrels until there are multiple reusable modules

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## Pattern Overview

- One source entry point: `src/index.tsx`
- React component tree rendered into a terminal UI through OpenTUI
- No routing, persistence, command parsing, services, or module layers yet
- Top-level `await` creates the renderer before mounting the React tree

## Layers

- Purpose: Defines what the terminal UI displays
- Contains: `App` React function component
- Location: `src/index.tsx`
- Depends on: OpenTUI JSX primitives and `TextAttributes`
- Used by: Render bootstrap in the same file
- Purpose: Initializes OpenTUI and mounts React
- Contains: `createCliRenderer()` and `createRoot(renderer).render(<App />)`
- Location: `src/index.tsx`
- Depends on: `@opentui/core` and `@opentui/react`
- Used by: Bun runtime when executing `src/index.tsx`
- Purpose: Declares runtime scripts and TypeScript behavior
- Contains: `package.json`, `tsconfig.json`, `bun.lock`
- Depends on: Bun and TypeScript
- Used by: Development commands and editor/tooling

## Data Flow

- No persistent state exists
- No React state hooks are currently used
- No application data model has been introduced

## Key Abstractions

- Purpose: Root component for the terminal UI
- Examples: Renders the "OpenTUI" ascii font and "What will you build?" prompt
- Pattern: Stateless React function component
- Purpose: Terminal layout and text rendering
- Examples: `<box>`, `<ascii-font>`, `<text>`
- Pattern: JSX primitives provided through `@opentui/react`

## Entry Points

- Location: `src/index.tsx`
- Triggers: `bun dev` or direct Bun execution
- Responsibilities: Initialize renderer and mount root component
- Location: `package.json`
- Triggers: `bun dev`
- Responsibilities: Run `src/index.tsx` in watch mode

## Error Handling

- No explicit try/catch blocks exist
- Renderer initialization errors would currently bubble to the Bun process
- No user-facing error state exists in the terminal UI

## Cross-Cutting Concerns

- No logging pattern has been established
- No input validation is needed by the current static UI
- Not present
- Terminal UI accessibility behavior depends on OpenTUI and terminal capabilities
- No application-specific accessibility patterns have been added yet

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
