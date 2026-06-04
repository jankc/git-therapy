# git-therapy — agent notes

A TUI that reads a file's `git blame` + commit history and asks an LLM to "diagnose"
the authors. See `README.md` for the user-facing pitch and the five lenses.

## Stack

- **Runtime:** Bun (not Node). No build step — Bun runs `.tsx` directly.
- **UI:** OpenTUI React (`@opentui/react` / `@opentui/core`) + React 19. Terminal, not DOM.
- **LLM:** Vercel AI SDK via `@ai-sdk/openai-compatible` — provider-agnostic (Ollama,
  DeepSeek, Qwen, Z.ai, Gemini, Kimi). No native OpenAI dep. Zod validates model output.

## Commands

- Run: `bun run src/index.tsx <path>[:<start>-<end>]` (file must be git-tracked).
- Dev watch: `bun run dev`.
- Test: `bun test` (Bun's runner), or a single file: `bun test src/blame.test.ts`.
- Typecheck: `bunx tsc --noEmit` — there is **no** typecheck script; run it directly.

## Module map (`src/`)

- `index.tsx` — entry: parse args, collect git evidence, mount the TUI.
- `App.tsx` — root: pane layout, focus cycling (Tab), selection state, the run flow.
- `git.ts` / `blame.ts` — shell to git; parse `git blame --line-porcelain` → `BlameLine[]`.
- `evidence.ts` — aggregate blame+log into per-author `AuthorEvidence` (buckets by email).
- `ai.ts` — providers (each owns multiple models), model build, streaming analysis,
  JSON extraction + Zod retry. A selection is a `(providerId, model)` pair (`ModelSelection`).
  Built-in providers are merged with the user config in a lazy, memoized `registry()`;
  `ProviderId` is a plain `string` (config can introduce new providers).
- `config.ts` — loads/validates `~/.config/git-therapy/config.json` (Zod) and resolves
  `apiKey` values (`${VAR}` env refs or literal keys). AI-agnostic; `ai.ts` owns the merge.
- `perspectives.ts` — the 5 lenses: each its own system prompt + Zod schema.
- `useAnalysis.ts` — React hook for the analysis lifecycle (idle→loading→done/error).
- `types.ts` — shared types. `panes/*.tsx` — one component per pane.

## Conventions & gotchas

- **OpenTUI primitives:** `<box> <text> <span> <select> <scrollbox>`. Style with `fg="#hex"`
  and `attributes={TextAttributes.DIM | BOLD}`; layout via flex props (`flexGrow`, `gap`,
  `flexDirection`). Per-pane color constants at the top of each pane file
  (`NEUTRAL`/`ACCENT`/`GUTTER`); reuse them rather than inventing colors.
- **Selection sets intent only.** Changing author/lens/model/language does *not* run the
  model — analysis fires only on Enter (`App.tsx` `startAnalysis`). Results are cached by
  `(author|lens|provider:model|language)` so revisiting a combo is instant.
- **Providers own multiple models.** `BUILTIN_PROVIDERS` in `ai.ts` maps a provider
  (endpoint + key) to a list of models; the TUI cycles provider with `m` and model with
  `M` (shift). The user config can extend or add providers (see `config.ts`); the merged
  set + cycle order come from `registry()`/`providerOrder()`, not a static const.
  Precedence: built-in defaults < config file < env vars < CLI flags. The startup default
  is `ollama` (local, no key) so the app runs out of the box — keep it first in
  `BUILTIN_ORDER` unless you deliberately want a key-required default.
- **`AuthorEvidence` is a locked contract.** Its shape is fed unchanged to all 5 lenses;
  changing it ripples into `ai.ts` and every schema in `perspectives.ts`. Touch with care.

## Commit messages

No AI attribution of any kind in commits/PRs (no `Co-Authored-By`, no "Generated with"
footer, no mention of Claude/AI).
