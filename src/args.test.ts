import { describe, expect, test } from "bun:test";
import { parseTarget } from "./args";

describe("parseTarget", () => {
  test("bare file path, no range", () => {
    expect(parseTarget("src/index.tsx")).toEqual({ file: "src/index.tsx", range: null });
  });

  test("file with inclusive range", () => {
    expect(parseTarget("src/index.tsx:10-20")).toEqual({
      file: "src/index.tsx",
      range: [10, 20],
    });
  });

  test("relative path with leading dot", () => {
    expect(parseTarget("./a/b.ts:1-5")).toEqual({ file: "./a/b.ts", range: [1, 5] });
  });

  test("single-line range start==end", () => {
    expect(parseTarget("x.ts:7-7")).toEqual({ file: "x.ts", range: [7, 7] });
  });

  test("path without range that contains no colon", () => {
    expect(parseTarget("README.md")).toEqual({ file: "README.md", range: null });
  });

  test("empty input throws", () => {
    expect(() => parseTarget("")).toThrow();
  });

  test("inverted range throws", () => {
    expect(() => parseTarget("x.ts:20-10")).toThrow();
  });

  test("zero line number throws", () => {
    expect(() => parseTarget("x.ts:0-5")).toThrow();
  });
});
