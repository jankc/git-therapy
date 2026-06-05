// Parse `git blame --line-porcelain` output into typed BlameLine records.
//
// With --line-porcelain, the full commit header is repeated for EVERY line, so a
// stateless line-by-line parser works: a 40-hex line starts a record, header
// fields accumulate, and the TAB-prefixed content line finalizes it.

import type { BlameLine } from "../types";

const HEADER_RE = /^([0-9a-f]{40}) \d+ (\d+)(?: \d+)?$/;

export function parsePorcelainBlame(stdout: string): BlameLine[] {
  const out: BlameLine[] = [];
  const lines = stdout.split("\n");

  let cur: Partial<BlameLine> & { sha?: string } = {};

  for (const line of lines) {
    const header = line.match(HEADER_RE);
    if (header) {
      const sha = header[1] ?? "";
      const finalLine = Number(header[2]);
      cur = { sha: sha.slice(0, 7), lineNumber: finalLine };
      continue;
    }

    if (line.startsWith("author ")) {
      cur.author = line.slice("author ".length);
    } else if (line.startsWith("author-mail ")) {
      cur.authorMail = line.slice("author-mail ".length).replace(/^<|>$/g, "");
    } else if (line.startsWith("author-time ")) {
      cur.authorTime = Number(line.slice("author-time ".length));
    } else if (line.startsWith("author-tz ")) {
      cur.authorTz = line.slice("author-tz ".length);
    } else if (line.startsWith("summary ")) {
      cur.summary = line.slice("summary ".length);
    } else if (line.startsWith("\t")) {
      // The actual source line — finalize this record.
      cur.code = line.slice(1);
      out.push({
        lineNumber: cur.lineNumber ?? out.length + 1,
        sha: cur.sha ?? "",
        author: cur.author ?? "",
        authorMail: cur.authorMail ?? "",
        authorTime: cur.authorTime ?? 0,
        authorTz: cur.authorTz ?? "+0000",
        summary: cur.summary ?? "",
        code: cur.code ?? "",
      });
      cur = {};
    }
  }

  return out;
}
