## 1. Calibrate the metrics instruction

- [x] 1.1 Add explicit 0–100 scale anchors to `metricsInstruction` in `src/perspectives.ts` (0 = no evidence, ~50 = weak/ambiguous, 90+ = multiple converging signals)
- [x] 1.2 Add the high-score rule: any value above the chosen high threshold requires ≥2 distinct cited data points; lower the value when only one weak signal exists
- [x] 1.3 Add the thin-data guard: sparse evidence (few owned lines/commits) must yield low scores plus an explicit thin-evidence note
- [x] 1.4 Add the null-result license: contradicting evidence must produce a low score and a note, not a confabulated value
- [x] 1.5 Add one short illustrative few-shot exemplar metric object, clearly marked as an example (not data about the analyzed author)

## 2. Per-lens evidence projections

- [x] 2.1 Extract a shared `coreEvidence(e)` helper from the current `evidenceBlock` (author, lines, ranges, blamed lines, blamed commits, scope code)
- [x] 2.2 Add a comparative-standing projection from `relativeToFile` (rank/percentile/ratio for lens-relevant metrics) with a "sole author" branch when `authorCount === 1`
- [x] 2.3 Project mental-lens derived signals (sessions, night-owl ratio, profanity/intensity) into the `mental` prompt
- [x] 2.4 Project context-lens signals (committer divergence, weekend ratio, land-delay, commit body) into the `context` prompt
- [x] 2.5 Project ghostwriter-lens signals (naming/uniformity, AI-assist trailers) into the `ghostwriter` prompt
- [x] 2.6 Update `skill` and `hidden` prompts to consume the shared core + relevant derived/comparative slices, keeping the narrative lens free of metric-scale text
- [x] 2.7 Confirm every projection reads only existing `AuthorEvidence` / `DerivedSignals` / `RelativeToFile` fields (no new evidence shape)

## 3. Tests & verification

- [x] 3.1 Assert in `src/perspectives.test.ts` that every `metric-bars` system prompt carries the scale anchors, high-score threshold rule, thin-data guard, null-result license, and exemplar
- [x] 3.2 Assert the `hidden` (narrative) prompt omits metric-scale text but retains the citation requirement
- [x] 3.3 Assert each lens's `buildPrompt` surfaces its targeted derived signals plus the shared blamed-lines/blamed-commits core
- [x] 3.4 Assert comparative phrasing appears for a multi-author fixture and the "sole author" branch fires for a single-author fixture
- [x] 3.5 Run `bun test src/perspectives.test.ts` and `bunx tsc --noEmit`; manually run against a multi-author file to eyeball calibrated scores and comparative phrasing
