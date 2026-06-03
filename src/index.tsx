// Entry point: parse target -> preflight key -> collect git evidence -> mount TUI.

import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { parseTarget, type Target } from "./args";
import { assertApiKey, activeModelLabel } from "./ai";
import { collect } from "./git";
import { buildAuthorEvidence } from "./evidence";
import { App } from "./App";

function fail(message: string): never {
  console.error(`git-therapy: ${message}`);
  process.exit(1);
}

const rawArg = process.argv[2];
if (!rawArg) {
  fail("usage: git-therapy <path>[:<start>-<end>]");
}

let target: Target;
try {
  target = parseTarget(rawArg);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

try {
  assertApiKey();
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

console.error(`git-therapy: ${authors.length} author(s), model ${activeModelLabel()}`);

const renderer = await createCliRenderer();

// Safety net: if the process exits by any path that bypasses renderer.destroy()
// (crash, signal), still disable mouse tracking and leave the alt screen so the
// shell isn't left emitting mouse-escape gibberish.
process.on("exit", () => {
  process.stdout.write("\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?1049l");
});

createRoot(renderer).render(<App file={target.file} blame={blame} authors={authors} />);
