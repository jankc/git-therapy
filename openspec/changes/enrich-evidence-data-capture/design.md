## Context

`src/git.ts` shells out to git and parses the results; per the file header, "the parsing is
what carries the unit tests." Today `collectLog` builds `RawCommit[]` with an **inline**
parser using an SOH-delimited single header line per commit followed by `--numstat` rows.
The parser keys on each line: a line starting with SOH begins a commit; a line matching
`/^\d+|^-/` is treated as a numstat row. This is fragile for multi-line bodies — a body
line beginning with a digit would be misread as numstat — which is exactly why the body is
not captured today. `parsePorcelainBlame` in `src/blame.ts` is the model to follow: a pure,
exported, fixture-tested parser.

## Goals / Non-Goals

**Goals:**
- Capture `body`, committer name/mail/date, co-author / AI-assist trailers, and
  `renamedFrom` on `RawCommit`.
- Make body capture robust against numstat ambiguity.
- Extract a pure, exported `parseGitLog` and `parseTrailers` so both are unit-testable.
- Keep LLM output byte-for-byte unchanged (no consumer of the new fields yet).

**Non-Goals:**
- Any derivation (sessions, minute precision, `isAmend`, divergence booleans) — that is
  Phase 2.
- Touching `AuthorEvidence`, `evidence.ts` logic, or any prompt — later phases.
- Adding committer fields to `BlameLine` (divergence is derived at commit level from the
  log; blame joins to commits by sha).

## Decisions

- **Separators over SOH.** New pretty-format:
  `%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%cn%x1f%ce%x1f%cI%x1f%s%x1f%b`. Record separator `\x1e`
  starts each commit; unit separator `\x1f` delimits fields; `%b` is last so it may contain
  newlines. Keep `--no-merges --numstat`; add `--follow`.
- **From-bottom numstat/body split.** Split stdout on `\x1e`, drop the empty leading chunk.
  In each chunk, split on `\x1f`: fields 0–7 are clean single-line values; the final
  segment is `body` followed by trailing numstat rows. Walk the final segment's lines from
  the **bottom**, peeling off the contiguous run that matches the strict numstat shape
  `/^(\d+|-)\t(\d+|-)\t/`; everything above is the body. This is robust against body lines
  that begin with a digit (the current inline parser is not).
- **Rename detection.** A numstat rename row carries a path with `=>` (either
  `old => new` or the brace form `dir/{a => b}/file`). When present, reconstruct the prior
  path and set `renamedFrom`; otherwise `null`.
- **`parseTrailers(body)` pure helper.** Regex over body lines: `Co-authored-by:` →
  `coAuthors`. An entry is additionally classified into `aiAssistTrailers` when it matches
  `/copilot|claude|chatgpt|gpt|cursor|aider/i`, or when a line matches
  `/generated with|assisted-by/i` or a `co-authored-by` naming a `[bot]`.
- **`collectLog` delegates** to `parseGitLog(out)`, mirroring how `collectBlame` delegates
  to `parsePorcelainBlame`.

## Risks / Trade-offs

- **Pathological body ending in a numstat-shaped line.** A body whose final line literally
  matches `/^(\d+|-)\t(\d+|-)\t/` (tab-separated, leading number) could be mis-split. This
  is rare in real commit messages (tabs in bodies are unusual), and the from-bottom peel is
  strictly better than today's whole-line digit heuristic. Documented as an accepted edge.
- **`--follow` semantics.** `--follow` works per single file and changes which commits are
  returned (includes pre-rename history). This is intended (better coverage); it slightly
  changes the commit set for renamed files, but no current consumer depends on the exact
  set.
- **New required `RawCommit` fields** ripple into the `evidence.test.ts` factory. Mitigated
  by updating the factory with safe defaults in this phase; `evidence.ts` itself ignores the
  new fields until Phase 2.
