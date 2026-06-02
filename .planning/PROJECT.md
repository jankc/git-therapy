# git-therapy

## What This Is

git-therapy is a terminal UI tool for forensic analysis of git history: `git blame` tells you who, git-therapy tells you why. It analyzes a single file's blame and nearby commit history through multiple LLM-powered interpretive perspectives, then presents an absurd but evidence-grounded forensic report in a three-pane TUI.

The product is built for a short technical demo: one real file, multiple authors, one evidence set, four prompts, and visibly different analyses streaming into the terminal.

## Core Value

Every absurd inference must be grounded in specific git evidence while the tool plays the analysis completely straight.

## Requirements

### Validated

- Git repository and Bun/OpenTUI starter exist - existing
- GSD codebase map exists under `.planning/codebase/` - existing

### Active

- [ ] Single-file TUI invocation analyzes `git-therapy <path>` and optional `path:start-end` scopes.
- [ ] Three panes remain visible: source/blame, authors/selection, and streaming analysis.
- [ ] Author list supports keyboard navigation and multi-author selection.
- [ ] Git evidence is collected from blame data plus per-author commit history and aggregates.
- [ ] Four perspectives are implemented through a registry with distinct prompts, schemas, and renderers.
- [ ] The first three perspectives render metric bars with cited evidence.
- [ ] Hidden narratives render narrative sections rather than metric bars.
- [ ] The AI layer is provider-agnostic, Anthropic by default, with OpenAI swappable at a module boundary.
- [ ] Perspective or author changes trigger fresh streaming analysis in v1; no result caching.
- [ ] Demo prep identifies a reliable target file/repo and documents the one-page demo flow.

### Out of Scope

- Repo-wide analysis or rollups - v1 is single-file only to keep the demo focused.
- Persistent session history - changing author or perspective re-runs the model in v1.
- Comparing perspectives over time - the demo compares live prompt outputs, not historical runs.
- Team views - not needed for the 90-second talk arc.
- Exports, sharing, or configuration files - defer until the live TUI is useful.
- Acting as a real `git` subcommand - PATH naming is a stretch goal, not a v1 requirement.
- Mid-session provider switching UX - an open question after the Step 6 demo cut line.
- Deterministic cached demo mode - add only if rehearsal reliability requires it.

## Context

- Source design: `DESIGN.md`
- Runtime: Bun.
- Current codebase: generated `bun create tui` / OpenTUI React starter with `src/index.tsx`.
- TUI: OpenTUI React binding.
- LLM plan: Vercel AI SDK with `@ai-sdk/anthropic` as default and `@ai-sdk/openai` installed for swap capability.
- Git access: `simple-git`.
- Schema validation: Zod through AI SDK `streamObject`.
- UX posture: deadpan clinical presentation; no jokes, asides, or fourth-wall breaks in model output.
- Demo cut line: end of Phase 6, after the mental and skill perspectives work and hotkey switching re-streams correctly.

## Constraints

- **Scope**: v1 must remain single-file analysis - preserves demo clarity and implementation focus.
- **Evidence grounding**: every metric must cite specific facts from git data - this is the core value and prevents ungrounded LLM output.
- **Streaming**: analysis must stream live and render progressively - the demo depends on seeing interpretation appear.
- **Provider boundary**: model provider must be swappable at the AI module boundary - enables future model comparison without redesign.
- **No v1 caching**: every author/perspective change triggers a fresh call - simpler behavior and clearer demo.
- **Tone**: prompts must forbid jokes and require calm forensic analyst style - humor comes from what is measured.
- **Build order**: phases must proceed sequentially through the design's build order - each phase creates a demonstrable artifact.
- **Source scaffold**: preserve the existing Bun/OpenTUI starter - do not reinitialize the app scaffold.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build as a terminal UI, not browser UI | The product mirrors `git blame` and needs live keyboard interaction in a terminal | - Pending |
| Use OpenTUI React binding | Repo already uses Bun/OpenTUI scaffold and React components suit pane-based UI | - Pending |
| Make `Mental & emotional state` the default perspective | It best demonstrates the premise immediately | - Pending |
| Use a perspective registry | Keeps prompts, schemas, hotkeys, and renderers explicit and swappable | - Pending |
| Keep hidden narratives as a separate renderer | Demonstrates that prompt/schema changes can alter output shape, not only content | - Pending |
| Use Vercel AI SDK `streamObject` with Zod schemas | Supports typed streaming JSON and progressive rendering | - Pending |
| No v1 result cache | Simpler implementation; every change visibly re-runs the model | - Pending |
| Cut-line after Phase 6 | Mental + Skill perspectives with hotkey re-streaming is enough for the talk if polish slips | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections.
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-06-02 after initialization from DESIGN.md*
