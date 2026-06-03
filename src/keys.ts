export interface KeyLike {
  name: string;
  sequence?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  option?: boolean;
}

export function isBareEscapeKey(key: KeyLike): boolean {
  return (
    key.name === "escape" &&
    key.sequence === "\x1B" &&
    !key.ctrl &&
    !key.meta &&
    !key.shift &&
    !key.option
  );
}
