# Spec: Perspective Prompts

## Purpose

Defines the calibrated prompt contract and per-lens evidence projections used by the
analysis perspectives, so each LLM interpretation remains grounded in concrete git evidence
while surfacing the signals relevant to that lens.

## Requirements

### Requirement: Calibrated 0–100 metric scale
The metrics instruction SHALL define explicit anchors for the 0–100 scale so that values
are grounded rather than clustering at default midpoints. The instruction SHALL state that
0 means no supporting evidence, a low band (around 50) means weak or ambiguous evidence,
and a high band (90+) requires multiple converging signals. The anchor text SHALL be shared
by every metric-bars lens via the common `metricsInstruction`.

#### Scenario: Anchors present in every metric-bars system prompt
- **WHEN** the system prompt is built for any `metric-bars` lens (mental, skill, context, ghostwriter)
- **THEN** the prompt text states the meaning of the 0, ~50, and 90+ bands of the scale

#### Scenario: Narrative lens unaffected by metric anchors
- **WHEN** the system prompt is built for the `hidden` (narrative) lens
- **THEN** it does not carry the metric-scale anchor text, since it produces sections rather than scored metrics

### Requirement: High scores require multiple cited data points
The metrics instruction SHALL require that any metric value above a stated high threshold be
justified by at least two distinct cited data points (for example two different shas, line
numbers, or signal tokens), and SHALL instruct the model to lower the value when only a
single weak signal is available.

#### Scenario: Threshold rule stated in the prompt
- **WHEN** a `metric-bars` system prompt is built
- **THEN** the prompt states that a value above the high threshold requires at least two distinct cited data points

### Requirement: Thin-data guard
The metrics instruction SHALL direct the model to keep scores low and to flag the evidence
as thin in its notes when the author owns few lines or few commits, rather than producing
confident scores from sparse evidence.

#### Scenario: Thin-data instruction present
- **WHEN** a `metric-bars` system prompt is built
- **THEN** the prompt instructs the model that sparse evidence (few owned lines or commits) must yield low scores and an explicit thin-evidence note

### Requirement: Grounded evidence citations
Every metric's `evidence` string and every narrative `body` SHALL be required to quote a
concrete artifact drawn from the provided git data: a sha, a line number, a weekday/hour,
a word-frequency token, or a derived/comparative figure, rather than unsupported assertion.
The persona contract that enforces "cite specific evidence" and "invent no facts" SHALL be
retained and SHALL apply to all five lenses.

#### Scenario: Citation requirement applies to all lenses
- **WHEN** the system prompt is built for any of the five lenses
- **THEN** the prompt requires each metric `evidence` string or narrative `body` to quote a concrete datum from the supplied evidence

### Requirement: Null-result license
The metrics instruction SHALL grant the model explicit license to score a metric low and say
so when the evidence contradicts that metric's premise, instead of confabulating a plausible
value. This SHALL be stated as permitted and expected behavior, not an error condition.

#### Scenario: Contradiction handling stated
- **WHEN** a `metric-bars` system prompt is built
- **THEN** the prompt states that evidence contradicting a metric's premise must produce a low score with a note explaining the contradiction

### Requirement: Few-shot exemplar anchors the register
The metrics instruction SHALL include a single short exemplar metric object that demonstrates
the expected clinical register and a grounded evidence citation, so the model locks onto the
desired tone and shape and Zod retries are reduced. The exemplar SHALL be illustrative only
and SHALL NOT be presented as real evidence about the current author.

#### Scenario: Exemplar present and marked illustrative
- **WHEN** a `metric-bars` system prompt is built
- **THEN** it contains one exemplar metric object and labels it as an illustrative example rather than data about the analyzed author

### Requirement: Per-lens evidence projection
Each lens SHALL build its user prompt from a lens-specific projection of `AuthorEvidence`
rather than a single shared evidence block, surfacing the signals that lens reasons about.
The projection SHALL always include the primary blamed-lines and blamed-commits evidence, and
SHALL additionally surface lens-relevant derived signals: the ghostwriter lens SHALL surface
naming/uniformity and AI-assist trailer signals; the mental lens SHALL surface session,
night-owl, and profanity/intensity signals; the context lens SHALL surface committer
divergence, weekend, land-delay, and commit-body signals. Projections SHALL draw only from
fields that exist on `AuthorEvidence` (including `derived` and `relativeToFile`).

#### Scenario: Each lens projects its own evidence
- **WHEN** the user prompt is built for a given lens from the same `AuthorEvidence`
- **THEN** the prompt includes that lens's targeted derived signals in addition to the shared primary blamed-lines and blamed-commits evidence

#### Scenario: Projections reference only existing evidence fields
- **WHEN** any lens projection is rendered
- **THEN** it reads only fields present on `AuthorEvidence`, `DerivedSignals`, and `RelativeToFile`, introducing no new evidence-shape requirements

### Requirement: Cross-author comparative phrasing
Lens prompts SHALL surface the author's `relativeToFile` standing (rank, percentile, and
ratio-to-median for the lens-relevant metrics) in comparative phrasing, so the model can make
grounded claims relative to the file's other authors. For a single-author file the prompt
SHALL frame the standing as "sole author" rather than presenting a meaningless comparison.

#### Scenario: Comparative standing surfaced for multi-author file
- **WHEN** a lens prompt is built for an author in a file with more than one author
- **THEN** the prompt includes that author's rank and/or percentile for the lens-relevant comparison metrics

#### Scenario: Single-author framing
- **WHEN** a lens prompt is built for an author who is the file's only author
- **THEN** the comparative section frames the author as the sole author rather than reporting a degenerate rank-1-of-1 comparison as if it were meaningful
