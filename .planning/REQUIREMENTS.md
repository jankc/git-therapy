# Requirements: git-therapy

**Defined:** 2026-06-02
**Core Value:** Every absurd inference must be grounded in specific git evidence while the tool plays the analysis completely straight.

## v1 Requirements

### Invocation

- [ ] **CLI-01**: User can run `git-therapy <path>` to analyze one file.
- [ ] **CLI-02**: User can run `git-therapy <path>:<start>-<end>` to analyze a line range.
- [x] **CLI-03**: User can quit the TUI with `q`.

### Terminal UI

- [x] **TUI-01**: User sees three always-visible columns: source/blame, authors, and analysis.
- [ ] **TUI-02**: Source pane displays each scoped line with short SHA, author, date, and source text.
- [ ] **TUI-03**: Authors pane displays each author touching the scope with line-count share.
- [ ] **TUI-04**: Analysis pane displays an analyzing state, selected perspective name, result content, and hotkey footer.
- [x] **TUI-05**: User can cycle focus between panes with Tab.
- [ ] **TUI-06**: Lines belonging to the selected author are subtly highlighted.

### Author Selection

- [ ] **SEL-01**: User can move the author cursor with Up/Down arrows.
- [ ] **SEL-02**: User can select the highlighted author with Space or Enter.
- [ ] **SEL-03**: Changing the selected author triggers a fresh analysis stream for the active perspective.

### Git Evidence

- [ ] **GIT-01**: App parses `git blame --line-porcelain` output into typed blame lines.
- [ ] **GIT-02**: App collects per-author commit history for the selected file scope.
- [ ] **GIT-03**: App aggregates timestamps, message statistics, word frequencies, diff sizes, and line ranges per author.
- [ ] **GIT-04**: App produces the `AuthorEvidence` shape defined in `DESIGN.md`.

### Perspective Registry

- [ ] **PRS-01**: App has a central perspective registry with id, label, hotkey, schema, system prompt, and renderer.
- [ ] **PRS-02**: Hotkeys `1`, `2`, `3`, and `4` switch perspectives.
- [ ] **PRS-03**: Mental & emotional state perspective is the default.
- [ ] **PRS-04**: Mental perspective returns Mood, Stress level, Sleep debt, Caffeine probability, Hangover probability, and Confidence metrics.
- [ ] **PRS-05**: Skill perspective returns Inferred years of experience, Prior-language tells, Docs-read probability, Stack Overflow ratio, and Understanding-vs-passing-tests ratio.
- [ ] **PRS-06**: Context perspective returns Time pressure, On-a-call probability, Day-before-vacation energy, Resignation-coding score, and Manager-standing-behind-them score.
- [ ] **PRS-07**: Hidden narratives perspective returns the four narrative sections from `DESIGN.md`.

### AI Analysis

- [ ] **AI-01**: AI layer streams structured analysis through a provider-agnostic module boundary.
- [ ] **AI-02**: Anthropic is the default provider.
- [ ] **AI-03**: OpenAI support is installed and swappable from the provider module boundary.
- [ ] **AI-04**: Metric perspectives use a schema with author, 3-6 metrics, evidence strings, and up to 5 notes.
- [ ] **AI-05**: Prompts require calm forensic analyst tone, specific evidence citation, JSON-only output, and no jokes/asides/fourth-wall breaks.
- [ ] **AI-06**: Partial streamed metric results render progressively, one metric bar at a time.
- [ ] **AI-07**: Perspective changes trigger fresh streaming analysis; v1 does not cache previous results.
- [ ] **AI-08**: Model call failure has a visible error state and retry path.

### Demo Readiness

- [ ] **DEMO-01**: README explains install/run usage and the demo premise in one page.
- [ ] **DEMO-02**: Demo notes identify a target repo/file that produces reliable output.
- [ ] **DEMO-03**: Talk arc is preserved: open file, select author, stream analysis, switch perspectives, move to a second author.

## v2 Requirements

### Deferred Product Scope

- **V2-01**: Repo-wide analysis and rollups.
- **V2-02**: Persistent session history and cached results.
- **V2-03**: Comparing perspectives over time.
- **V2-04**: Team-level views.
- **V2-05**: Exports or sharing.
- **V2-06**: User configuration files.
- **V2-07**: Real `git` subcommand naming or PATH integration.
- **V2-08**: Mid-session provider/model switching UX.
- **V2-09**: Deterministic cache or seed mode for rehearsals.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Repo-wide analysis | v1 is single-file to preserve demo focus |
| Persistent result cache | v1 intentionally re-streams on every selection or perspective change |
| Export/share flows | Not needed for the live terminal demo |
| Configuration files | Default behavior is enough for v1 |
| Team views | The demo needs author comparison in one file only |
| Real git subcommand binary | Stretch goal, not required for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 2 | Pending |
| CLI-02 | Phase 2 | Pending |
| CLI-03 | Phase 1 | Complete |
| TUI-01 | Phase 1 | Complete |
| TUI-02 | Phase 2 | Pending |
| TUI-03 | Phase 3 | Pending |
| TUI-04 | Phase 5 | Pending |
| TUI-05 | Phase 1 | Complete |
| TUI-06 | Phase 7 | Pending |
| SEL-01 | Phase 3 | Pending |
| SEL-02 | Phase 3 | Pending |
| SEL-03 | Phase 5 | Pending |
| GIT-01 | Phase 2 | Pending |
| GIT-02 | Phase 4 | Pending |
| GIT-03 | Phase 4 | Pending |
| GIT-04 | Phase 4 | Pending |
| PRS-01 | Phase 5 | Pending |
| PRS-02 | Phase 6 | Pending |
| PRS-03 | Phase 5 | Pending |
| PRS-04 | Phase 5 | Pending |
| PRS-05 | Phase 6 | Pending |
| PRS-06 | Phase 8 | Pending |
| PRS-07 | Phase 8 | Pending |
| AI-01 | Phase 5 | Pending |
| AI-02 | Phase 5 | Pending |
| AI-03 | Phase 5 | Pending |
| AI-04 | Phase 5 | Pending |
| AI-05 | Phase 5 | Pending |
| AI-06 | Phase 5 | Pending |
| AI-07 | Phase 6 | Pending |
| AI-08 | Phase 7 | Pending |
| DEMO-01 | Phase 9 | Pending |
| DEMO-02 | Phase 9 | Pending |
| DEMO-03 | Phase 9 | Pending |

**Coverage:**

- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-06-02*
*Last updated: 2026-06-02 after initialization from DESIGN.md*
