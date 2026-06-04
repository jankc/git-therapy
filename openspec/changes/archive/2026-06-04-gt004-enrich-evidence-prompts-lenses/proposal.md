## Why

The prompts under-constrain the model: 0–100 metric values cluster at 50/70, citations are
requested but not enforced, thin-data authors get confident confabulation, and all five
lenses receive an identical evidence block despite wanting different signals. This is
Phase 4 — the final phase — where the lenses finally consume the richer evidence captured
and derived in Phases 1–3.

## What Changes

- **Calibrate the 0–100 scale** in `metricsInstruction`: explicit anchors (0 = no
  evidence, 50 = weak/ambiguous, 90+ = multiple converging signals) and a rule that values
  above a threshold require ≥2 distinct cited data points.
- **Thin-data guard**: when an author owns few lines / commits, scores stay low and notes
  must flag the evidence as thin.
- **Citation enforcement**: require each `evidence` string to quote a real sha / line
  number / token, or add a structured `citations` field to `MetricsSchema`.
- **Null-result license**: instruct the model to score low and say so when evidence
  contradicts a metric's premise, rather than confabulating.
- **One-line few-shot** exemplar metric object to lock the clinical register and cut Zod
  retries.
- **Per-lens tailored evidence blocks**: replace the shared `evidenceBlock` with
  lens-specific projections (Ghostwriter ← naming/AI-trailer signals; Mental ← sessions /
  night-owl / profanity; Context ← committer divergence / weekend / body), plus
  **cross-author comparative phrasing** from Phase 3.

## Capabilities

### New Capabilities
- `perspective-prompts`: how each lens's system prompt, schema, and per-lens evidence
  projection constrain and ground the model's output.

### Modified Capabilities
<!-- None at spec level; the prompt behavior is captured as a new capability. -->

## Impact

- `src/perspectives.ts` — calibration, guards, citations, few-shot, per-lens evidence.
- `src/ai.ts` — possibly (schema/citation plumbing, temperature per renderer).
- `src/perspectives.test.ts` — prompt/schema assertions.
- Depends on Phases 1–3; this is where the enriched evidence finally changes LLM output.

## Dependencies

- **Order:** Phase 4 of 4 — final.
- **Depends on:** `gt001-enrich-evidence-data-capture` (✅ implemented),
  `gt002-enrich-evidence-derived-aggregates`, `gt003-enrich-evidence-cross-author` — consumes the
  captured + derived + comparative signals from all three.
- **Blocks:** none.
- **Status:** ⏳ Proposal only — specs / design / tasks deferred until Phases 1–3 land.
