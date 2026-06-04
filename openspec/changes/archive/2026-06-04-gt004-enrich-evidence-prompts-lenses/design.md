## Context

This is Phase 4 of 4 — the final phase. Phases 1–3 enriched `AuthorEvidence` with captured
commit metadata (`gt001`), precomputed behavioral aggregates in `derived: DerivedSignals`
(`gt002`), and cross-author comparison in `relativeToFile: RelativeToFile` (`gt003`), all now
archived and shipped. Today none of that enrichment reaches the model: `src/perspectives.ts`
builds every lens's prompt from one shared `evidenceBlock(e)` that serializes only
`author`, `linesAuthored`, `lineRanges`, `blamedLines`, `blamedCommits`, `authorBaseline`,
and `scopeCode` — `derived` and `relativeToFile` are silently dropped.

The prompts also under-constrain the model. `metricsInstruction` asks for "each 0-100 with an
evidence string" but defines no scale anchors, so values gravitate to 50/70; citations are
requested but not enforced; thin-data authors get confident confabulation; and contradictory
evidence has no sanctioned "score it low" path.

Constraints that bound this work:
- `AuthorEvidence` is a locked contract (see `CLAUDE.md`). This phase **consumes** it; it
  introduces no new evidence fields. All projections read existing fields only.
- `ai.ts` is the only file that imports the AI SDK. It calls `perspective.system`,
  `perspective.buildPrompt(evidence)`, and `perspective.schema.parse(...)`. Any prompt change
  must keep that interface intact.
- Output is structured via prompt-for-JSON + Zod, with one bounded retry. There is no native
  `json_schema` reliance (Ollama/Kimi lack it). The few-shot exemplar must therefore live in
  the prompt text, not a schema feature.
- The default provider is local `ollama` running a small Qwen model; prompts must stay terse
  enough to fit modest context windows and not bloat token cost.

## Goals / Non-Goals

**Goals:**
- Calibrate the 0–100 scale with explicit anchors and a "high score needs ≥2 citations" rule.
- Add a thin-data guard and an explicit null-result license to the metrics instruction.
- Enforce grounded citations for every metric `evidence` string and narrative `body`.
- Add one short few-shot exemplar metric object to lock register and cut Zod retries.
- Replace the single shared `evidenceBlock` with per-lens projections that surface the
  `derived` and `relativeToFile` signals each lens actually reasons about.
- Cover the new prompt behavior with assertions in `src/perspectives.test.ts`.

**Non-Goals:**
- No change to `AuthorEvidence`, `DerivedSignals`, or `RelativeToFile` shapes.
- No change to the evidence-capture, aggregation, or comparison passes (Phases 1–3).
- No new provider, model, or language; no change to the registry/selection logic.
- No UI/pane changes — the renderers (`metric-bars`, `narrative`) and schemas are unchanged
  except where a citation field is added (see Decisions).
- No attempt to make model output deterministic; tests assert on prompt/schema construction,
  not on live model responses.

## Decisions

### Citations: enforce in prose, not a new schema field
The proposal floats two options: require `evidence` to quote a real token, or add a structured
`citations` array to `MetricsSchema`. **Decision: keep the existing `evidence: string` field
and enforce grounding through prompt instruction + the persona contract**, rather than adding
a `citations` array.

Rationale: the small local models that are the default target already struggle with schema
validity (hence the retry path in `ai.ts`). Adding a required nested array raises the
validation surface and retry rate for marginal structural gain — a quoted sha/line inside the
`evidence` string is equally checkable by a human reading the pane and equally groundable by
the model. Keeping the schema stable also means no renderer change. Alternative (structured
`citations`) is revisitable later if grounding proves too weak, but is deliberately out of
scope here to protect the retry budget.

### Per-lens projections via a shared core + lens extras
Replace `evidenceBlock(e)` with a small set of composable helpers: a `coreEvidence(e)` block
(author, lines, ranges, blamed lines, blamed commits, scope code — the primary evidence every
lens needs) plus per-lens `derived`/`relativeToFile` projections appended by each lens's
`buildPrompt`.

Rationale: the primary blamed evidence is the grounding floor for all five lenses and must not
be lens-specific (a single source of truth for "what this author actually wrote"). Only the
*derived* and *comparative* slices differ by lens, so only those are projected per lens. This
keeps each prompt focused (mental gets sessions/night-owl/profanity; context gets committer
divergence/weekend/land-delay/body; ghostwriter gets naming-uniformity/AI-assist trailers)
without duplicating the core block five times. Alternative — five fully independent blocks —
was rejected as more code and more drift risk for no benefit.

### Calibration, guard, null-result, and exemplar live in `metricsInstruction`
All four metric-side prompt upgrades are added to the single `metricsInstruction` helper so
every metric-bars lens inherits them uniformly, and the narrative lens (`hidden`) is left
untouched by metric-scale text. The persona contract (`PERSONA`) is retained verbatim as the
citation/anti-confabulation backbone and extended only where the new rules are metric-specific.

Rationale: one helper, four lenses — centralizing keeps the lenses consistent and the tests
simple (assert once on the helper output). The exemplar is a single inline object marked
"example only" so it cannot be mistaken for real author data.

### Comparative phrasing degrades gracefully for single-author files
`relativeToFile` is always present and, per `gt003`, reports rank 1 / percentile 1 / ratio 1
for a sole author. The projection special-cases `authorCount === 1` to phrase the author as
"sole author of this file" rather than emitting a meaningless "rank 1 of 1" that the model
might over-read as a superlative.

## Risks / Trade-offs

- **[Longer prompts raise token cost and may crowd small local context windows]** → Keep each
  projection terse: surface only the handful of lens-relevant figures, not the full `derived`
  object; reuse compact `JSON.stringify` for structured slices; the exemplar is one line.
- **[Prompt-only citation enforcement is soft — a model can still fabricate a plausible sha]**
  → Accepted for now (see Decisions). The persona's "invent no facts" plus the "quote a
  concrete datum" rule is the mitigation; a structured `citations` field remains a future
  option if grounding proves insufficient in practice.
- **[Per-lens prompt divergence could drift from the locked `AuthorEvidence` shape over time]**
  → Projections read typed fields only; `bunx tsc --noEmit` catches any field rename, and the
  tests assert each lens surfaces its expected signals.
- **[The few-shot exemplar could leak into output as if it were real data]** → Mark it
  explicitly as an illustrative example and keep its values obviously generic.

## Migration Plan

Pure prompt/serialization change inside `src/perspectives.ts` (plus tests). No data
migration, no config change, no schema-breaking change for cached results (cache key already
includes lens + model + language). Rollback is reverting the `perspectives.ts` diff; no state
persists. Verify with `bun test src/perspectives.test.ts` and `bunx tsc --noEmit`, then a
manual run against a multi-author file to eyeball the calibrated scores and comparative
phrasing.

## Open Questions

- Should the high-score citation threshold be a fixed constant (e.g. 75) or expressed as a
  band ("upper third")? Leaning fixed for testability; resolve during implementation.
- Is one exemplar enough to stabilize the register across all four metric lenses, or does the
  ghostwriter lens (different framing) want its own? Default to one shared exemplar; revisit
  if ghostwriter retries stay high.
