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

// --- Full command-line parsing (subcommands + flags + target) -----------------

export type Invocation =
  | { mode: "help" }
  | { mode: "version" }
  | { mode: "config"; init: boolean }
  | { mode: "providers" }
  | {
      mode: "analyze";
      target: Target;
      provider?: string;
      model?: string;
      language?: string;
    };

const FLAGS_WITH_VALUE: Record<string, "provider" | "model" | "language"> = {
  "--provider": "provider",
  "-p": "provider",
  "--model": "model",
  "--lang": "language",
  "--language": "language",
};

/**
 * Parse the whole argv tail (everything after the program name). Recognizes the
 * `config` / `providers` subcommands, `-h/--help` and `-v/--version`, the
 * value flags `--provider`/`--model`/`--lang`, and a single positional target.
 * Throws on unknown flags or a missing flag value rather than silently ignoring.
 */
export function parseInvocation(argv: string[]): Invocation {
  if (argv[0] === "config") {
    const rest = argv.slice(1);
    const init = rest.includes("init");
    const unknown = rest.find((a) => a !== "init");
    if (unknown) throw new Error(`unknown argument for "config": ${unknown}`);
    return { mode: "config", init };
  }
  if (argv[0] === "providers") {
    if (argv.length > 1) throw new Error(`unexpected argument: ${argv[1]}`);
    return { mode: "providers" };
  }

  let target: Target | null = null;
  const flags: { provider?: string; model?: string; language?: string } = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") return { mode: "help" };
    if (arg === "-v" || arg === "--version") return { mode: "version" };

    const key = FLAGS_WITH_VALUE[arg];
    if (key) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} requires a value`);
      flags[key] = value;
      continue;
    }
    // Support `--flag=value` too.
    const eq = arg.match(/^(--[a-z]+)=(.*)$/);
    if (eq && FLAGS_WITH_VALUE[eq[1]!]) {
      flags[FLAGS_WITH_VALUE[eq[1]!]!] = eq[2]!;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`unknown option: ${arg}`);

    if (target !== null) throw new Error(`unexpected extra argument: ${arg}`);
    target = parseTarget(arg);
  }

  if (!target) {
    throw new Error("no file path provided. Usage: git-therapy <path>[:<start>-<end>]  (try --help)");
  }
  return { mode: "analyze", target, ...flags };
}
