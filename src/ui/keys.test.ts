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
  test("accepts a plain (legacy terminal) escape press", () => {
    expect(isBareEscapeKey(key({}))).toBe(true);
  });

  test("accepts a kitty keyboard protocol escape press", () => {
    // Modern terminals (Ghostty/Kitty/WezTerm) deliver Escape as the CSI form
    // `\x1b[27u`; opentui still parses it to name "escape". This is the case the
    // old `sequence === "\x1B"` check silently rejected, breaking cancellation.
    expect(isBareEscapeKey(key({ sequence: "\x1b[27u" }))).toBe(true);
  });

  test("rejects non-escape navigation keys", () => {
    expect(isBareEscapeKey(key({ name: "tab", sequence: "\t" }))).toBe(false);
    expect(isBareEscapeKey(key({ name: "up", sequence: "\x1B[A" }))).toBe(false);
    expect(isBareEscapeKey(key({ name: "down", sequence: "\x1B[B" }))).toBe(false);
  });

  test("rejects escape pressed with a modifier", () => {
    expect(isBareEscapeKey(key({ meta: true }))).toBe(false); // Alt+Esc (\x1B\x1B)
    expect(isBareEscapeKey(key({ ctrl: true }))).toBe(false);
    expect(isBareEscapeKey(key({ shift: true }))).toBe(false);
    expect(isBareEscapeKey(key({ option: true }))).toBe(false);
  });
});
