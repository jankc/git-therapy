## Context

Phase 2 (`gt002-enrich-evidence-derived-aggregates`, now archived) shipped a `derived:
DerivedSignals` block on every `AuthorEvidence`, plus an `AuthorBaseline` — sharp, citable
per-author numbers (`nightOwlRatio`, `weekendRatio`, `avgCommitsPerSession`,
`fixupCommitCount`, `avgMessageLength`, …). Each is an **absolute** figure. A lens reading
"nightOwlRatio: 0.6" cannot tell whether 0.6 is unremarkable for this file or a glaring
outlier — every other author here may sit at 0.7, or at 0.05.

`buildAuthorEvidence` (`src/evidence.ts`) currently builds each author's evidence in a single
independent pass over that author's own lines and commits, then sorts by `linesAuthored`.
Every author for the scoped file is already materialized in that one call, so the data needed
to say "you commit at night 4× more than anyone else here" is in hand — it just isn't
computed. This phase adds that comparison.

`evidence.ts` is a collection of small, pure, individually-tested functions composed into the
build. This phase follows the same grain: distribution math is its own pure helper with its
own test, and the build gains a second pass that consumes it.

## Goals / Non-Goals

**Goals:**
- Compute **file-level distributions** (median + rank ordering) across all authors of the
  scoped file for a fixed set of key aggregates.
- Attach a **`relativeToFile` block** to each `AuthorEvidence` carrying, per metric, the
  author's value, the file median, ratio-to-median, rank, and percentile — so each author's
  evidence states how they compare to their peers in the same file.
- Restructure `buildAuthorEvidence` into a **two-pass build**: pass 1 builds every author's
  evidence as today; pass 2 computes the distributions and attaches `relativeToFile`.
- Keep the whole computation **pure and deterministic** — no new clock or randomness; the
  metrics derive entirely from already-built evidence.

**Non-Goals:**
- Any new prompt or lens schema change to *consume* `relativeToFile` — that is Phase 4
  (`gt004-enrich-evidence-prompts-lenses`). This phase only produces the comparison data.
- Cross-**file** or cross-repository comparison. The comparison set is exactly the authors of
  the one scoped file, nothing wider.
- New per-author signals. This phase compares existing aggregates; it does not invent new
  behavioral metrics (with the single exception of `churnPerCommit`, a trivial mean over
  already-captured `additions`/`deletions`).
- Statistical sophistication beyond median/rank/percentile (no z-scores, no distribution
  fitting). See Risks.

## Decisions

- **A `relativeToFile` block, parallel to `derived`.** `derived` holds an author's own
  numbers; `relativeToFile` holds how those numbers stand against peers. Keeping them as
  separate sibling blocks on `AuthorEvidence` mirrors the Phase 2 decision to separate
  background `AuthorBaseline` from foreground `derived`, and keeps the new capability
  (`cross-author-comparison`) visibly distinct in the contract.

- **A uniform `RelativeStat` per metric.** Every compared metric yields the same shape so
  lenses cite it uniformly:
  ```ts
  interface RelativeStat {
    value: number;         // this author's value for the metric
    median: number;        // file-wide median across all authors
    ratioToMedian: number; // value / median (1 = at median), 0 when median is 0
    rank: number;          // 1-based; rank 1 = highest value, ties share the lower rank
    percentile: number;    // [0,1], fraction of authors with value <= this author's
  }
  ```
  `RelativeToFile` is then a fixed record of named `RelativeStat` fields plus an
  `authorCount` so a lens knows the size of the comparison set ("highest of 2" lands
  differently from "highest of 9").

- **A fixed, named metric set.** The compared metrics are declared once as a list of
  descriptors `{ key, extract: (e: AuthorEvidence) => number }` at the top of `evidence.ts`,
  so adding/removing a compared metric is a one-line change and pass 2 stays generic. The
  initial set, drawn from the proposal's "key aggregates":
  `nightOwlRatio`, `weekendRatio`, `avgCommitsPerSession`, `longestSessionMinutes`,
  `avgMessageLength`, `totalFileCommits`, `fixupCommitCount`, `linesAuthored`, and
  `churnPerCommit` (mean `additions + deletions` over an author's blamed commits, `0` when
  there are none).

- **Two-pass build, comparison as a distinct pass.** `buildAuthorEvidence` keeps its current
  per-author work as pass 1, producing an interim list *without* `relativeToFile`. Pass 2
  runs the pure `attachRelativeStats(authors)` (or equivalent) which, for each metric, gathers
  the values across all authors, computes the median and ranks once, then writes a
  `RelativeStat` back onto each author. The author-ordering sort (`linesAuthored` desc) stays
  the final step, unaffected by which pass computes what.

- **Median, rank, percentile semantics.**
  - *Median*: sort the metric's values ascending; the middle element, or the mean of the two
    middle elements for an even count.
  - *Rank*: 1-based with rank 1 = the **highest** value (outliers are what lenses care about);
    equal values share the lower (better) rank.
  - *Percentile*: fraction of authors with value `<=` this author's value, in `[0, 1]`; the
    top author is `1`.
  - *ratioToMedian*: `value / median`, rounded to two decimals; guarded to `0` when the
    median is `0` to avoid `Infinity`/`NaN` (documented limitation).

- **Single-author files are well-defined, not special-cased.** With one author, every metric's
  median equals that author's value, so `ratioToMedian` is `1`, `rank` is `1`, `percentile`
  is `1`, and `authorCount` is `1`. The generic pass produces this naturally; no branch
  needed. The block is therefore **always present** on `AuthorEvidence` (never optional),
  preserving the locked-contract guarantee that every field a lens may read exists.

- **Rounding for tidy, stable output.** `ratioToMedian` and `percentile` are rounded to two
  decimals (the same spirit as Phase 2's one-decimal `ageDays`) so serialized evidence is
  compact and byte-stable across runs.

## Risks / Trade-offs

- **Median/rank over a tiny N is crude.** Most files have a handful of authors; "percentile"
  over 3 authors is coarse. → Accepted: the goal is comparative *framing* for an LLM, not
  statistical rigor. `authorCount` travels with the block so a lens (Phase 4) can hedge
  language for small N, and the metric set is centralized for later tuning.

- **`ratioToMedian` collapses to 0 when the median is 0.** If most authors have
  `fixupCommitCount: 0`, the median is 0 and a prolific fixer's ratio reads `0`, understating
  them. → Mitigated: `rank` and `percentile` still surface that author as the top outlier, so
  no signal is lost; the ratio is the lossy view, and the guard is documented on the field.

- **`AuthorEvidence` shape grows again.** This is another deliberate, sequenced edit to the
  "locked" contract: a new required `relativeToFile` block is added, but nothing existing is
  removed or retyped, so lens output is byte-for-byte unchanged until Phase 4 chooses to cite
  it. `evidence.test.ts` factories gain a default `relativeToFile` (or build through
  `buildAuthorEvidence`, which now always populates it).

- **Two-pass coupling.** Pass 2 depends on every author already being built, so the metric
  extractors read final per-author fields. → Low risk: extractors are pure reads of fields
  fixed in Phase 2; they are declared next to the build and covered by tests that assert the
  attached stats against a known multi-author fixture.

- **Metric-set drift vs. Phase 4.** Phase 4 will decide which comparisons to actually quote;
  the set chosen here is a superset guess. → The descriptor list makes pruning trivial, and an
  unused `RelativeStat` costs only a few bytes of evidence, so over-providing is cheap and
  reversible.
