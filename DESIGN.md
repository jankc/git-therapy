# git-therapy

> git blame tells you who. git therapy tells you why.

A terminal UI tool that analyzes git history through different
interpretive lenses and presents findings as a forensic report.
The aesthetic mirrors `git blame`; the output is intentionally absurd
but grounded in real git evidence.

---

## 1. Premise

Standard `git blame` annotates lines with author and timestamp.
`git-therapy` annotates the same data with inferred properties of
the human moment the code was written in — sleep debt, stress level,
years of experience, time pressure, hidden narratives, etc.

The inferences come from an LLM. The grounding comes from real git
data: commit timestamps, message contents, diff sizes, frequency,
adjacent commits, time-of-day patterns. Every metric in the output
must cite specific evidence from this data.

The comedy lives in the gap between the deadpan clinical
presentation and the absurd thing being measured. The tool itself
plays it straight.

---

## 2. Scope of v1

### In scope
- Single-file analysis (`git therapy blame <path>`)
- Three-pane TUI: code (left), authors (middle), analysis (right)
- Single-author selection with arrow keys + space/enter
- Four interpretive perspectives, switchable by hotkey
- Live streaming of the analysis as the model produces it
- Provider-agnostic model layer (Anthropic by default, swappable)

### Out of scope for v1
- Repo-wide analysis or rollups
- Persistent session history
- Comparing perspectives over time
- Team views
- Exports, sharing, configuration files
- Acting as a real `git` subcommand (binary naming for PATH integration is a stretch goal, not required)

---

## 3. User experience

### Invocation

    git-therapy ./path/to/file.ts

Optional line range:

    git-therapy ./path/to/file.ts:40-120

### The screen

Three columns, always visible:

- **Left (~60%)**: source file with `git blame` prefix per line
  (short SHA, author, date). Lines belonging to the currently-
  selected author are subtly highlighted.
- **Middle (~20%)**: list of authors who touched the scope, with
  their line-count share. Select the highlighted author with
  space or enter; navigate with arrow keys.
- **Right (~20%)**: analysis pane. For the selected author, a block
  showing 3–5 metric bars and a short "evidence" bullet list.
  Footer shows the available perspective hotkeys.

### Interactions

- ↑/↓ in authors pane: move cursor
- Space/Enter: select highlighted author
- 1–4: switch perspective (Mental, Skill, Context, Hidden)
- Tab: cycle focus between panes
- q: quit

### Behavioral details

- When the perspective changes, the right pane re-streams from
  the model. The left and middle panes do not change.
- When the author selection changes, the right pane re-streams
  for the newly-selected author. Previous results are NOT cached
  in v1 — every change triggers a fresh call (caching is a v2
  decision).
- The analysis pane shows a clear "analyzing…" state with the
  perspective name while streaming.
- Partial results render progressively: metric bars fill in
  one at a time as the streamed JSON arrives.

---

## 4. The four perspectives

Each perspective defines: a label, hotkey, set of metrics it
produces, and a system prompt. Same git evidence feeds all of them;
only the prompt and schema differ. This is the architectural seam
that lets the demo show "one input, four prompts, four analyses."

### 4.1 Mental & emotional state (hotkey 1, default)
Metrics: Mood, Stress level, Sleep debt, Caffeine probability,
Hangover probability, Confidence

### 4.2 Skill & experience (hotkey 2)
Metrics: Inferred years of experience, Prior-language tells,
Docs-read probability, Stack Overflow ratio, Understanding-vs-
passing-tests ratio

### 4.3 Context & circumstances (hotkey 3)
Metrics: Time pressure, On-a-call probability, Day-before-vacation
energy, Resignation-coding score, Manager-standing-behind-them score

### 4.4 Hidden narratives (hotkey 4)
Output shape differs slightly here — narrative paragraphs rather
than metric bars. Sections: The bug being secretly worked around,
The previous author this code is judging, The age of "temporary",
What was deleted from the comment before committing.

The first three perspectives share a metric-bar shape. The fourth
is the wildcard and gets its own renderer. This is intentional —
demonstrating that different prompts can yield different output
structures is itself a useful talk point.

---

## 5. Architecture

### Stack
- Runtime: Bun
- TUI: opentui (React binding)
- LLM: Vercel AI SDK with `@ai-sdk/anthropic` (default) and
  `@ai-sdk/openai` installed; provider chosen at module boundary
- Git access: `simple-git`
- Schema validation: Zod (via AI SDK's `streamObject`)

### File layout (proposed; gsd-core may reshape)

    src/
      index.tsx              # opentui entry, App component, keymap
      state.ts               # app state (scope, authors, perspective, results)
      git/
        blame.ts             # `git blame --line-porcelain` → typed lines
        log.ts               # per-author commit history in scope
        evidence.ts          # aggregates blame + log into LLM input shape
      perspectives/
        registry.ts          # central registry: id, label, hotkey, schema, prompt
        emotional.ts
        skill.ts
        context.ts
        hidden.ts
      ai/
        analyze.ts           # provider-agnostic streamObject wrapper
      components/
        CodePane.tsx
        AuthorsPane.tsx
        AnalysisPane.tsx
        MetricBar.tsx
        NarrativeBlock.tsx   # for perspective 4

### Key contracts

**Git evidence shape** (what gets fed to the LLM, per author):

```ts
type AuthorEvidence = {
  author: { name: string; email: string };
  linesAuthored: number;
  lineRanges: Array<[number, number]>;
  commits: Array<{
    sha: string;
    timestamp: string;       // ISO
    weekday: string;
    hourLocal: number;
    message: string;
    additions: number;
    deletions: number;
    isAmend: boolean;
    minutesSincePrevious: number | null;
  }>;
  aggregates: {
    totalCommits: number;
    hourHistogram: Record<number, number>;
    avgMessageLength: number;
    wordFrequencies: Record<string, number>; // "fix", "wip", "revert", "actually", "ugh", "finally"
    timeSpanDays: number;
  };
  scopeCode: string;          // the lines in this scope, with line numbers
};
```

**Perspective registry entry:**

```ts
type Perspective = {
  id: string;
  label: string;
  hotkey: '1' | '2' | '3' | '4';
  schema: ZodSchema;          // shape of the streamed object
  systemPrompt: string;
  renderer: 'metrics' | 'narrative';
};
```

**Metric-bar perspective schema:**

```ts
const MetricsResultSchema = z.object({
  author: z.string(),
  metrics: z.array(z.object({
    name: z.string(),
    value: z.number().min(0).max(100),
    evidence: z.string(),     // must cite specific facts from input
  })).min(3).max(6),
  notes: z.array(z.string()).max(5),
});
```

---

## 6. The system prompt contract

Each perspective's system prompt must:

1. Establish the persona as a forensic analyst, not a therapist
   or comedian. Tone is calm, clinical, slightly pretentious.
2. Require every metric to cite specific evidence from the
   provided git data. No invented facts.
3. Specify the metric set for that perspective.
4. Forbid jokes, asides, or fourth-wall breaks. The humor must
   come from what is measured, not how it is presented.
5. Return ONLY the JSON object matching the schema.

A shared preamble lives in `perspectives/registry.ts` and each
perspective appends its specific metric list and any tonal nudges.

---

## 7. Build order

Implementation must proceed in this order. Each step produces a
demonstrable artifact.

1. **opentui shell** — three empty bordered panes, keyboard
   navigation skeleton, hotkeys registered but no-op.
2. **Git blame parser** — `simple-git` integration; load a real
   file from this repo and render real blame data in the left
   pane. No analysis yet.
3. **Authors pane** — derive authors from blame data; render the
   list with line-count percentages; arrow keys + space/enter selection
   working.
4. **Evidence collector** — `git/evidence.ts` produces the full
   AuthorEvidence shape for the selected author. Unit-testable.
5. **First perspective end-to-end** — wire `streamObject` with
   the Mental & emotional state prompt; render metric bars as they
   stream. This is the moment the tool first works.
6. **Second perspective** — add Skill & experience. Verify the
   hotkey switching re-streams correctly.
7. **Polish pass** — line highlighting for the selected author,
   loading states, error handling, color choices.
8. **Third and fourth perspectives** — Context, then Hidden
   (with its narrative renderer).
9. **Demo prep** — pick a target repo and file that produces good
   output reliably, write a one-page README.

The cut line for the talk is end of step 6. Steps 7–9 are polish.

---

## 8. Open questions

These are deliberately left open. Decide when you hit them.

- **Provider default vs swap UX**: Anthropic is the default. Should
  a hotkey or flag let the user switch model mid-session for the
  "watch the same prompt run on three models" demo? Decision can
  wait until after step 6.
- **Streaming UX for the narrative perspective**: chunk by section
  or stream as plain text? Likely plain text with section headers
  appearing first.
- **Error states**: what does the right pane show if the model
  call fails mid-stream? At minimum, a retry hotkey.
- **Determinism for the demo**: live by default; if reliability
  is a problem at rehearsal, add a `--seed` flag and a cache.

---

## 9. The talk arc this enables

The architecture is shaped to support a specific 90-second demo:

1. Open the tool on a real file. Three panes appear.
2. Select an author. Watch the analysis stream in.
3. Switch perspective with a hotkey. Same author, same code,
   completely different reading.
4. Cycle through all four perspectives.
5. Move to a second author. Watch the same perspective re-run.
6. Closing slide: "this is one app with four prompts. Here is
   what changing the prompt changed."

Every architectural decision above is in service of that arc. If
a decision doesn't help the demo land or the code stay small, it
belongs in v2.
