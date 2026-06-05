// The perspective registry: one git evidence input, several prompts, several readings.
// Every lens emits Markdown so the analysis can render while it is still streaming.

import type { AuthorEvidence } from "../types";

export interface Perspective {
  id: string;
  label: string;
  system: string;
  buildPrompt: (e: AuthorEvidence) => string;
}

interface ReportMetric {
  name: string;
  valueFormat: string;
  meaning: string;
}

type ComparisonMetric = Exclude<keyof AuthorEvidence["relativeToFile"], "authorCount">;

// The 5-rule contract shared by every perspective.
const PERSONA =
  "You are a forensic analyst of software-engineering behavior — calm, clinical, " +
  "slightly pretentious. You are NOT a therapist or a comedian. " +
  "Every metric or claim MUST cite specific evidence drawn from the provided git data " +
  "(blamed lines, blamed commits, commit hours, messages, additions/deletions, weekday, word frequencies, line ranges). " +
  "Base claims primarily on BLAMED LINES and BLAMED COMMITS. Use AUTHOR BASELINE only " +
  "for background patterns, never as the sole basis for a claim. " +
  "Invent no facts. Do not joke, wink, or break the fourth wall — the analysis must read " +
  "like a lab report. Return ONLY the requested Markdown report: no JSON, no code fences, " +
  "and no preamble or closing commentary outside the template.";

function metricsInstruction(title: string, metrics: ReportMetric[]): string {
  const metricTemplate = metrics
    .map(
      ({ name, valueFormat, meaning }) =>
        `## ${name} — **${valueFormat}**\n` +
        `<One concise evidence-grounded interpretation of ${meaning}, citing concrete supplied facts.>`,
    )
    .join("\n\n");

  return (
    `${PERSONA}\n\n` +
    `Produce each requested metric exactly once and in the listed order. Replace every angle-bracket placeholder with ` +
    `one value in the requested format. Do not convert natural units, ratios, or qualitative findings into generic ` +
    `0-100 scores, and never append "/100". The paragraph directly below each heading must cite a concrete datum from ` +
    `the supplied git data (sha, line number, weekday/hour, word-frequency token, or derived/comparative figure). ` +
    `For probabilities, use an integer from 0% to 100%: 0% means effectively ruled out, 50% means indeterminate, and ` +
    `100% means near-certain. Sparse or ambiguous evidence should pull a probability toward 50%, not toward 0%; values ` +
    `above 75% or below 25% require at least two distinct cited data points. Percentage densities describe an estimated ` +
    `share of the supplied code, not confidence. Ratios must use two non-negative integers that sum to 100. Natural-unit ` +
    `estimates must remain plausible and conservative. Qualitative values must be short, specific labels; use "unclear" ` +
    `when the evidence cannot support a direction. If evidence contradicts a metric's premise, explain the contradiction ` +
    `instead of inventing support. End with an optional "## Notes" section containing at most 5 short bullets.\n\n` +
    `Use this exact Markdown structure:\n\n` +
    `# ${title}\n\n` +
    `${metricTemplate}\n\n## Notes\n- <Optional thin-evidence or contradiction note>`
  );
}

function coreEvidence(e: AuthorEvidence): string {
  return (
    `AUTHOR: ${e.author.name} <${e.author.email}>\n` +
    `LINES AUTHORED: ${e.linesAuthored} (ranges ${JSON.stringify(e.lineRanges)})\n` +
    `PRIMARY EVIDENCE — BLAMED LINES: ${JSON.stringify(e.blamedLines)}\n` +
    `PRIMARY EVIDENCE — BLAMED COMMITS: ${JSON.stringify(e.blamedCommits)}\n` +
    `BACKGROUND ONLY — AUTHOR BASELINE: ${JSON.stringify(e.authorBaseline)}\n` +
    `SURROUNDING SOURCE CONTEXT — SCOPE CODE:\n${e.scopeCode}`
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function comparativeStanding(e: AuthorEvidence, metrics: ComparisonMetric[]): string {
  if (e.relativeToFile.authorCount === 1) {
    return (
      `COMPARATIVE STANDING: ${e.author.name} is the sole author of this file; ` +
      `do not treat rank-1-of-1 as a peer comparison.`
    );
  }

  const standings = metrics.map((metric) => {
    const stat = e.relativeToFile[metric];
    const percentile = `${formatNumber(stat.percentile * 100)}%`;

    return (
      `${metric}: value ${formatNumber(stat.value)}, file median ${formatNumber(stat.median)}, ` +
      `ratioToMedian ${formatNumber(stat.ratioToMedian)}, rank ${stat.rank}/${e.relativeToFile.authorCount}, ` +
      `percentile ${percentile}`
    );
  });

  return `COMPARATIVE STANDING: ${standings.join("; ")}`;
}

// Each lens is one row: a task line, a lens-specific signals header + payload,
// the comparison metrics it cares about, and either a metric template (the common
// case) or a bespoke narrative system prompt (`hidden`). The five near-identical
// evidence builders collapse into `buildLensEvidence`.
interface LensSpec {
  id: string;
  label: string;
  /** The buildPrompt lead-in instruction. */
  task: string;
  /** The "<LENS> SIGNALS — …" label preceding the JSON payload. */
  signalsHeader: string;
  /** Lens-specific derived/baseline/commit fields, JSON-stringified verbatim. */
  signals: (e: AuthorEvidence) => Record<string, unknown>;
  comparison: ComparisonMetric[];
  /** `metrics` → metricsInstruction(label, …); `narrative` → raw system prompt. */
  prompt: { metrics: ReportMetric[] } | { narrative: string };
}

function buildLensEvidence(e: AuthorEvidence, spec: LensSpec): string {
  return (
    `${coreEvidence(e)}\n` +
    `${spec.signalsHeader}: ${JSON.stringify(spec.signals(e))}\n` +
    `${comparativeStanding(e, spec.comparison)}`
  );
}

const LENSES: LensSpec[] = [
  {
    id: "mental",
    label: "Mental & Emotional State",
    task: "Infer this author's mental and emotional state while writing this code.",
    signalsHeader: "MENTAL-LENS DERIVED SIGNALS — sessions/night-owl/profanity/intensity",
    signals: (e) => ({
      sessionCount: e.derived.sessionCount,
      longestSessionMinutes: e.derived.longestSessionMinutes,
      longestSessionCommits: e.derived.longestSessionCommits,
      latestEndingHourLocal: e.derived.latestEndingHourLocal,
      avgCommitsPerSession: e.derived.avgCommitsPerSession,
      nightOwlRatio: e.derived.nightOwlRatio,
      fixupChainCount: e.derived.fixupChainCount,
      fixupCommitCount: e.derived.fixupCommitCount,
      codeIntensity: {
        todos: e.derived.codeScan.todos,
        fixmes: e.derived.codeScan.fixmes,
        hacks: e.derived.codeScan.hacks,
        exclamations: e.derived.codeScan.exclamations,
        allCapsTokens: e.derived.codeScan.allCapsTokens,
        profanity: e.derived.codeScan.profanity,
      },
    }),
    comparison: ["nightOwlRatio", "avgCommitsPerSession", "longestSessionMinutes", "fixupCommitCount"],
    prompt: {
      metrics: [
        {
          name: "Mood",
          valueFormat: "<short qualitative label>",
          meaning: "the dominant apparent working mood",
        },
        {
          name: "Stress level",
          valueFormat: "<low | moderate | high | acute>",
          meaning: "the apparent intensity of stress",
        },
        {
          name: "Inferred sleep debt",
          valueFormat: "<integer> hours",
          meaning: "a rough accumulated sleep deficit, rounded to the nearest whole hour",
        },
        {
          name: "Caffeine probability",
          valueFormat: "<integer>%",
          meaning: "the probability that caffeine influenced this work session",
        },
        {
          name: "Hangover probability",
          valueFormat: "<integer>%",
          meaning: "the probability that a hangover influenced this work session",
        },
        {
          name: "Author confidence",
          valueFormat: "<low | moderate | high>",
          meaning: "the author's apparent decisiveness and certainty while making these changes",
        },
      ],
    },
  },
  {
    id: "skill",
    label: "Skill & Experience",
    task: "Estimate this author's skill and experience from the evidence.",
    signalsHeader: "SKILL-LENS DERIVED SIGNALS — code shape/age/fixups",
    signals: (e) => ({
      oldestLineAgeDays: e.derived.oldestLineAgeDays,
      newestLineAgeDays: e.derived.newestLineAgeDays,
      avgCommitsPerSession: e.derived.avgCommitsPerSession,
      fixupChainCount: e.derived.fixupChainCount,
      fixupCommitCount: e.derived.fixupCommitCount,
      codeScan: {
        todos: e.derived.codeScan.todos,
        fixmes: e.derived.codeScan.fixmes,
        hacks: e.derived.codeScan.hacks,
        magicNumbers: e.derived.codeScan.magicNumbers,
        maxNestingDepth: e.derived.codeScan.maxNestingDepth,
        maxLineLength: e.derived.codeScan.maxLineLength,
      },
    }),
    comparison: ["linesAuthored", "totalFileCommits", "avgMessageLength", "churnPerCommit", "fixupCommitCount"],
    prompt: {
      metrics: [
        {
          name: "Inferred experience",
          valueFormat: "<integer> years",
          meaning: "a rough whole-year estimate of professional programming experience",
        },
        {
          name: "Prior-language influence",
          valueFormat: "<language or none detected>",
          meaning: "the strongest programming-language habit visible in this code",
        },
        {
          name: "Docs-read probability",
          valueFormat: "<integer>%",
          meaning: "the probability that the author consulted primary documentation",
        },
        {
          name: "Community-answer reliance",
          valueFormat: "<low | moderate | high | unclear>",
          meaning: "the apparent reliance on Stack Overflow or similar community answers",
        },
        {
          name: "Understanding vs passing tests",
          valueFormat: "<understanding integer>:<passing-tests integer>",
          meaning: "the balance between conceptual understanding and merely satisfying tests",
        },
      ],
    },
  },
  {
    id: "context",
    label: "Context & Circumstances",
    task: "Infer the external circumstances surrounding this author's work.",
    signalsHeader: "CONTEXT-LENS DERIVED SIGNALS — committer divergence/weekend ratio/land-delay/commit body",
    signals: (e) => ({
      weekendRatio: e.derived.weekendRatio,
      totalFileCommits: e.authorBaseline.totalFileCommits,
      avgMessageLength: e.authorBaseline.avgMessageLength,
      wordFrequencies: e.authorBaseline.wordFrequencies,
      blamedCommitProvenance: e.blamedCommits.map((commit) => ({
        sha: commit.sha,
        weekday: commit.weekday,
        hourLocal: commit.hourLocal,
        minuteLocal: commit.minuteLocal,
        message: commit.message,
        additions: commit.additions,
        deletions: commit.deletions,
        committerDiverged: commit.committerDiverged,
        landDelayMinutes: commit.landDelayMinutes,
        isAmend: commit.isAmend,
        subjectChurnMismatch: commit.subjectChurnMismatch,
      })),
      commitBodyNote: "No separate commit-body field is present in AuthorEvidence; do not invent body text.",
    }),
    comparison: ["weekendRatio", "avgMessageLength", "totalFileCommits", "churnPerCommit"],
    prompt: {
      metrics: [
        {
          name: "Time pressure",
          valueFormat: "<low | moderate | high | acute>",
          meaning: "the apparent urgency surrounding the work",
        },
        {
          name: "On-a-call probability",
          valueFormat: "<integer>%",
          meaning: "the probability that the author was simultaneously on a call",
        },
        {
          name: "Day-before-vacation probability",
          valueFormat: "<integer>%",
          meaning: "the probability that imminent leave shaped the work",
        },
        {
          name: "Resignation-coding probability",
          valueFormat: "<integer>%",
          meaning: "the probability that disengagement or impending departure shaped the work",
        },
        {
          name: "Manager-present probability",
          valueFormat: "<integer>%",
          meaning: "the probability that a manager was directly observing or pressuring the author",
        },
      ],
    },
  },
  {
    id: "hidden",
    label: "Hidden Narratives",
    task: "Reconstruct the hidden narratives behind this author's code.",
    signalsHeader: "NARRATIVE-LENS SIGNALS — age/fixups/tokens/comparison",
    signals: (e) => ({
      oldestLineAgeDays: e.derived.oldestLineAgeDays,
      newestLineAgeDays: e.derived.newestLineAgeDays,
      fixupChainCount: e.derived.fixupChainCount,
      fixupCommitCount: e.derived.fixupCommitCount,
      codeScan: e.derived.codeScan,
      wordFrequencies: e.authorBaseline.wordFrequencies,
    }),
    comparison: ["linesAuthored", "totalFileCommits", "avgMessageLength", "churnPerCommit"],
    prompt: {
      narrative:
        `${PERSONA}\n\n` +
        `Write exactly these Markdown sections in order:\n\n` +
        `# Hidden Narratives\n\n` +
        `## The bug being secretly worked around\n<One evidence-grounded paragraph.>\n\n` +
        `## The previous author this code is judging\n<One evidence-grounded paragraph.>\n\n` +
        `## The age of 'temporary'\n<One evidence-grounded paragraph.>\n\n` +
        `## What was deleted from the comment before committing\n<One evidence-grounded paragraph.>\n\n` +
        `Each paragraph MUST cite a concrete datum from the supplied git data.`,
    },
  },
  {
    id: "ghostwriter",
    label: "The Ghostwriter",
    task:
      `Estimate the probability that an AI coding assistant (e.g. Copilot, ChatGPT, Claude) ` +
      `wrote this code, and the stylistic tells behind that judgment. Higher means more ` +
      `machine-authored. Weigh signals such as suspiciously uniform formatting, defensively ` +
      `complete error handling, textbook-explanatory comments, conventional-but-bland naming, ` +
      `and large polished additions landed in a single commit.`,
    signalsHeader: "GHOSTWRITER-LENS DERIVED SIGNALS — naming/uniformity and AI-assist trailer evidence",
    signals: (e) => ({
      namingAndUniformity: {
        allCapsTokens: e.derived.codeScan.allCapsTokens,
        magicNumbers: e.derived.codeScan.magicNumbers,
        maxNestingDepth: e.derived.codeScan.maxNestingDepth,
        maxLineLength: e.derived.codeScan.maxLineLength,
        todos: e.derived.codeScan.todos,
        fixmes: e.derived.codeScan.fixmes,
        hacks: e.derived.codeScan.hacks,
      },
      commitPolish: e.blamedCommits.map((commit) => ({
        sha: commit.sha,
        message: commit.message,
        additions: commit.additions,
        deletions: commit.deletions,
        subjectChurnMismatch: commit.subjectChurnMismatch,
      })),
      aiAssistTrailerNote:
        "No AI-assist trailer list is present in AuthorEvidence; only cite assistant/bot tokens if they appear in supplied messages or code.",
    }),
    comparison: ["linesAuthored", "avgMessageLength", "totalFileCommits", "churnPerCommit"],
    prompt: {
      metrics: [
        {
          name: "AI-authored probability",
          valueFormat: "<integer>%",
          meaning: "the probability that an AI coding assistant authored substantial parts of the code",
        },
        {
          name: "Boilerplate density",
          valueFormat: "<integer>%",
          meaning: "the estimated share of the supplied code that is conventional boilerplate",
        },
        {
          name: "Comment uniformity",
          valueFormat: "<low | moderate | high | unclear>",
          meaning: "how stylistically uniform the comments are",
        },
        {
          name: "Naming blandness",
          valueFormat: "<low | moderate | high>",
          meaning: "how generic and conventional the identifiers appear",
        },
        {
          name: "Error-handling thoroughness",
          valueFormat: "<minimal | uneven | thorough | exhaustive>",
          meaning: "the completeness of defensive and failure-path handling",
        },
      ],
    },
  },
];

export const PERSPECTIVES: Perspective[] = LENSES.map((spec) => ({
  id: spec.id,
  label: spec.label,
  system: "narrative" in spec.prompt
    ? spec.prompt.narrative
    : metricsInstruction(spec.label, spec.prompt.metrics),
  buildPrompt: (e) => `${spec.task}\n\n${buildLensEvidence(e, spec)}`,
}));

export function getPerspective(index: number): Perspective {
  return PERSPECTIVES[index] ?? PERSPECTIVES[0]!;
}
