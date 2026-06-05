#!/usr/bin/env bun
// Entry point: parse argv -> (subcommand | help | version) or
// preflight key -> collect git evidence -> mount TUI.

import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { parseInvocation, type Target } from "./args";
import {
  defaultLanguage,
  defaultSelection,
  listProviders,
  modelLabel,
  providerOrder,
  startupSelection,
  parseLanguage,
  LANGUAGES,
  type Language,
  type ModelSelection,
} from "./ai";
import { configExists, configPath, initConfig } from "./config";
import { collect } from "./git";
import { buildAuthorEvidence } from "./evidence";
import { App } from "./App";
import type { EvidenceCollectionSummary } from "./types";
import pkg from "../package.json";

function fail(message: string): never {
  console.error(`git-therapy: ${message}`);
  process.exit(1);
}

function helpText(): string {
  // Help must work even when the config file is broken (you're reading help to
  // fix it), so fall back to the built-in names if the registry won't build.
  let providers: string;
  try {
    providers = providerOrder().join(", ");
  } catch {
    providers = "ollama, openrouter, zai, gemini";
  }
  return `git-therapy — psychoanalyze a file's authors from its git history

Usage:
  git-therapy <path>[:<start>-<end>] [options]
  git-therapy config [init]
  git-therapy providers

Arguments:
  <path>            a git-tracked file to analyze
  :<start>-<end>    optional 1-based line range (e.g. src/app.ts:40-80)

Options:
  -p, --provider <id>   start on this provider
      --model <name>    start on this model (must be one of the provider's models)
      --lang <name>     output language (${LANGUAGES.join(" / ")})
  -h, --help            show this help and exit
  -v, --version         show version and exit

Subcommands:
  config            show the config file path + resolved settings
  config init       write a starter config file if none exists
  providers         list providers, their models, and key availability

Config:
  ${configPath()}
  Add providers/models/keys there (JSON). An apiKey may be a literal key or a
  \${ENV_VAR} reference. Precedence: built-in < config file < env vars < flags.

Keys (inside the TUI):
  Tab    move between panes        m / M  cycle provider / model
  ↑ / ↓  move the selection        l      toggle language (English / Czech)
  v      toggle code / evidence
  Enter  run the examination       Esc    cancel a running analysis
  q      quit

Providers (cycle live with m; M picks the model):
  ${providers}
  Defaults to local Ollama (no key); cloud providers need an API key:
  OPENROUTER_API_KEY (openrouter), Z_AI_API_TOKEN (zai), GEMINI_API_KEY (gemini).`;
}

function runConfigCommand(init: boolean): never {
  if (init) {
    const { path, created } = initConfig();
    console.log(created ? `wrote starter config to ${path}` : `config already exists at ${path}`);
    process.exit(0);
  }
  // Config-file-centric view: where settings come from. Use `providers` for the
  // model list — the two commands deliberately don't overlap.
  console.log(`config file:  ${configPath()}${configExists() ? "" : "  (not created yet — run: git-therapy config init)"}`);
  console.log(`default:      ${modelLabel(defaultSelection())}`);
  console.log(`language:     ${defaultLanguage()}`);
  console.log(`order:        ${providerOrder().join(", ")}`);
  console.log("");
  console.log("keys:");
  for (const p of listProviders()) {
    const source = !p.requiresKey ? "none (local)" : `${p.keyHint ?? "inline key"} → ${p.hasKey ? "✓ set" : "✗ missing"}`;
    console.log(`  ${p.id.padEnd(12)}${source}`);
  }
  console.log("");
  console.log("run `git-therapy providers` for the available models.");
  process.exit(0);
}

function printProviders(): void {
  for (const p of listProviders()) {
    const status = p.hasKey ? "✓ key" : "✗ no key";
    console.log(`${p.id}  [${status}]`);
    for (const m of p.models) console.log(`    ${m}`);
  }
}

const argv = process.argv.slice(2);
let invocation;
try {
  invocation = parseInvocation(argv);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

try {
  switch (invocation.mode) {
    case "help":
      console.log(helpText());
      process.exit(0);
    case "version":
      console.log(`git-therapy ${pkg.version}`);
      process.exit(0);
    case "config":
      runConfigCommand(invocation.init);
    case "providers":
      printProviders();
      process.exit(0);
  }
} catch (err) {
  // A broken config surfaces here (registry build is lazy) — report it cleanly
  // rather than as an uncaught stack trace.
  fail(err instanceof Error ? err.message : String(err));
}

// mode === "analyze" from here on.
const target: Target = invocation.target;

let selection: ModelSelection;
let language: Language;
try {
  selection = startupSelection({ provider: invocation.provider, model: invocation.model });
  language = invocation.language ? parseLanguage(invocation.language) : defaultLanguage();
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

let blame, commits, scopeCode;
const gitCollectionStartedAt = performance.now();
try {
  ({ blame, commits, scopeCode } = await collect(target));
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
const gitCollectionMs = performance.now() - gitCollectionStartedAt;

if (blame.length === 0) {
  fail(`no blame data for ${target.file} — is it a tracked file in this repo?`);
}

const now = Date.now();
const evidenceBuildStartedAt = performance.now();
const authors = buildAuthorEvidence(blame, commits, scopeCode, now);
const evidenceBuildMs = performance.now() - evidenceBuildStartedAt;
const evidenceSummary: EvidenceCollectionSummary = {
  scopedLines: blame.length,
  historyCommits: commits.length,
  authorCount: authors.length,
  sourceCharacters: scopeCode.length,
  gitCollectionMs,
  evidenceBuildMs,
};

console.error(`git-therapy: ${authors.length} author(s), model ${modelLabel(selection)}`);

const renderer = await createCliRenderer();

// Safety net: if the process exits by any path that bypasses renderer.destroy()
// (crash, signal), still disable mouse tracking and leave the alt screen so the
// shell isn't left emitting mouse-escape gibberish.
process.on("exit", () => {
  process.stdout.write("\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?1049l");
});

createRoot(renderer).render(
  <App
    file={target.file}
    blame={blame}
    authors={authors}
    evidenceSummary={evidenceSummary}
    initialSelection={selection}
    initialLanguage={language}
  />,
);
