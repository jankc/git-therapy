// Entry point: parse target -> preflight key -> collect git evidence -> mount TUI.

import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { parseTarget, type Target } from "./args";
import { defaultSelection, modelLabel, PROVIDER_ORDER } from "./ai";
import { collect } from "./git";
import { buildAuthorEvidence } from "./evidence";
import { App } from "./App";
import pkg from "../package.json";

function fail(message: string): never {
  console.error(`git-therapy: ${message}`);
  process.exit(1);
}

const HELP = `git-therapy — psychoanalyze a file's authors from its git history

Usage:
  git-therapy <path>[:<start>-<end>]

Arguments:
  <path>            a git-tracked file to analyze
  :<start>-<end>    optional 1-based line range (e.g. src/app.ts:40-80)

Options:
  -h, --help        show this help and exit
  -v, --version     show version and exit

Keys (inside the TUI):
  Tab    move between panes        m / M  cycle provider / model
  ↑ / ↓  move the selection        l      toggle language (English / Czech)
  Enter  run the examination       Esc    cancel a running analysis
  q      quit

Providers (set GIT_THERAPY_PROVIDER, or switch live with m; M picks the model):
  ${PROVIDER_ORDER.join(", ")}
  Defaults to local Ollama (no key); cloud providers need an API key:
  OPENROUTER_API_KEY (openrouter: deepseek/qwen), Z_AI_API_TOKEN (zai), GEMINI_API_KEY (gemini).`;

const rawArg = process.argv[2];
if (rawArg === "-h" || rawArg === "--help") {
  console.log(HELP);
  process.exit(0);
}
if (rawArg === "-v" || rawArg === "--version") {
  console.log(`git-therapy ${pkg.version}`);
  process.exit(0);
}
if (!rawArg) {
  fail("usage: git-therapy <path>[:<start>-<end>]  (try --help)");
}

let target: Target;
try {
  target = parseTarget(rawArg);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

let blame, commits, scopeCode;
try {
  ({ blame, commits, scopeCode } = await collect(target));
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

if (blame.length === 0) {
  fail(`no blame data for ${target.file} — is it a tracked file in this repo?`);
}

const authors = buildAuthorEvidence(blame, commits, scopeCode);

console.error(`git-therapy: ${authors.length} author(s), model ${modelLabel(defaultSelection())}`);

const renderer = await createCliRenderer();

// Safety net: if the process exits by any path that bypasses renderer.destroy()
// (crash, signal), still disable mouse tracking and leave the alt screen so the
// shell isn't left emitting mouse-escape gibberish.
process.on("exit", () => {
  process.stdout.write("\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?1049l");
});

createRoot(renderer).render(<App file={target.file} blame={blame} authors={authors} />);
