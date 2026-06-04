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

Then either run it in place or install the `git-therapy` command on your `PATH`:

```bash
bun link            # makes `git-therapy` available globally
```

## Usage

```bash
git-therapy <path>[:<start>-<end>] [options]
```

Examples:

```bash
git-therapy src/app.ts                     # analyze the whole file
git-therapy src/app.ts:40-80               # analyze a 1-based line range
git-therapy src/app.ts -p zai --lang Czech # start on a provider / language
```

Options: `-p, --provider <id>`, `--model <name>`, `--lang <English|Czech>`,
`-h, --help`, `-v, --version`. Subcommands: `git-therapy providers` lists the
available providers and models, `git-therapy config [init]` shows (or scaffolds)
the config file.

> Running from source without linking works too: `bun run src/index.tsx <path>`.

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
providers live with `m`, pick the model with `M`, or pin a default with
`--provider` / `--model` (or in the config file below).

The built-in cloud providers require an API key in the environment:

| Provider           | Env var               |
| ------------------ | --------------------- |
| Z.ai (GLM)         | `Z_AI_API_TOKEN`      |
| OpenRouter (DeepSeek / Qwen) | `OPENROUTER_API_KEY` |
| Google (Gemini)    | `GEMINI_API_KEY`      |

Run `git-therapy providers` to see every provider, its models, and whether its key
is set.

### Config file

For anything beyond the defaults — adding models, adding a provider, pinning a
default — use the config file at `~/.config/git-therapy/config.json` (override the
path with `GIT_THERAPY_CONFIG`). Scaffold one with `git-therapy config init`:

```jsonc
{
  "default": { "provider": "ollama", "model": "qwen3.6:27b-mlx" },
  "language": "English",
  "providers": {
    // extend a built-in: add models to its cycle list
    "ollama": { "models": ["qwen3.6:27b-mlx", "gemma4:26b-mlx"] },
    // a brand-new OpenAI-compatible endpoint (local vLLM, a proxy, a new vendor)
    "work-proxy": {
      "baseURL": "http://10.0.0.5:8000/v1",
      "apiKey": "${WORK_PROXY_KEY}",
      "models": ["my-finetune"]
    }
  }
}
```

An `apiKey` is either a literal key or a `${ENV_VAR}` reference resolved from the
environment (so secrets can stay out of the file). Settings layer in this order,
each overriding the last: **built-in defaults → config file → env vars → CLI flags**.

## Disclaimer

This is a toy. The metrics are confabulations dressed as measurements; the model is
guessing from timestamps and word counts, and it guesses with a straight face. Do not
use its output in a performance review, a stand-up, or a court of law. Do not show a
colleague their "resignation-coding score." It will not improve your relationship with them.

It might, however, be the most honest your `git log` has ever been about you.
