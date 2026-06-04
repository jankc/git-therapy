## 1. Types

- [x] 1.1 Extend `RawCommit` in `src/types.ts` with `body: string`,
  `committerName: string`, `committerMail: string`, `committerDate: string`,
  `coAuthors: string[]`, `aiAssistTrailers: string[]`, and `renamedFrom: string | null`
  (with explanatory comments matching the file's style).

## 2. Git log capture + parsing (`src/git.ts`)

- [x] 2.1 Replace the `collectLog` pretty-format with the RS/US-separated format
  (`%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%cn%x1f%ce%x1f%cI%x1f%s%x1f%b`); add `--follow`; keep
  `--no-merges --numstat`.
- [x] 2.2 Extract an exported pure `parseGitLog(stdout: string): RawCommit[]`; have
  `collectLog` run git then delegate to it (mirror `collectBlame`/`parsePorcelainBlame`).
- [x] 2.3 In `parseGitLog`, split on `\x1e`, split fields on `\x1f`, and separate
  body from trailing numstat rows by peeling from the bottom using
  `/^(\d+|-)\t(\d+|-)\t/`; sum additions/deletions (`-` → 0).
- [x] 2.4 Detect renames from numstat path forms (`old => new` and `dir/{a => b}/file`) and
  set `renamedFrom`; `null` when not a rename.
- [x] 2.5 Add an exported pure `parseTrailers(body: string): { coAuthors: string[];
  aiAssistTrailers: string[] }` and call it from `parseGitLog`.

## 3. Tests

- [x] 3.1 Add fixture `src/__fixtures__/log.numstat.txt` (RS/US-delimited) covering: a
  multi-line body including a digit-leading line; committer ≠ author; human + AI/bot
  trailers; a rename row; a commit with no body/trailers.
- [x] 3.2 Add `src/git.test.ts` covering `parseGitLog` and `parseTrailers` against every
  scenario in the `git-evidence-capture` spec (body intact, committer fields, trailers,
  rename vs null, summed numstat, empty input).
- [x] 3.3 Update the `RawCommit` factory / inline literals in `src/evidence.test.ts` with
  the new fields (defaults: `body: ""`, committer = author, `coAuthors: []`,
  `aiAssistTrailers: []`, `renamedFrom: null`).

## 4. Verify & commit

- [x] 4.1 `bun test` — all pass, including new `git.test.ts`.
- [x] 4.2 `bunx tsc --noEmit` — clean.
- [x] 4.3 Smoke run: `bun run src/index.tsx src/evidence.ts` — app launches, authors
  populate, output unchanged vs. before.
- [x] 4.4 Commit: `feat: capture commit body, committer, trailers, and rename history`
  (no AI attribution per project + global rules).
