import { describe, expect, test } from "bun:test";
import { isBareEscapeKey, type KeyLike } from "./keys";

function key(overrides: Partial<KeyLike>): KeyLike {
  return {
    name: "escape",
    sequence: "\x1B",
    ctrl: false,
    meta: false,
    shift: false,
    option: false,
    ...overrides,
  };
}

describe("isBareEscapeKey", () => {
  test("accepts a plain escape press", () => {
    expect(isBareEscapeKey(key({}))).toBe(true);
  });

  test("rejects non-escape navigation keys", () => {
    expect(isBareEscapeKey(key({ name: "tab", sequence: "\t" }))).toBe(false);
    expect(isBareEscapeKey(key({ name: "up", sequence: "\x1B[A" }))).toBe(false);
    expect(isBareEscapeKey(key({ name: "down", sequence: "\x1B[B" }))).toBe(false);
  });

  test("rejects escape-prefixed modified keys", () => {
    expect(isBareEscapeKey(key({ sequence: "\x1B\x1B", meta: true }))).toBe(false);
    expect(isBareEscapeKey(key({ sequence: "\x1B[A" }))).toBe(false);
    expect(isBareEscapeKey(key({ sequence: "\x1B[Z" }))).toBe(false);
  });
});
