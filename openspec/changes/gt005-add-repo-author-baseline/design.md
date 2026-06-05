## Context

git-therapy collects evidence in a deterministic two-step pipeline: a pre-TUI git pass
gathers blame + scoped-file log, `evidence.ts` reduces it to per-author `AuthorEvidence`,
and only then is anything sent to the LLM. Unlike an agent (Claude Code) that traverses a
repo and decides what to read mid-flight, this tool must gather everything up front. That
is fine here because the pipeline is already a *reducer*: the LLM never sees raw git
output beyond the bounded scoped file — `derived`, `authorBaseline`, and `relativeToFile`
are all fixed-cardinality aggregates. The gt001–gt004 arc established this enrichment
pattern, each phase additively extending `AuthorEvidence`.

This change extends the same reducer to the author's whole-repo history so the temporal
lenses stop reasoning from samples of three commits, and so the model can diagnose
*deviation from a career baseline* — the single most valuable framing a one-file view
cannot offer.

## Goals / Non-Goals

**Goals:**
- Add an optional, fixed-cardinality `RepoBaseline` per author, collected in the same
  one-shot pre-TUI pass, so prompt size stays decoupled from repository size.
- Resolve author identity via `.mailmap` so a person isn't fragmented across emails.
- Let lenses cite file-vs-career deviation, with graceful fallback to today's behavior.
- Keep `AuthorEvidence` strictly additive — absent baseline ⇒ byte-for-byte today's flow.

**Non-Goals:**
- Repo-wide peer comparison (`relativeToRepo`, this author vs all contributors) — deferred;
  riskier (docs writer vs kernel hacker) and larger.
- Agentic thread-following for the Hidden Narratives lens — irreducibly out of the
  two-step model; explicitly accepted as the one place an agent would beat this tool.
- Changing the file-tier specimen (blamed lines/commits, scoped code) in any way.
- New UI panes for the baseline (a later, separable concern).

## Decisions

### Additive optional field on `AuthorEvidence`, not a sibling map
`AuthorEvidence` gains `repoBaseline?: RepoBaseline`. Lenses already receive
`AuthorEvidence`; threading a separate baseline map keyed by email through `llm.ts` and
every projection would duplicate the bucketing the contract already owns. This mirrors how
gt002 added `derived` and gt003 added `relativeToFile` — additive extension is the
established, low-ripple precedent. Optionality is what preserves the "locked contract"
guarantee: any consumer that ignores the field is unaffected, and absent-baseline runs are
indistinguishable from today.

### A second, author-scoped git pass — `git log --author=<email> --use-mailmap --numstat`
Reuse the existing `RawCommit` parser. Filtering by `--author` lets git do the narrowing
so we never buffer the whole repo log. `--use-mailmap` resolves identity. No `--follow`
(that is per-path; repo-wide is path-agnostic). Run it per analyzed author. Collect it in
`index.tsx` alongside the scoped pass; the two passes are independent and MAY run in
parallel. Alternative considered: one giant `git log --all --numstat` parsed once and
bucketed in-process — rejected because it buffers unbounded output and re-implements the
filtering git already does well.

### `RepoBaseline` reuses `DerivedSignals` reducers
Where a metric already exists (session clustering, temporal ratios, fixup chains,
churn-per-commit, word frequencies, hour histogram), call the same pure functions over the
repo-wide `EvidenceCommit[]`. New baseline-only fields: `totalRepoCommits`, `timeSpanDays`,
a 7-bucket `weekdayHistogram`, a bounded `languageBreakdown` (top-N file extensions by
commit/churn from `--numstat` paths), `coAuthorRate`, `aiAssistTrailerRate`, and an
optional bounded `representativeCommits` (top-K by a deterministic salience rule:
latest-night / largest-churn / most-fixup). Put the reducer in a new `src/core/baseline.ts`
to keep `evidence.ts` focused, importing the shared helpers.

### Fixed cardinality is the load-bearing invariant
The whole "without overwhelming the model" claim rests on every baseline field being either
a scalar, a fixed-length histogram, or a top-N/top-K cap. No field may be O(commits). This
is asserted as a spec scenario and should be a unit test (big-history author vs small-
history author ⇒ same field set, same max cardinality).

### Deviation projection in `perspectives.ts`, additive and gated
Each lens projection checks for `repoBaseline`; when present it emits a labeled
file-specimen-vs-career-baseline line for the lens's signal (mental ← night-owl/session,
context ← weekend/land-delay, etc.). When absent it returns exactly today's projection.
The grounded-citation requirement already in `perspective-prompts` covers the new figures
since they are concrete data.

### Reframe existing metrics, do not add any
The product value comes from turning each lens's *existing* metrics from absolute judgments
into deviation-from-personal-norm — not from new metrics, lenses, or user options (scope is
fixed at five lenses). The reframing is targeted per lens, in the `meaning`/wording of the
already-defined metrics: mental judges stress/sleep/caffeine relative to the author's career
night-owl/session norm; skill grounds inferred experience in career tenure + language breadth
and flags whether the file is in or outside their dominant languages; context reads
resignation/vacation as anomalies against repo-wide cadence (the biggest single win — a file
cannot see an author going quiet across the repo); ghostwriter judges AI-authorship as
deviation from the author's career style fingerprint + habitual AI-trailer rate. Hidden
Narratives is deliberately left unchanged — it reasons about the scoped code, not the
author's cross-repo norm, so the baseline does not help it. This keeps scope flat while
extracting the most value from the new data.

## Risks / Trade-offs

- **Collection latency on large monorepos** → author-filter + mailmap keep output bounded;
  run in parallel with the scoped pass; tolerate slowness and failure (degrade to
  no-baseline). Optionally cap with `--since`/`-n` if a budget is needed later.
- **Identity resolution is imperfect** (no `.mailmap`, typo'd emails) → fall back to
  canonical email; document that fragmentation is possible without a mailmap; do not
  attempt fuzzy merging in this phase.
- **Prompt dilution** (model conflates "this file" with "this person generally") → mitigate
  with explicit tier labels in the projection and a deviation framing rather than dumping
  baseline figures next to file figures unlabeled.
- **Asymmetric value across lenses** → accepted by design: Mental/Skill/Context gain most,
  Ghostwriter gains the AI-trailer rate, Hidden Narratives is unchanged (file-bound).
- **Privacy** → repo-wide profiling builds a fuller dossier on a person; the local-first
  Ollama default and the README's humane disclaimer remain the right posture. No new data
  leaves the machine that the user's chosen provider didn't already receive.

## Migration Plan

Purely additive; no data migration. Ships behind the natural feature gate of the optional
field: until `index.tsx` populates `repoBaseline`, every lens runs as today. Rollback is
removing the second pass call — the type stays optional and harmless. Land order: types →
collection + reducer (+ tests) → wire in `index.tsx` → deviation projections (+ tests).

## Open Questions

- Include `representativeCommits` (bounded raw sample) in this phase, or defer to keep the
  first cut purely aggregate? Leaning: include a small K (≈5) since "cite your sources"
  benefits from real shas, but it is separable.
- Should the baseline restrict to the file's language/extension by default, or stay
  whole-repo? Whole-repo is the stated intent; a language filter could be a later option.
- ~~Does the evidence pane need a "career baseline" view toggle, or is footer-only enough?~~
  **Resolved:** no new toggle or pane. The baseline is just more evidence, so it renders
  inside the existing `EvidenceView` in `WhatPane.tsx` (the `view: "evidence"` state already
  reached via `v`), shown for the selected author when `repoBaseline` is present and simply
  omitted when absent. No new selection, key, or focus target.
