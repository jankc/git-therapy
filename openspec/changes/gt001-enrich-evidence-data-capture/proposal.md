## Why

git-therapy infers author psychology from `git blame` + `git log`, but today it captures
only a thin slice of the available evidence: the commit subject, author time/tz, and
numstat totals. Rich forensic signals — the commit body, committer-vs-author divergence,
co-author / AI-assistant trailers, and rename history — are discarded before the LLM ever
sees them. This is Phase 1 of a 4-phase effort and widens the raw capture so later phases
can derive and exploit those signals.

## What Changes

- Extend `RawCommit` with: `body`, `committerName`, `committerMail`, `committerDate`,
  `coAuthors`, `aiAssistTrailers`, and `renamedFrom`.
- Replace the `git log` pretty-format with an RS/US-separated format (`%x1e`/`%x1f`) so
  multi-line bodies parse unambiguously alongside `--numstat`; add `--follow` so history
  survives renames.
- Extract the log parsing into a pure, exported `parseGitLog(stdout)` (mirroring
  `parsePorcelainBlame`) and add a pure `parseTrailers(body)` helper, so both are
  unit-testable without shelling out to git.
- No change to LLM output: nothing consumes the new fields until Phase 4. `AuthorEvidence`
  (the locked contract) is **not** modified in this phase.

## Capabilities

### New Capabilities
- `git-evidence-capture`: what raw git data (blame + log) is collected and parsed into the
  typed `RawCommit` / `BlameLine` records that feed the evidence pipeline.

### Modified Capabilities
<!-- None: no main specs exist yet; this introduces the first capability. -->

## Impact

- `src/types.ts` — extend `RawCommit`.
- `src/git.ts` — new format + `--follow`; extract `parseGitLog`; add `parseTrailers`;
  rename + from-bottom numstat parsing.
- `src/git.test.ts` *(new)* + `src/__fixtures__/log.numstat.txt` *(new)*.
- `src/evidence.test.ts` — update the `RawCommit` test factory for the new fields.
- No runtime/UX change; output is identical until later phases consume the fields.
