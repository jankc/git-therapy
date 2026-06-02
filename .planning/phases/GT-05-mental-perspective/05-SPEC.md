# Phase 5: Mental Perspective - Specification

**Created:** 2026-06-02
**Ambiguity score:** 0.11 (gate: <= 0.20)
**Requirements:** 6 locked

## Goal

Selecting an author streams Mental & emotional state analysis from the model and renders evidence-cited metric bars progressively.

## Background

After Phase 4, the app can produce grounded git evidence. It still needs the AI provider boundary, perspective registry, prompt contract, streaming object schema, and analysis renderer that make the product first work end to end.

## Requirements

1. **AI provider boundary**: AI calls route through a provider-agnostic wrapper.
   - Current: No AI module exists.
   - Target: `src/ai/analyze.ts` streams structured analysis without coupling UI to a provider.
   - Acceptance: UI calls one analysis function independent of Anthropic/OpenAI implementation details.

2. **Default provider setup**: Anthropic is the default and OpenAI is swappable at the module boundary.
   - Current: AI SDK dependencies are not installed.
   - Target: Vercel AI SDK plus `@ai-sdk/anthropic` and `@ai-sdk/openai` are available.
   - Acceptance: Provider module selects Anthropic by default and exposes a clear swap seam.

3. **Perspective registry**: Registry defines Mental as the default perspective.
   - Current: No perspective model exists.
   - Target: Registry entry includes id, label, hotkey, Zod schema, system prompt, and `metrics` renderer.
   - Acceptance: App can read active perspective metadata from the registry.

4. **Prompt contract**: Mental prompt follows the shared forensic contract.
   - Current: No prompts exist.
   - Target: Prompt requires calm forensic analyst tone, specific evidence citation, metric set, JSON-only output, and no jokes/asides.
   - Acceptance: Prompt text includes all five system prompt contract rules from `DESIGN.md`.

5. **Metric schema**: Mental output matches the metrics schema.
   - Current: No schema exists.
   - Target: Result includes author, 3-6 metrics with value 0-100 and evidence, plus up to 5 notes.
   - Acceptance: Zod validation rejects missing evidence or out-of-range values.

6. **Streaming renderer**: Analysis pane renders progress as metric objects arrive.
   - Current: Analysis pane is static/empty.
   - Target: Pane shows analyzing state and fills metric bars progressively.
   - Acceptance: During a stream, partial results appear without waiting for final completion.

## Boundaries

**In scope:**
- AI SDK dependencies.
- Provider boundary.
- Mental perspective prompt and schema.
- Metric bar renderer.
- Analysis pane streaming state.

**Out of scope:**
- Skill, Context, and Hidden perspectives - later phases.
- Result caching - explicitly v2/deferred.
- Error/retry polish beyond basic failure visibility - Phase 7 owns full polish.

## Constraints

- Every metric must cite specific facts from `AuthorEvidence`.
- The model must return JSON only.
- Humor must come from the measured categories, not joke writing.
- Perspective or selected-author changes must be capable of starting fresh streams.

## Acceptance Criteria

- [ ] Selecting an author triggers a Mental analysis stream.
- [ ] Prompt contract includes all required forensic/evidence/JSON/no-joke constraints.
- [ ] Metric schema validates author, metrics, evidence, and notes.
- [ ] Metric bars render progressively while streaming.
- [ ] Anthropic is the default provider through a swappable module boundary.

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|-----------|-------|-----|--------|-------|
| Goal Clarity | 0.90 | 0.75 | met | First working AI slice is explicit |
| Boundary Clarity | 0.86 | 0.70 | met | Only Mental perspective in scope |
| Constraint Clarity | 0.88 | 0.65 | met | Prompt contract is detailed |
| Acceptance Criteria | 0.83 | 0.70 | met | Streaming and schema checks are pass/fail |
| **Ambiguity** | 0.11 | <=0.20 | met | Imported from DESIGN.md |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|-------|-------------|------------------|-----------------|
| import | Design import | What is the first end-to-end working slice? | Mental perspective streamed metric bars |

---
*Phase: GT-05-mental-perspective*
*Spec created: 2026-06-02*
*Next step: $gsd-discuss-phase 5 - implementation decisions*
