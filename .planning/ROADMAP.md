# Roadmap: git-therapy

## Overview

Build git-therapy as a sequence of demonstrable vertical slices: first the terminal shell, then real git blame evidence, then author selection, then the typed evidence collector, then the first streaming LLM perspective. The talk-ready cut line is Phase 6, where the same author/evidence can be reinterpreted by switching between Mental and Skill perspectives. Later phases add polish, the remaining perspectives, and demo preparation.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work.
- Decimal phases (2.1, 2.2): Urgent insertions marked INSERTED.

- [x] **Phase 1: OpenTUI Shell** - Three empty panes, focus handling, quit behavior, and no-op hotkeys.
- [ ] **Phase 2: Git Blame Parser** - Parse a real file scope and render blame-prefixed source lines.
- [ ] **Phase 3: Authors Pane** - Derive authors from blame data and support single-author selection.
- [ ] **Phase 4: Evidence Collector** - Produce the full `AuthorEvidence` input shape.
- [ ] **Phase 5: Mental Perspective** - First end-to-end streaming LLM analysis with metric bars.
- [ ] **Phase 6: Skill Perspective** - Add second perspective and verify hotkey re-streaming.
- [ ] **Phase 7: Polish Pass** - Highlighting, loading states, errors, retry, and color choices.
- [ ] **Phase 8: Remaining Perspectives** - Add Context metrics and Hidden narrative renderer.
- [ ] **Phase 9: Demo Prep** - Reliable target file/repo plus one-page README.

## Phase Details

### Phase 1: OpenTUI Shell

**Goal**: A running terminal UI displays three bordered panes with keyboard focus and registered hotkeys, but no git data yet.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: [CLI-03, TUI-01, TUI-05]
**Success Criteria** (what must be TRUE):

  1. User can run the app and see three stable panes.
  2. User can press Tab to cycle focus between panes.
  3. User can press `q` to exit.
  4. Perspective hotkeys are registered but intentionally no-op.

**Plans**: 2 plans

Plans:

**Wave 1**

- [x] 01-01: Layout shell and focus state.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02: Keyboard handling for Tab, q, and perspective hotkeys.

### Phase 2: Git Blame Parser

**Goal**: The app accepts a file path or line range, parses real blame data, and renders blame-prefixed source lines.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: [CLI-01, CLI-02, TUI-02, GIT-01]
**Success Criteria** (what must be TRUE):

  1. User can launch `git-therapy <path>`.
  2. User can launch `git-therapy <path>:<start>-<end>`.
  3. Source pane shows short SHA, author, date, and source text for each scoped line.
  4. Blame parser returns typed lines from `git blame --line-porcelain`.

**Plans**: 2 plans

Plans:

- [ ] 02-01: CLI scope parsing and simple-git dependency setup.
- [ ] 02-02: Blame parser and source pane rendering.

### Phase 3: Authors Pane

**Goal**: The authors pane lists contributors in scope with line share and supports single-author keyboard selection.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: [TUI-03, SEL-01, SEL-02]
**Success Criteria** (what must be TRUE):

  1. Authors pane derives authors from blame data.
  2. Each author shows line-count share.
  3. Up/Down moves the author cursor.
  4. Space or Enter selects the highlighted author.

**Plans**: 2 plans

Plans:

- [ ] 03-01: Author derivation and line share calculation.
- [ ] 03-02: Cursor movement and single-select behavior.

### Phase 4: Evidence Collector

**Goal**: The app creates complete, testable `AuthorEvidence` objects for the selected author.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: [GIT-02, GIT-03, GIT-04]
**Success Criteria** (what must be TRUE):

  1. Evidence collector includes author identity, line counts, line ranges, commits, aggregates, and scope code.
  2. Commit evidence includes timestamp, weekday, local hour, message, diff size, amend flag, and minutes since previous.
  3. Aggregates include total commits, hour histogram, average message length, word frequencies, and time span days.
  4. Evidence collector is unit-testable without rendering the TUI.

**Plans**: 2 plans

Plans:

- [ ] 04-01: Git log collection and commit normalization.
- [ ] 04-02: AuthorEvidence aggregation and tests.

### Phase 5: Mental Perspective

**Goal**: Selecting an author streams the Mental & emotional state analysis and renders metric bars with cited evidence.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: [TUI-04, SEL-03, PRS-01, PRS-03, PRS-04, AI-01, AI-02, AI-03, AI-04, AI-05, AI-06]
**Success Criteria** (what must be TRUE):

  1. Perspective registry defines the default Mental perspective.
  2. AI wrapper streams structured objects through Vercel AI SDK.
  3. Prompt contract requires forensic tone, evidence citation, JSON-only output, and no jokes.
  4. Metric bars render progressively as streamed JSON arrives.
  5. Analysis pane shows an analyzing state while streaming.

**Plans**: 3 plans

Plans:

- [ ] 05-01: Provider-agnostic AI wrapper and dependencies.
- [ ] 05-02: Perspective registry, schema, and Mental prompt.
- [ ] 05-03: Streaming analysis pane and metric bar renderer.

### Phase 6: Skill Perspective

**Goal**: Hotkey `2` switches to Skill & experience and re-streams analysis for the same selected author.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: [PRS-02, PRS-05, AI-07]
**Success Criteria** (what must be TRUE):

  1. Hotkey `1` selects Mental and hotkey `2` selects Skill.
  2. Skill perspective uses its own metric set and prompt.
  3. Switching perspective clears prior result state and starts a fresh stream.
  4. This phase reaches the talk cut line.

**Plans**: 2 plans

Plans:

- [ ] 06-01: Skill perspective prompt/schema registration.
- [ ] 06-02: Perspective switching and re-stream behavior.

### Phase 7: Polish Pass

**Goal**: The core demo experience is legible, resilient, and visually clear.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: [TUI-06, AI-08]
**Success Criteria** (what must be TRUE):

  1. Source lines for the selected author are highlighted.
  2. Analysis pane has clear loading and failure states.
  3. User can retry after a model failure.
  4. Color choices preserve the deadpan blame-like aesthetic.

**Plans**: 2 plans

Plans:

- [ ] 07-01: Highlighting and visual polish.
- [ ] 07-02: Error state and retry behavior.

### Phase 8: Remaining Perspectives

**Goal**: Context & circumstances and Hidden narratives perspectives work, including the narrative renderer.
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: [PRS-06, PRS-07]
**Success Criteria** (what must be TRUE):

  1. Hotkey `3` streams Context & circumstances metrics.
  2. Hotkey `4` streams Hidden narratives sections.
  3. Hidden narratives use a narrative renderer, not metric bars.
  4. Hotkey footer shows all four available perspectives.

**Plans**: 2 plans

Plans:

- [ ] 08-01: Context perspective prompt/schema registration.
- [ ] 08-02: Hidden narrative schema and renderer.

### Phase 9: Demo Prep

**Goal**: The project is ready for the 90-second talk demo.
**Mode:** mvp
**Depends on**: Phase 8
**Requirements**: [DEMO-01, DEMO-02, DEMO-03]
**Success Criteria** (what must be TRUE):

  1. README explains install, run, premise, and controls.
  2. Demo notes identify a reliable target repo and file.
  3. Demo flow can show author selection, streaming, perspective switching, and re-running on a second author.

**Plans**: 2 plans

Plans:

- [ ] 09-01: README and usage polish.
- [ ] 09-02: Demo target selection and rehearsal notes.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. OpenTUI Shell | 2/2 | Complete | 2026-06-02 |
| 2. Git Blame Parser | 0/2 | Not started | - |
| 3. Authors Pane | 0/2 | Not started | - |
| 4. Evidence Collector | 0/2 | Not started | - |
| 5. Mental Perspective | 0/3 | Not started | - |
| 6. Skill Perspective | 0/2 | Not started | - |
| 7. Polish Pass | 0/2 | Not started | - |
| 8. Remaining Perspectives | 0/2 | Not started | - |
| 9. Demo Prep | 0/2 | Not started | - |
