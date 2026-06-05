// Git I/O — shell out to `git` via Bun.spawn. Thin pass-throughs; the parsing
// (blame.ts, evidence.ts) is what carries the unit tests.

import { dirname, resolve } from "node:path";
import type { BlameLine, RawCommit } from "../types";
import type { Target } from "./args";
import { parsePorcelainBlame } from "./blame";

async function runGit(args: string[], cwd: string): Promise<string> {
  const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`git ${args[0]} failed (exit ${code}): ${err.trim() || "unknown error"}`);
  }
  return out;
}

export async function collectBlame(
  file: string,
  range: [number, number] | null,
  cwd: string,
): Promise<BlameLine[]> {
  const args = ["blame", "--line-porcelain"];
  if (range) args.push("-L", `${range[0]},${range[1]}`);
  args.push("--", file);
  return parsePorcelainBlame(await runGit(args, cwd));
}

// Record/unit separators: RS (\x1e) starts each commit, US (\x1f) delimits the
// fixed fields. %b is placed last so its newlines can't be confused with field
// boundaries — the body and the trailing --numstat rows share the final segment
// and are split apart from the bottom (see parseGitLog).
const RS = "\x1e";
const US = "\x1f";
const LOG_FORMAT = `${RS}%H${US}%an${US}%ae${US}%aI${US}%cn${US}%ce${US}%cI${US}%s${US}%b`;

// A strict numstat row: additions, deletions (digits or "-" for binary), then a
// TAB and the path. Anchored so a body line that merely begins with a digit is
// not mistaken for numstat.
const NUMSTAT_RE = /^(\d+|-)\t(\d+|-)\t/;

export async function collectLog(file: string, cwd: string): Promise<RawCommit[]> {
  // --follow so history survives renames; --numstat for churn; RS/US format for
  // unambiguous multi-line bodies. Delegate parsing to parseGitLog (mirrors how
  // collectBlame delegates to parsePorcelainBlame).
  const out = await runGit(
    ["log", "--no-merges", "--follow", "--numstat", `--pretty=format:${LOG_FORMAT}`, "--", file],
    cwd,
  );
  return parseGitLog(out);
}

/**
 * Parse RS/US-delimited `git log --numstat` stdout into RawCommit records.
 * Pure (no git invocation) so it is unit-testable against captured fixtures.
 */
export function parseGitLog(stdout: string): RawCommit[] {
  const commits: RawCommit[] = [];

  // Split on RS and drop the empty leading chunk before the first separator.
  for (const chunk of stdout.split(RS)) {
    if (chunk === "") continue;

    const fields = chunk.split(US);
    const [sha, an, ae, aIso, cn, ce, cIso, subject] = fields;
    // Everything from %b onward (it may itself contain US? no — but be safe and
    // rejoin) plus the trailing numstat rows lives in the final segment.
    const tail = fields.slice(8).join(US);

    // Layout of `tail`: [body lines] [blank] [numstat rows] [trailing blank(s)].
    // git appends a blank line after the body (when non-empty) and a blank line
    // separator after the numstat block. Drop the trailing separator blanks
    // first, then peel the contiguous run of numstat rows from the bottom;
    // everything above is the body. This is robust against a body line that
    // begins with a digit (it won't match the strict tab-separated NUMSTAT_RE).
    const tailLines = tail.split("\n");
    while (tailLines.length > 0 && tailLines[tailLines.length - 1] === "") {
      tailLines.pop();
    }
    let splitAt = tailLines.length;
    while (splitAt > 0 && NUMSTAT_RE.test(tailLines[splitAt - 1] ?? "")) {
      splitAt--;
    }
    const bodyLines = tailLines.slice(0, splitAt);
    const numstatLines = tailLines.slice(splitAt);

    // Drop the blank line git inserts between the body and the numstat block so
    // an empty body resolves to "" rather than a stray newline.
    while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] === "") {
      bodyLines.pop();
    }
    const body = bodyLines.join("\n");

    let additions = 0;
    let deletions = 0;
    let renamedFrom: string | null = null;
    for (const row of numstatLines) {
      const [addStr, delStr, ...pathParts] = row.split("\t");
      additions += addStr === "-" ? 0 : Number(addStr) || 0;
      deletions += delStr === "-" ? 0 : Number(delStr) || 0;
      const from = renameSource(pathParts.join("\t"));
      if (from !== null) renamedFrom = from;
    }

    const { coAuthors, aiAssistTrailers } = parseTrailers(body);

    commits.push({
      sha: sha ?? "",
      authorName: an ?? "",
      authorMail: ae ?? "",
      isoDate: aIso ?? "",
      message: subject ?? "",
      body,
      committerName: cn ?? "",
      committerMail: ce ?? "",
      committerDate: cIso ?? "",
      coAuthors,
      aiAssistTrailers,
      renamedFrom,
      additions,
      deletions,
    });
  }

  return commits;
}

/**
 * Reconstruct the prior path from a numstat rename path, or null if not a
 * rename. Handles both forms git emits:
 *   - `old => new`               (whole-path rename)
 *   - `dir/{a => b}/file`        (brace form, partial-path rename)
 */
function renameSource(path: string): string | null {
  if (!path.includes("=>")) return null;
  const brace = path.match(/^(.*)\{(.*) => (.*)\}(.*)$/);
  if (brace) {
    const [, prefix, oldMid, , suffix] = brace;
    // Collapse a doubled slash from an empty `{ => b}` segment.
    return `${prefix}${oldMid}${suffix}`.replace(/\/{2,}/g, "/");
  }
  const simple = path.match(/^(.*) => (.*)$/);
  if (simple) return simple[1] ?? null;
  return null;
}

// AI-assistant signatures: a co-author/attribution naming any of these tools, a
// `[bot]` co-author, or an explicit "generated with" / "assisted-by" line.
const AI_NAME_RE = /copilot|claude|chatgpt|gpt|cursor|aider/i;
const AI_LINE_RE = /generated with|assisted-by/i;

/**
 * Extract trailers from a commit body. Pure helper so it is unit-testable.
 * `Co-authored-by:` entries go to coAuthors; entries naming an AI assistant (or
 * a `[bot]` co-author, or a "generated with"/"assisted-by" line) go to
 * aiAssistTrailers.
 */
export function parseTrailers(body: string): { coAuthors: string[]; aiAssistTrailers: string[] } {
  const coAuthors: string[] = [];
  const aiAssistTrailers: string[] = [];

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    const coAuthor = line.match(/^co-authored-by:\s*(.+)$/i);
    if (coAuthor) {
      const entry = coAuthor[1]!.trim();
      coAuthors.push(entry);
      if (AI_NAME_RE.test(entry) || /\[bot\]/i.test(entry)) {
        aiAssistTrailers.push(entry);
      }
      continue;
    }
    if (AI_LINE_RE.test(line)) {
      aiAssistTrailers.push(line);
    }
  }

  return { coAuthors, aiAssistTrailers };
}

/** Read the scoped source lines, prefixed with line numbers. */
export async function readScopeCode(file: string, range: [number, number] | null): Promise<string> {
  const content = await Bun.file(file).text();
  const allLines = content.split("\n");
  const start = range ? range[0] : 1;
  const end = range ? Math.min(range[1], allLines.length) : allLines.length;
  const picked: string[] = [];
  for (let n = start; n <= end; n++) {
    picked.push(`${n}: ${allLines[n - 1] ?? ""}`);
  }
  return picked.join("\n");
}

export interface CollectedEvidence {
  blame: BlameLine[];
  commits: RawCommit[];
  scopeCode: string;
}

/** Collect everything for a target in one call. */
export async function collect(target: Target): Promise<CollectedEvidence> {
  // Resolve to an absolute path and run git in the file's own directory, so the
  // target can live in any repo (not just git-therapy's own working tree).
  const absFile = resolve(target.file);
  const cwd = dirname(absFile);
  const [blame, commits, scopeCode] = await Promise.all([
    collectBlame(absFile, target.range, cwd),
    collectLog(absFile, cwd),
    readScopeCode(absFile, target.range),
  ]);
  return { blame, commits, scopeCode };
}
