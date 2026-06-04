# git-therapy

> `git blame` tells you who. `git therapy` tells you why (for God's sake).

`git-therapy` is a forensic instrument for the human condition as it manifests in
version control. Point it at a tracked file and it will read the `git blame`, the
commit timestamps, the word frequencies in commit messages, the ratio of additions
to deletions — and from this evidence it will infer, with clinical confidence, the
**mood, stress level, sleep debt, and caffeine probability** of the people who wrote it.

It is, to be clear, a TUI that asks a language model to guess whether you were
hungover when you committed `fix: actually fix it this time`. It does this very seriously.

## What it does

You give it a file. It collects real evidence from your repository — blamed lines,
blamed commits, commit hours, weekday distribution, line ranges, surrounding source
context — and presents that evidence to a model under a strict instruction to behave
like a calm, slightly pretentious lab report and to **cite its sources**.

The verdict is rendered as labeled metric bars and short narrative findings. Every
claim is, in principle, evidence-based. Whether "Sleep debt: 78 / 100 — three commits
landed between 02:14 and 03:51, additions outpacing deletions 4:1, consistent with
caffeinated despair" constitutes *science* is left as an exercise for the user.

## The lenses

Cycle between five perspectives on the same evidence:

- **Mental & Emotional State** — mood, stress, sleep debt, caffeine probability, hangover probability, confidence.
- **Skill & Experience** — inferred years of experience, prior-language tells, docs-read probability, Stack Overflow ratio, understanding-vs-passing-tests ratio.
- **Context & Circumstances** — time pressure, on-a-call probability, day-before-vacation energy, resignation-coding score, manager-standing-behind-them score.
- **Hidden Narratives** — the bug being secretly worked around, the previous author this code is judging, the age of "temporary," what was deleted from the comment before committing.
- **The Ghostwriter** — the probability an AI wrote this code, and the stylistic tells behind that judgment.

## Install

Requires [Bun](https://bun.sh).

```bash
bun install
```

## Usage

```bash
bun run src/index.tsx <path>[:<start>-<end>]
```

Examples:

```bash
bun run src/index.tsx src/app.ts          # analyze the whole file
bun run src/index.tsx src/app.ts:40-80     # analyze a 1-based line range
```

The file must be tracked in the current git repository — there is no blame data,
and therefore no diagnosis, for code that was never committed. (Make of that what you will.)

### Keys

| Key     | Action                          |
| ------- | ------------------------------- |
| `Tab`   | move between panes              |
| `↑ / ↓` | move the selection              |
| `Enter` | run the examination             |
| `m`     | cycle model / provider          |
| `l`     | toggle language (English / Czech) |
| `Esc`   | cancel a running analysis       |
| `q`     | quit                            |

## Models & providers

By default `git-therapy` talks to a **local [Ollama](https://ollama.com)** instance,
so your colleagues' psychological profiles never leave your machine. You can switch
providers live with `m`, or set `GIT_THERAPY_PROVIDER`.

Cloud providers require an API key in the environment:

| Provider           | Env var               |
| ------------------ | --------------------- |
| Z.ai (GLM)         | `Z_AI_API_TOKEN`      |
| OpenRouter (DeepSeek / Qwen) | `OPENROUTER_API_KEY` |
| Google (Gemini)    | `GEMINI_API_KEY`      |

Ollama model selection can be overridden with `OLLAMA_MODEL`.

## Disclaimer

This is a toy. The metrics are confabulations dressed as measurements; the model is
guessing from timestamps and word counts, and it guesses with a straight face. Do not
use its output in a performance review, a stand-up, or a court of law. Do not show a
colleague their "resignation-coding score." It will not improve your relationship with them.

It might, however, be the most honest your `git log` has ever been about you.
