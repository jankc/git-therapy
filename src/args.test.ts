import { describe, expect, test } from "bun:test";
import { parseInvocation, parseTarget } from "./args";

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

describe("parseInvocation", () => {
  test("bare target -> analyze", () => {
    expect(parseInvocation(["src/app.ts"])).toEqual({
      mode: "analyze",
      target: { file: "src/app.ts", range: null },
    });
  });

  test("-h / --help and -v / --version", () => {
    expect(parseInvocation(["--help"]).mode).toBe("help");
    expect(parseInvocation(["-h"]).mode).toBe("help");
    expect(parseInvocation(["-v"]).mode).toBe("version");
    expect(parseInvocation(["--version"]).mode).toBe("version");
  });

  test("config / config init / providers subcommands", () => {
    expect(parseInvocation(["config"])).toEqual({ mode: "config", init: false });
    expect(parseInvocation(["config", "init"])).toEqual({ mode: "config", init: true });
    expect(parseInvocation(["providers"])).toEqual({ mode: "providers" });
  });

  test("value flags attach to the analyze target (order-independent)", () => {
    expect(parseInvocation(["--provider", "zai", "--model", "glm-5.1", "src/app.ts:1-5"])).toEqual({
      mode: "analyze",
      target: { file: "src/app.ts", range: [1, 5] },
      provider: "zai",
      model: "glm-5.1",
    });
  });

  test("--lang and -p aliases, plus --flag=value form", () => {
    expect(parseInvocation(["src/a.ts", "--lang", "Czech"])).toMatchObject({ language: "Czech" });
    expect(parseInvocation(["-p", "gemini", "src/a.ts"])).toMatchObject({ provider: "gemini" });
    expect(parseInvocation(["--provider=zai", "src/a.ts"])).toMatchObject({ provider: "zai" });
  });

  test("a flag missing its value throws", () => {
    expect(() => parseInvocation(["src/a.ts", "--provider"])).toThrow();
  });

  test("an unknown option throws", () => {
    expect(() => parseInvocation(["--bogus", "src/a.ts"])).toThrow(/unknown option/);
  });

  test("a second positional throws", () => {
    expect(() => parseInvocation(["a.ts", "b.ts"])).toThrow();
  });

  test("no target throws", () => {
    expect(() => parseInvocation([])).toThrow();
    expect(() => parseInvocation(["--lang", "English"])).toThrow();
  });
});
