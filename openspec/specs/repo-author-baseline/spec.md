# Spec: Repo Author Baseline

## Purpose

Defines how an author's whole-repo commit history is collected, identity-resolved, and
reduced to a fixed-cardinality career baseline that sits beside the scoped-file evidence as
a second tier, so the analysis can diagnose how a file deviates from the author's own norm
without enlarging the model payload.

## Requirements

### Requirement: Repo-wide author history collection
The system SHALL provide a pure log-parsing path that, given an author identity, captures
that author's commit history across the entire repository (not scoped to the analyzed
file), via an author-filtered, rename-agnostic `git log --numstat` collected in the
pre-TUI evidence phase. The collection SHALL reuse the existing `RawCommit` shape so no
new commit-field parsing is introduced.

#### Scenario: Author with history beyond the scoped file
- **WHEN** repo-wide collection runs for an author who has committed to files other than the analyzed one
- **THEN** the parsed history includes their commits to those other files, each as a `RawCommit`, in addition to commits touching the analyzed file

#### Scenario: Author whose only commits are the scoped file
- **WHEN** repo-wide collection runs for an author whose entire repo history is the analyzed file
- **THEN** the parsed history equals that file's author commits and no error is raised

### Requirement: Mailmap identity resolution
Repo-wide collection SHALL resolve author identity through git's `.mailmap`
(`--use-mailmap`) so that commits made under different emails or names that map to a single
canonical identity are attributed to one author, rather than fragmenting one person across
multiple buckets.

#### Scenario: One human, multiple emails
- **WHEN** an author has committed under a work email and a personal/noreply email that `.mailmap` collapses to one canonical identity
- **THEN** the repo-wide history for that author includes the commits from both emails as a single bucket

#### Scenario: No mailmap present
- **WHEN** the repository has no `.mailmap`
- **THEN** identity falls back to the canonical email and collection still succeeds

### Requirement: Fixed-cardinality career baseline
The system SHALL reduce an author's repo-wide history to a `RepoBaseline` whose size is
independent of the number of commits — histograms of fixed bucket count (24-hour,
7-weekday), bounded top-N maps (commit-message word frequencies, file-extension/language
breakdown), and scalar aggregates (total repo commits, time span, night-owl ratio, weekend
ratio, session aggregates, churn-per-commit, fixup counts, co-author rate, AI-assist
trailer rate). The reducer SHALL be pure and deterministic, reusing the existing
`DerivedSignals` reducers where the metric is identical.

#### Scenario: Baseline size is bounded regardless of history length
- **WHEN** `RepoBaseline` is built for an author with very many commits and for an author with few commits
- **THEN** both baselines have the same set of fields with the same maximum cardinality (top-N maps capped, histograms of fixed length)

#### Scenario: Deterministic output
- **WHEN** the baseline reducer runs twice over the same history with the same reference time
- **THEN** it produces byte-identical `RepoBaseline` objects

### Requirement: Bounded raw sampling
The system SHALL cap any raw artifacts surfaced in the baseline — for example
representative commit messages or representative extreme commits — to a fixed top-K
selected by a deterministic salience rule, and SHALL NOT include the full history, so the
prompt payload cannot grow with repository size.

#### Scenario: Representative commits capped
- **WHEN** the baseline includes representative commits for an author with more commits than the cap
- **THEN** at most K commits are included, chosen by the deterministic salience rule, and the remainder are omitted

### Requirement: Two-tier evidence attachment
`AuthorEvidence` SHALL additively gain an optional `repoBaseline` field carrying the
author's `RepoBaseline`. The existing scoped-file fields SHALL be unchanged and remain the
primary evidence tier. When the field is absent, all existing consumers SHALL behave
exactly as before this change.

#### Scenario: Baseline attached when collection succeeds
- **WHEN** repo-wide collection and reduction succeed for an author
- **THEN** that author's `AuthorEvidence.repoBaseline` is populated and every pre-existing field retains its prior value and meaning

#### Scenario: Locked contract remains additive
- **WHEN** a consumer reads an `AuthorEvidence` produced with no repo baseline
- **THEN** `repoBaseline` is absent (undefined) and the consumer observes the identical shape it saw before this change

### Requirement: Graceful degradation
Repo-wide collection SHALL be tolerant of failure: if the second git pass errors, is
skipped, or yields no history beyond the scoped file, the evidence build SHALL still
complete with `repoBaseline` absent and the file-tier analysis unaffected.

#### Scenario: Repo pass fails
- **WHEN** the repo-wide git command errors (e.g. shallow clone, git failure)
- **THEN** the scoped-file evidence is still built, `repoBaseline` is absent, and the run proceeds without surfacing a fatal error

#### Scenario: Optional collection summary
- **WHEN** the repo-wide pass runs
- **THEN** its timing and commit count MAY be recorded on the evidence collection summary without altering existing summary fields
