import { describe, expect, test } from "bun:test";
import { parsePorcelainBlame } from "./blame";

const FIXTURE = await Bun.file(
  new URL("./__fixtures__/blame.porcelain.txt", import.meta.url),
).text();

describe("parsePorcelainBlame", () => {
  const lines = parsePorcelainBlame(FIXTURE);

  test("parses one record per source line", () => {
    expect(lines.length).toBe(6);
  });

  test("line numbers are sequential", () => {
    expect(lines.map((l) => l.lineNumber)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("sha is truncated to 7 chars", () => {
    expect(lines[0]?.sha).toBe("be00f9d");
    expect(lines[0]?.sha.length).toBe(7);
  });

  test("author and unwrapped mail", () => {
    expect(lines[0]?.author).toBe("Jan Krapac");
    expect(lines[0]?.authorMail).toBe("gitgut@momosantiri.com");
  });

  test("author time and tz", () => {
    expect(lines[0]?.authorTime).toBe(1780404125);
    expect(lines[0]?.authorTz).toBe("+0200");
  });

  test("summary captured", () => {
    expect(lines[0]?.summary).toContain("implement typed pane focus helpers");
  });

  test("code line content preserved (incl. leading whitespace after the tab)", () => {
    expect(lines[0]?.code).toBe('export const PANE_IDS = ["what", "who", "why"] as const;');
  });

  test("empty input yields no records", () => {
    expect(parsePorcelainBlame("")).toEqual([]);
  });
});
