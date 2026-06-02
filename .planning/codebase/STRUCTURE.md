# Codebase Structure

**Analysis Date:** 2026-06-02

## Directory Layout

```text
git-therapy/
├── src/              # Application source
│   └── index.tsx     # OpenTUI React entry point and root component
├── .codex/           # Codex/GSD local skills and workflow assets
├── .claude/          # Installed Claude/GSD runtime assets
├── .hermes/          # Installed Hermes/GSD runtime assets
├── .opencode/        # Installed OpenCode/GSD runtime assets
├── README.md         # Basic Bun/OpenTUI setup instructions
├── package.json      # Bun scripts and dependencies
├── tsconfig.json     # TypeScript compiler options
└── bun.lock          # Bun dependency lockfile
```

## Directory Purposes

**`src/`:**
- Purpose: Application implementation
- Contains: TypeScript/TSX source files
- Key files: `src/index.tsx`
- Subdirectories: None currently

**`.planning/codebase/`:**
- Purpose: GSD codebase map generated for project initialization
- Contains: Stack, integration, architecture, structure, convention, testing, and concerns documents
- Key files: `STACK.md`, `ARCHITECTURE.md`, `CONCERNS.md`
- Subdirectories: None currently

**Runtime support directories:**
- Purpose: Installed agent and workflow assets for different assistant runtimes
- Contains: `.codex/`, `.claude/`, `.hermes/`, `.opencode/`
- Key files: GSD workflow definitions and agent definitions
- Subdirectories: Runtime-specific commands, agents, hooks, and bundled GSD assets

## Key File Locations

**Entry Points:**
- `src/index.tsx`: Bun/OpenTUI application entry point

**Configuration:**
- `package.json`: Dependency manifest and `dev` script
- `tsconfig.json`: Strict TypeScript and OpenTUI JSX configuration
- `bun.lock`: Locked dependency versions
- `.gitignore`: Git ignore rules

**Core Logic:**
- `src/index.tsx`: Current root UI and renderer bootstrap

**Testing:**
- No test files or test directories are currently present

**Documentation:**
- `README.md`: Basic install/run instructions
- `.planning/codebase/*.md`: Generated codebase analysis for GSD workflows

## Naming Conventions

**Files:**
- Lowercase `index.tsx` for the source entry point
- Uppercase `README.md` for project documentation
- Root-level JSON config files use conventional names (`package.json`, `tsconfig.json`)

**Directories:**
- `src` for source code
- Hidden runtime directories for assistant and GSD support assets

**Special Patterns:**
- No feature/module directory pattern exists yet
- No test naming pattern exists yet
- No barrel exports exist yet

## Where to Add New Code

**New Terminal UI Feature:**
- Primary code: create focused modules under `src/`
- Current starting point: wire new root behavior from `src/index.tsx`
- Tests: add a test framework and colocated test pattern before relying on automated regression checks

**New Component/Module:**
- Implementation: `src/`
- Types: colocate with implementation until a broader module structure emerges
- Tests: no established location yet

**New Command or Runtime Flow:**
- Definition: no command layer exists yet
- Handler: introduce a command or state-management layer under `src/` if the app grows beyond a static UI

**Utilities:**
- Shared helpers: create under `src/` once there is reuse
- Type definitions: colocate initially, then extract if shared across modules

## Special Directories

**`.codex/`, `.claude/`, `.hermes/`, `.opencode/`:**
- Purpose: Local agent/runtime support files for GSD workflows
- Source: Installed tooling assets
- Committed: Present in the working tree; treat as workflow support, not application source

**`.planning/`:**
- Purpose: GSD project planning artifacts
- Source: Generated during GSD workflows
- Committed: Yes by default unless project config later disables planning doc commits

---
*Structure analysis: 2026-06-02*
*Update when directory structure changes*
