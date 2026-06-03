// Git I/O — shell out to `git` via Bun.spawn. Thin pass-throughs; the parsing
// (blame.ts, evidence.ts) is what carries the unit tests.

import { dirname, resolve } from "node:path";
import type { BlameLine, RawCommit } from "./types";
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

const SOH = "\x01";

export async function collectLog(file: string, cwd: string): Promise<RawCommit[]> {
  // SOH-delimited header line per commit, followed by --numstat rows.
  const fmt = `${SOH}%H${SOH}%an${SOH}%ae${SOH}%aI${SOH}%s`;
  const out = await runGit(
    ["log", "--no-merges", "--numstat", `--pretty=format:${fmt}`, "--", file],
    cwd,
  );

  const commits: RawCommit[] = [];
  let current: RawCommit | null = null;

  for (const line of out.split("\n")) {
    if (line.startsWith(SOH)) {
      if (current) commits.push(current);
      const [, sha, an, ae, iso, ...rest] = line.split(SOH);
      current = {
        sha: sha ?? "",
        authorName: an ?? "",
        authorMail: ae ?? "",
        isoDate: iso ?? "",
        message: rest.join(SOH), // subject may (rarely) contain SOH; rejoin
        additions: 0,
        deletions: 0,
      };
    } else if (current && /^\d+|^-/.test(line)) {
      const [addStr, delStr] = line.split("\t");
      current.additions += addStr === "-" ? 0 : Number(addStr) || 0;
      current.deletions += delStr === "-" ? 0 : Number(delStr) || 0;
    }
  }
  if (current) commits.push(current);
  return commits;
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
