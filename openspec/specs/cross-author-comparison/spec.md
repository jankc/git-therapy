# Spec: Cross-Author Comparison

## Purpose

Defines the cross-author comparison that expresses each author's key aggregates relative to
all authors of the same scoped file, so that lenses can make comparative claims without
re-deriving distributions at inference time. The comparison is computed as a pure,
deterministic second pass over the per-author evidence built by the first pass.

## Requirements

### Requirement: Per-author evidence carries comparison to file peers
The system SHALL attach to each author's `AuthorEvidence` a `relativeToFile` block that
expresses that author's key aggregates relative to all authors of the same scoped file, so
that lenses can make comparative claims without re-deriving distributions at inference time.
The block SHALL always be present, including when the file has a single author.

#### Scenario: Block present for every author
- **WHEN** `buildAuthorEvidence` returns evidence for a multi-author file
- **THEN** every returned `AuthorEvidence` carries a `relativeToFile` block, and its
  `authorCount` equals the number of authors compared (all authors of the file)

#### Scenario: Single-author file is well-defined
- **WHEN** the scoped file has exactly one author
- **THEN** that author's `relativeToFile` is present with `authorCount` of 1, and every
  metric reports `rank` 1, `percentile` 1, and `ratioToMedian` 1 (the author is their own
  median) rather than being undefined, NaN, or absent

### Requirement: File-level distribution per compared metric
The system SHALL compute, across all authors of the scoped file, a file-level median for each
metric in a fixed comparison set, and SHALL express each author's standing on that metric as
value, median, ratio-to-median, rank, and percentile. The comparison set SHALL include the
key behavioral aggregates: night-owl ratio, weekend ratio, session intensity
(`avgCommitsPerSession`, `longestSessionMinutes`), message length, total file commits, fixup
count, lines authored, and churn per commit.

#### Scenario: Median across authors
- **WHEN** a metric's values across the file's authors have a well-defined middle
- **THEN** the reported `median` is the middle value for an odd author count and the mean of
  the two middle values for an even author count

#### Scenario: Ratio to median
- **WHEN** an author's value for a metric is twice the file median for that metric
- **THEN** that metric's `ratioToMedian` is 2 (the value divided by the median)

#### Scenario: Comparison set covers the key aggregates
- **WHEN** `relativeToFile` is built for an author
- **THEN** it carries a `RelativeStat` for each metric in the fixed comparison set, including
  `nightOwlRatio`, `weekendRatio`, `avgCommitsPerSession`, `longestSessionMinutes`,
  `avgMessageLength`, `totalFileCommits`, `fixupCommitCount`, `linesAuthored`, and
  `churnPerCommit`

### Requirement: Rank and percentile ordering
The system SHALL rank authors on each metric with rank 1 assigned to the highest value, and
SHALL report a percentile in [0, 1] equal to the fraction of authors whose value is at or
below the author's own. Equal values SHALL share the same rank.

#### Scenario: Highest value ranks first
- **WHEN** one author has a strictly greater value than all others for a metric
- **THEN** that author's `rank` for the metric is 1 and `percentile` is 1

#### Scenario: Tied values share a rank
- **WHEN** two authors have identical values for a metric
- **THEN** they are assigned the same `rank` for that metric

#### Scenario: Percentile bounds
- **WHEN** percentiles are computed for a metric
- **THEN** every author's `percentile` lies within [0, 1] and the lowest-valued author's
  percentile reflects the fraction of authors at or below them

### Requirement: Churn-per-commit metric
The system SHALL compute, per author, a `churnPerCommit` value equal to the mean of
`additions + deletions` over that author's blamed commits, used as one of the compared
metrics, and SHALL define it as 0 when the author has no blamed commits.

#### Scenario: Mean churn over blamed commits
- **WHEN** an author has blamed commits with known additions and deletions
- **THEN** `churnPerCommit` is the mean of `additions + deletions` across those commits

#### Scenario: No blamed commits
- **WHEN** an author owns blamed lines but has no blamed commits
- **THEN** `churnPerCommit` is 0 rather than undefined or NaN

### Requirement: Two-pass, pure, deterministic comparison
The system SHALL compute the cross-author comparison in a second pass over the per-author
evidence built by the first pass, keeping the computation pure and deterministic and exposing
the distribution math as an independently testable function. A zero file-median SHALL be
guarded so that `ratioToMedian` is a finite number (0) rather than Infinity or NaN.

#### Scenario: Same inputs yield same comparison
- **WHEN** `buildAuthorEvidence` is called twice with identical lines, commits, scope, and
  reference time
- **THEN** it returns identical `AuthorEvidence`, including every `relativeToFile` field

#### Scenario: Zero median guarded
- **WHEN** the file-level median for a metric is 0
- **THEN** each author's `ratioToMedian` for that metric is the finite value 0, while `rank`
  and `percentile` still distinguish any author whose value exceeds 0

#### Scenario: Existing locked output preserved
- **WHEN** the `relativeToFile` block is added to `AuthorEvidence`
- **THEN** all pre-existing fields (including the Phase 2 `derived` block) retain their prior
  shape and values, so lens output is unchanged until a later phase chooses to cite the
  comparison
