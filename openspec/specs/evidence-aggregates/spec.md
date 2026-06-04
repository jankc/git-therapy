# Spec: Evidence Aggregates

## Purpose

Defines the derived signals and aggregate computations that the system produces from raw
git blame and commit data, enriching each author's `AuthorEvidence` beyond the Phase 1
captured fields. All derivations are pure and deterministic.

## Requirements

### Requirement: Minute-precision local time
The system SHALL expose the local minute alongside the local hour and weekday derived
from a commit's own UTC offset, so that session and timing signals are minute-accurate.

#### Scenario: Minute extracted with offset
- **WHEN** `localParts` receives an ISO-8601 timestamp with a non-zero offset (e.g.
  `2026-03-01T23:47:00+02:00`)
- **THEN** it returns `minute` (here `47`) computed under that offset, and `hour` /
  `weekday` are unchanged from their prior behavior

#### Scenario: Minute surfaced on each commit
- **WHEN** an `EvidenceCommit` is built for any commit
- **THEN** it carries `minuteLocal` (0–59) consistent with its `hourLocal`

### Requirement: Coding session clustering
The system SHALL cluster each author's commits into coding sessions by gap, where a new
session begins whenever the gap to the previous commit is unknown or exceeds a fixed
threshold (~90 minutes), and summarize those sessions per author.

#### Scenario: Commits split into sessions by gap
- **WHEN** an author's time-sorted commits contain two clusters separated by a gap greater
  than the session threshold
- **THEN** the author's derived signals report `sessionCount` of at least 2 and a
  `longestSessionCommits` count reflecting the larger cluster

#### Scenario: Single isolated commit
- **WHEN** an author has exactly one commit
- **THEN** `sessionCount` is 1, `longestSessionMinutes` is 0, and
  `avgCommitsPerSession` is 1

#### Scenario: Latest-ending session hour
- **WHEN** sessions are computed for an author
- **THEN** `latestEndingHourLocal` is the local hour of the last commit of the session
  that ends latest in the day

### Requirement: Temporal ratios
The system SHALL compute, per author, the fraction of commits made during night hours
(22:00–04:59 local) and during weekends (Saturday/Sunday), each as a scalar in [0, 1].

#### Scenario: Night-owl ratio
- **WHEN** half of an author's commits fall in the 22:00–04:59 local window
- **THEN** `nightOwlRatio` is 0.5

#### Scenario: Weekend ratio with no weekend commits
- **WHEN** none of an author's commits fall on Saturday or Sunday
- **THEN** `weekendRatio` is 0

#### Scenario: Author with no commits
- **WHEN** an author owns blamed lines but has no associated commits
- **THEN** `nightOwlRatio` and `weekendRatio` are both 0 rather than undefined or NaN

### Requirement: Subject-to-churn mismatch
The system SHALL flag commits whose subject wording contradicts their diff size, marking
trivial-sounding subjects with large churn and sweeping-sounding subjects with negligible
churn.

#### Scenario: Trivial subject, large churn
- **WHEN** a commit subject reads like a minor change (e.g. "minor tweak") but its
  `additions + deletions` is at or above the large-churn threshold
- **THEN** that commit's `subjectChurnMismatch` is `"trivial-large"`

#### Scenario: Sweeping subject, tiny churn
- **WHEN** a commit subject reads like a sweeping change (e.g. "massive refactor") but its
  `additions + deletions` is at or below the tiny-churn threshold
- **THEN** that commit's `subjectChurnMismatch` is `"sweeping-tiny"`

#### Scenario: Consistent subject and churn
- **WHEN** a commit's subject wording and churn size do not contradict
- **THEN** its `subjectChurnMismatch` is `null`

### Requirement: Fixup chains
The system SHALL identify fixup-style commits by subject wording and report, per author,
the count of consecutive fixup runs (the corrective-spiral signal) and the total fixup
commit count.

#### Scenario: Consecutive fixups form a chain
- **WHEN** an author has two or more fixup-worded commits in immediate time sequence
  (e.g. "fix", "oops typo", "actually fix it")
- **THEN** `fixupChainCount` counts that maximal run as one chain and each commit's
  `isFixup` is true

#### Scenario: Isolated fixup is not a chain
- **WHEN** a single fixup commit sits between two non-fixup commits
- **THEN** it contributes to `fixupCommitCount` but not to `fixupChainCount`

### Requirement: Line age
The system SHALL compute, per blamed line, its age in days from the line's author time to a
single captured reference time, and summarize the oldest and newest line age per author.

#### Scenario: Age from a fixed reference time
- **WHEN** evidence is built with an explicit reference time `now`
- **THEN** each blamed line's `ageDays` equals `(now − authorTime)` expressed in days
  (never negative), making the computation deterministic and testable

#### Scenario: Author age spread
- **WHEN** an author owns blamed lines spanning a range of ages
- **THEN** `oldestLineAgeDays` and `newestLineAgeDays` bound that range

### Requirement: In-code scans
The system SHALL scan an author's blamed line text for citable code-shape and sentiment
signals, returning counts that lenses can quote directly.

#### Scenario: Annotation markers counted
- **WHEN** an author's blamed lines contain `TODO`, `FIXME`, or `HACK`/`XXX` markers
- **THEN** the scan reports per-marker counts (`todos`, `fixmes`, `hacks`)

#### Scenario: Shape and sentiment signals
- **WHEN** the scan runs over blamed code
- **THEN** it reports code-shape signals (e.g. `maxLineLength`, `maxNestingDepth`,
  `magicNumbers`) and sentiment signals (e.g. `exclamations`, `allCapsTokens`) as
  non-negative counts

#### Scenario: No blamed lines
- **WHEN** an author has no blamed lines
- **THEN** every scan count is 0

### Requirement: Commit provenance signals
The system SHALL derive committer-divergence, land-delay, and an amend heuristic from the
Phase 1 committer fields, replacing the previously stubbed `isAmend`.

#### Scenario: Committer differs from author
- **WHEN** a commit's committer identity differs from its author identity
- **THEN** that commit's `committerDiverged` is true and `landDelayMinutes` reflects the
  whole-minute difference between committer date and author date

#### Scenario: Amend heuristic
- **WHEN** a commit's committer identity equals its author identity but the committer date
  is later than the author date
- **THEN** that commit's `isAmend` is true (a documented heuristic), and is false when the
  dates coincide

#### Scenario: No committer metadata divergence
- **WHEN** committer and author identity and timestamps coincide
- **THEN** `committerDiverged` is false, `isAmend` is false, and `landDelayMinutes` is 0

### Requirement: Pure, deterministic derivation
The system SHALL keep all derived-signal computation pure and deterministic, exposing each
signal as an independently testable function and threading any reference-time dependency as
an explicit parameter rather than reading the clock internally.

#### Scenario: Same inputs yield same output
- **WHEN** `buildAuthorEvidence` is called twice with identical lines, commits, scope, and
  reference time
- **THEN** it returns identical `AuthorEvidence`, including every derived field

#### Scenario: Existing locked output preserved
- **WHEN** the derived signals are added to `AuthorEvidence`
- **THEN** all pre-existing fields retain their prior shape and values, so lens output is
  unchanged until a later phase chooses to cite the new signals
