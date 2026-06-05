## ADDED Requirements

### Requirement: File-vs-career deviation projection
When an `AuthorEvidence.repoBaseline` is present, each lens projection SHALL surface the
scoped-file signals against the author's career baseline as a deviation framing (for
example, this file's night-owl ratio versus the author's repo-wide night-owl ratio), so
the model is grounded to diagnose how *this file* departs from the author's norm rather
than restating absolute traits. The projection SHALL clearly label the two tiers as the
file specimen and the career baseline so they are not conflated. When `repoBaseline` is
absent, the projection SHALL fall back to the existing file-only behavior unchanged.

#### Scenario: Deviation framing present with a baseline
- **WHEN** a lens user prompt is built from an `AuthorEvidence` that has a `repoBaseline`
- **THEN** the prompt presents the relevant scoped-file signal alongside the matching career-baseline figure, labeled as file-specimen versus career-baseline

#### Scenario: Fallback when no baseline
- **WHEN** a lens user prompt is built from an `AuthorEvidence` whose `repoBaseline` is absent
- **THEN** the projection is identical to the pre-change file-only projection for that lens

#### Scenario: Baseline cited, not just present
- **WHEN** the deviation framing is rendered for a lens
- **THEN** the career-baseline figure is a concrete datum the model may quote under the existing grounded-citation requirement, sourced only from fields that exist on `repoBaseline`

### Requirement: Per-lens baseline reframing
When `repoBaseline` is present, each lens SHALL reframe its existing metrics to ask whether
this file deviates from the author's own norm, rather than adding new metrics or new lenses.
The reframing SHALL be targeted per lens: each lens surfaces the baseline counterpart of the
signal it already reasons about and instructs the model to read the named metric relative to
that baseline. No metric, schema field, or lens SHALL be added or removed by this reframing,
and the absent-baseline behavior SHALL remain the pre-change behavior for every lens.

#### Scenario: Mental lens anchors intensity to the author's norm
- **WHEN** the mental lens prompt is built with a `repoBaseline`
- **THEN** the projection surfaces the author's career night-owl/session figures and instructs that stress, sleep debt, and caffeine/hangover metrics be judged high or low relative to that personal norm rather than in absolute terms

#### Scenario: Skill lens grounds experience in repo tenure and breadth
- **WHEN** the skill lens prompt is built with a `repoBaseline`
- **THEN** the projection surfaces career time span and language breakdown so that inferred experience and prior-language influence are grounded in actual tenure and the languages the author works in, and signals whether the scoped file's language is within or outside the author's dominant languages

#### Scenario: Context lens reads circumstances against repo cadence
- **WHEN** the context lens prompt is built with a `repoBaseline`
- **THEN** the projection surfaces the author's repo-wide activity cadence so that resignation-coding and day-before-vacation metrics are judged as anomalies against their overall rhythm rather than from the scoped file alone

#### Scenario: Ghostwriter lens judges AI authorship as style discontinuity
- **WHEN** the ghostwriter lens prompt is built with a `repoBaseline`
- **THEN** the projection surfaces the author's career style fingerprint (message style, naming/uniformity) and AI-assist trailer rate so that AI-authorship probability is judged as deviation from the author's established style and habitual AI use

#### Scenario: Hidden lens is unchanged by the baseline
- **WHEN** the hidden-narratives lens prompt is built with a `repoBaseline`
- **THEN** its file- and line-scoped projection is unchanged, since this lens reasons about the scoped code itself rather than the author's cross-repo norm
