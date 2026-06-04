# git-evidence-capture Specification

## Purpose
TBD - created by archiving change gt001-enrich-evidence-data-capture. Update Purpose after archive.
## Requirements
### Requirement: Commit body capture
The system SHALL capture the full, multi-line commit message body (`%b`) for every
non-merge commit touching the scoped file, distinct from the subject.

#### Scenario: Multi-line body alongside numstat
- **WHEN** `parseGitLog` receives a commit whose body spans several lines — including a
  body line that begins with a digit — followed by `--numstat` rows
- **THEN** the returned `RawCommit.body` contains the complete body text, with no numstat
  rows appended and no lines truncated

#### Scenario: Empty body
- **WHEN** a commit has a subject but no body
- **THEN** `RawCommit.body` is an empty string and parsing of subsequent commits is
  unaffected

### Requirement: Committer metadata capture
The system SHALL capture the committer name (`%cn`), committer email (`%ce`), and
ISO-8601 committer date with offset (`%cI`) on each commit, distinct from the author
fields.

#### Scenario: Committer differs from author
- **WHEN** a commit was authored by one identity and committed by another (e.g. a rebase
  or cherry-pick)
- **THEN** `RawCommit.committerName` / `committerMail` / `committerDate` reflect the
  committer and remain distinct from `authorName` / `authorMail` / `isoDate`

### Requirement: Trailer extraction
The system SHALL parse the commit body for trailers, collecting `Co-authored-by:` entries
into `coAuthors` and AI-assistant attributions into `aiAssistTrailers`, via a pure
`parseTrailers` helper.

#### Scenario: Human and bot co-authors
- **WHEN** a body contains a human `Co-authored-by:` line and a separate trailer naming an
  AI assistant (e.g. Copilot, Claude, or a `[bot]` co-author)
- **THEN** `coAuthors` includes the human entry and `aiAssistTrailers` includes the AI
  entry

#### Scenario: No trailers present
- **WHEN** a body contains no trailer lines
- **THEN** both `coAuthors` and `aiAssistTrailers` are empty arrays

### Requirement: Rename-aware history
The system SHALL follow file renames when collecting log history (`--follow`) and record
the prior path on commits that renamed the scoped file.

#### Scenario: Commit that renamed the file
- **WHEN** a commit in the history renamed the scoped file from a prior path
- **THEN** that commit's `RawCommit.renamedFrom` is the prior path

#### Scenario: Commit that did not rename the file
- **WHEN** a commit modified the file without renaming it
- **THEN** that commit's `RawCommit.renamedFrom` is `null`

### Requirement: Pure, testable log parsing
The system SHALL expose log parsing as a pure function (`parseGitLog`) decoupled from git
invocation, summing additions and deletions across all numstat rows of a commit.

#### Scenario: Parse captured stdout
- **WHEN** `parseGitLog` is called with RS/US-delimited git log stdout containing numstat
  rows
- **THEN** it returns one `RawCommit` per commit with `additions` / `deletions` summed
  across numstat rows (binary `-` rows contributing 0)

#### Scenario: Empty input
- **WHEN** `parseGitLog` receives an empty string
- **THEN** it returns an empty array

