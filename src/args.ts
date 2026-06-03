// Parse the CLI target argument: a file path with an optional inclusive line range.
//   git-therapy <path>
//   git-therapy <path>:<start>-<end>

export interface Target {
  file: string;
  range: [number, number] | null;
}

/**
 * Parse a target string into a file path and optional line range.
 * The range suffix is `:<start>-<end>` on the end of the string; everything
 * before it is the file path (which may itself contain colons on exotic systems,
 * so we only treat a trailing `:N-M` as a range).
 */
export function parseTarget(arg: string): Target {
  if (!arg || arg.trim() === "") {
    throw new Error("No file path provided. Usage: git-therapy <path>[:<start>-<end>]");
  }

  const match = arg.match(/^(.*):(\d+)-(\d+)$/);
  if (!match) {
    return { file: arg, range: null };
  }

  const [, file, startStr, endStr] = match;
  const start = Number(startStr);
  const end = Number(endStr);

  if (!file) {
    throw new Error(`Malformed target: missing file path in "${arg}"`);
  }
  if (start < 1 || end < 1) {
    throw new Error(`Malformed range in "${arg}": line numbers start at 1`);
  }
  if (start > end) {
    throw new Error(`Malformed range in "${arg}": start ${start} is after end ${end}`);
  }

  return { file, range: [start, end] };
}
