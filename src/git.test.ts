import { describe, expect, test } from "bun:test";
import { parseGitLog, parseTrailers } from "./git";
import type { RawCommit } from "./types";

// RS/US-delimited `git log --no-merges --follow --numstat` stdout, captured into
// a fixture so the parser is exercised without shelling out to git.
const fixture = await Bun.file(new URL("./__fixtures__/log.numstat.txt", import.meta.url)).text();

describe("parseGitLog", () => {
  const commits = parseGitLog(fixture);
  const byId = (sha: string): RawCommit => commits.find((c) => c.sha === sha)!;

  test("one record per commit", () => {
    expect(commits.map((c) => c.sha)).toEqual([
      "aaaaaaa1",
      "bbbbbbb2",
      "ccccccc3",
      "ddddddd4",
    ]);
  });

  test("empty input yields an empty array", () => {
    expect(parseGitLog("")).toEqual([]);
  });

  test("multi-line body is captured intact, with no numstat rows appended", () => {
    const a = byId("aaaaaaa1");
    expect(a.body).toBe(
      "This rewrites the core.\n" +
        "3 callsites updated across the tree.\n" +
        "\n" +
        "Co-authored-by: Sam Human <sam@x.com>\n" +
        "Co-authored-by: Copilot <copilot@github.com>",
    );
    // The digit-leading body line survives (not mistaken for a numstat row)…
    expect(a.body).toContain("3 callsites updated across the tree.");
    // …and no numstat path leaked into the body.
    expect(a.body).not.toContain("core.ts");
  });

  test("empty body resolves to an empty string", () => {
    expect(byId("bbbbbbb2").body).toBe("");
  });

  test("single-line body is captured", () => {
    expect(byId("ccccccc3").body).toBe("Single line body.");
  });

  test("committer fields are captured and stay distinct from the author", () => {
    const a = byId("aaaaaaa1");
    expect(a.authorName).toBe("Jane Dev");
    expect(a.authorMail).toBe("jane@x.com");
    expect(a.isoDate).toBe("2026-05-01T10:00:00+02:00");
    expect(a.committerName).toBe("Rebase Bot");
    expect(a.committerMail).toBe("bot@ci.com");
    expect(a.committerDate).toBe("2026-05-02T11:00:00+02:00");
    expect(a.committerName).not.toBe(a.authorName);
  });

  test("committer equals author when not divergent", () => {
    const b = byId("bbbbbbb2");
    expect(b.committerName).toBe(b.authorName);
    expect(b.committerMail).toBe(b.authorMail);
    expect(b.committerDate).toBe(b.isoDate);
  });

  test("numstat additions/deletions are summed, binary rows contribute 0", () => {
    expect(byId("aaaaaaa1")).toMatchObject({ additions: 10, deletions: 2 });
    expect(byId("ddddddd4")).toMatchObject({ additions: 6, deletions: 1 }); // 4+2, 0+1
  });

  test("brace-form rename reconstructs the prior path", () => {
    expect(byId("aaaaaaa1").renamedFrom).toBe("src/old/core.ts");
  });

  test("whole-path rename reconstructs the prior path", () => {
    expect(byId("ccccccc3").renamedFrom).toBe("lib/a.ts");
  });

  test("renamedFrom is null when the commit did not rename the file", () => {
    expect(byId("bbbbbbb2").renamedFrom).toBeNull();
    expect(byId("ddddddd4").renamedFrom).toBeNull();
  });

  test("trailers are parsed off the body", () => {
    const a = byId("aaaaaaa1");
    expect(a.coAuthors).toEqual([
      "Sam Human <sam@x.com>",
      "Copilot <copilot@github.com>",
    ]);
    expect(a.aiAssistTrailers).toEqual(["Copilot <copilot@github.com>"]);
  });

  test("a commit with no trailers has empty trailer arrays", () => {
    const b = byId("bbbbbbb2");
    expect(b.coAuthors).toEqual([]);
    expect(b.aiAssistTrailers).toEqual([]);
  });
});

describe("parseTrailers", () => {
  test("human and AI co-authors split across the two buckets", () => {
    const { coAuthors, aiAssistTrailers } = parseTrailers(
      "Some change.\n\n" +
        "Co-authored-by: Sam Human <sam@x.com>\n" +
        "Co-authored-by: Copilot <copilot@github.com>",
    );
    expect(coAuthors).toEqual([
      "Sam Human <sam@x.com>",
      "Copilot <copilot@github.com>",
    ]);
    expect(aiAssistTrailers).toEqual(["Copilot <copilot@github.com>"]);
  });

  test("a [bot] co-author and a 'Generated with' line are both flagged as AI", () => {
    const { coAuthors, aiAssistTrailers } = parseTrailers(
      "Body.\n\n" +
        "Co-authored-by: dependabot[bot] <bot@github.com>\n" +
        "Generated with AI assistance",
    );
    expect(coAuthors).toEqual(["dependabot[bot] <bot@github.com>"]);
    expect(aiAssistTrailers).toEqual([
      "dependabot[bot] <bot@github.com>",
      "Generated with AI assistance",
    ]);
  });

  test("a Claude co-author is classified as AI", () => {
    const { coAuthors, aiAssistTrailers } = parseTrailers(
      "Co-authored-by: Claude <noreply@anthropic.com>",
    );
    expect(coAuthors).toEqual(["Claude <noreply@anthropic.com>"]);
    expect(aiAssistTrailers).toEqual(["Claude <noreply@anthropic.com>"]);
  });

  test("no trailers yields empty arrays", () => {
    expect(parseTrailers("Just a plain body.\nNo trailers here.")).toEqual({
      coAuthors: [],
      aiAssistTrailers: [],
    });
  });

  test("an empty body yields empty arrays", () => {
    expect(parseTrailers("")).toEqual({ coAuthors: [], aiAssistTrailers: [] });
  });
});
