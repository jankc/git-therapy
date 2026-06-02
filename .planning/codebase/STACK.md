# Technology Stack

**Analysis Date:** 2026-06-02

## Languages

**Primary:**
- TypeScript - Application source in `src/index.tsx`
- TSX - OpenTUI React component rendering in `src/index.tsx`

**Secondary:**
- JSON with comments - TypeScript configuration in `tsconfig.json`
- Markdown - Project documentation in `README.md`

## Runtime

**Environment:**
- Bun - Package manager and runtime for the current application
- Terminal UI runtime - The app renders in a CLI terminal through OpenTUI, not a browser

**Package Manager:**
- Bun
- Lockfile: `bun.lock` present

## Frameworks

**Core:**
- React 19.2.6 - Component model for the terminal UI
- `@opentui/react` 0.3.0 - React renderer for OpenTUI terminal primitives
- `@opentui/core` 0.3.0 - CLI renderer and terminal UI primitives

**Testing:**
- No test framework is currently configured
- No test files are currently present

**Build/Dev:**
- Bun watch mode - `bun run --watch src/index.tsx` via `bun dev`
- TypeScript 5 peer dependency - Type checking and TSX language support
- `@types/bun` latest - Bun runtime types

## Key Dependencies

**Critical:**
- `@opentui/core` - Provides `createCliRenderer`, terminal elements, and text attributes
- `@opentui/react` - Provides `createRoot` and JSX integration for OpenTUI
- `react` - Component model used by the app

**Infrastructure:**
- Bun built-ins - Runtime execution and package management
- TypeScript compiler options - Strict type checking with `noEmit`

## Configuration

**Environment:**
- No environment variables are required by current code
- No `.env` or env example files are present

**Build:**
- `package.json` - Bun entrypoint, scripts, and dependencies
- `tsconfig.json` - ESNext target, bundler module resolution, React JSX with `@opentui/react`
- `bun.lock` - Locked dependency graph

## Platform Requirements

**Development:**
- Bun installed locally
- Terminal capable of running OpenTUI output

**Production:**
- No production packaging or deployment target is configured yet
- Current app is run directly with `bun dev`

---
*Stack analysis: 2026-06-02*
*Update after major dependency changes*
