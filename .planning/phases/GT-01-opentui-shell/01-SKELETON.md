# Walking Skeleton - git-therapy

**Phase:** 1
**Generated:** 2026-06-02

## Capability Proven End-to-End

A user can run the Bun/OpenTUI app locally, see the three-pane forensic shell, move focus with Tab, press inert perspective hotkeys without triggering analysis, and quit with q.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Bun + React 19 + OpenTUI React | Matches the existing starter and terminal-only product direction. |
| Data layer | None in Phase 1 | This project does not need a database for the first shell; git evidence starts in Phase 2. |
| Auth | None | The v1 tool is a local terminal demo with no accounts or remote sessions. |
| Deployment target | Local terminal command `bun dev` | The demo runs directly in a terminal; no browser or hosted dev deployment is required. |
| Directory layout | Keep `src/index.tsx`; add only focused helpers when testability requires it | Preserves the existing scaffold while allowing a small pure helper for focus cycling. |

## Stack Touched in Phase 1

- [x] Project scaffold - existing Bun/OpenTUI starter is preserved.
- [x] Routing - not applicable; the terminal shell is the single route/screen.
- [x] Database - not applicable by explicit phase scope.
- [x] UI - three interactive terminal panes with keyboard focus.
- [x] Deployment - local full-stack run command is `bun dev`.

## Out of Scope (Deferred to Later Slices)

- Git file loading and blame parsing - Phase 2.
- Author derivation and author selection - Phase 3.
- Author evidence aggregation - Phase 4.
- AI provider integration, prompt contracts, streaming analysis, and metric rendering - Phase 5.
- Perspective switching with live analysis - Phase 6.
- Visual polish, loading states, failures, and retry - Phase 7.
- Remaining perspectives and demo prep - Phases 8 and 9.
- Database, API server, auth, browser routing, shadcn, Tailwind, and web deployment - not part of v1 terminal scope.

## Subsequent Slice Plan

Each later phase adds one vertical terminal capability on top of this skeleton without reinitializing the scaffold:

- Phase 2: Parse a file scope and render blame-prefixed source lines.
- Phase 3: Derive authors from blame data and support single-author selection.
- Phase 4: Produce complete `AuthorEvidence` objects.
- Phase 5: Stream the first Mental perspective analysis.
- Phase 6: Add Skill perspective switching and re-streaming.
- Phase 7: Polish highlighting, loading, failure, retry, and color behavior.
- Phase 8: Add Context and Hidden narratives perspectives.
- Phase 9: Prepare README, demo target, and rehearsal notes.
