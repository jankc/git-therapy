// The perspective registry: one git evidence input, several prompts, several readings.
// Every lens emits Markdown so the analysis can render while it is still streaming.

import type { AuthorEvidence } from "./types";

export interface Perspective {
  id: string;
  label: string;
  system: string;
  buildPrompt: (e: AuthorEvidence) => string;
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

function metricsInstruction(title: string, metricNames: string[]): string {
  const metricTemplate = metricNames
    .map(
      (name) =>
        `## ${name} — **<integer from 0 to 100>/100**\n` +
        `<One concise evidence-grounded interpretation citing concrete supplied facts.>`,
    )
    .join("\n\n");

  return (
    `${PERSONA}\n\n` +
    `Produce each requested metric exactly once and in the listed order. Each heading must contain a bold integer ` +
    `score from 0-100 followed by "/100". The paragraph directly below it must cite a concrete datum from the supplied ` +
    `git data (sha, line number, weekday/hour, word-frequency token, or derived/comparative figure). ` +
    `Scale anchors: 0 means no supporting evidence, ~50 means weak or ambiguous evidence, ` +
    `and 90+ means multiple converging signals. Any value above 75 requires at least two distinct cited data points; ` +
    `lower the value when only one weak signal exists. Sparse evidence (few owned lines or few blamed commits) must ` +
    `yield low scores plus an explicit thin-evidence note. If evidence contradicts a metric's premise, score it low ` +
    `and explain the contradiction instead of inventing support. End with an optional "## Notes" section containing ` +
    `at most 5 short bullets.\n\nUse this exact Markdown structure:\n\n` +
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

function mentalEvidence(e: AuthorEvidence): string {
  return (
    `${coreEvidence(e)}\n` +
    `MENTAL-LENS DERIVED SIGNALS — sessions/night-owl/profanity/intensity: ${JSON.stringify({
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
    })}\n` +
    `${comparativeStanding(e, [
      "nightOwlRatio",
      "avgCommitsPerSession",
      "longestSessionMinutes",
      "fixupCommitCount",
    ])}`
  );
}

function skillEvidence(e: AuthorEvidence): string {
  return (
    `${coreEvidence(e)}\n` +
    `SKILL-LENS DERIVED SIGNALS — code shape/age/fixups: ${JSON.stringify({
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
    })}\n` +
    `${comparativeStanding(e, [
      "linesAuthored",
      "totalFileCommits",
      "avgMessageLength",
      "churnPerCommit",
      "fixupCommitCount",
    ])}`
  );
}

function contextEvidence(e: AuthorEvidence): string {
  return (
    `${coreEvidence(e)}\n` +
    `CONTEXT-LENS DERIVED SIGNALS — committer divergence/weekend ratio/land-delay/commit body: ${JSON.stringify({
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
    })}\n` +
    `${comparativeStanding(e, [
      "weekendRatio",
      "avgMessageLength",
      "totalFileCommits",
      "churnPerCommit",
    ])}`
  );
}

function hiddenEvidence(e: AuthorEvidence): string {
  return (
    `${coreEvidence(e)}\n` +
    `NARRATIVE-LENS SIGNALS — age/fixups/tokens/comparison: ${JSON.stringify({
      oldestLineAgeDays: e.derived.oldestLineAgeDays,
      newestLineAgeDays: e.derived.newestLineAgeDays,
      fixupChainCount: e.derived.fixupChainCount,
      fixupCommitCount: e.derived.fixupCommitCount,
      codeScan: e.derived.codeScan,
      wordFrequencies: e.authorBaseline.wordFrequencies,
    })}\n` +
    `${comparativeStanding(e, [
      "linesAuthored",
      "totalFileCommits",
      "avgMessageLength",
      "churnPerCommit",
    ])}`
  );
}

function ghostwriterEvidence(e: AuthorEvidence): string {
  return (
    `${coreEvidence(e)}\n` +
    `GHOSTWRITER-LENS DERIVED SIGNALS — naming/uniformity and AI-assist trailer evidence: ${JSON.stringify({
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
    })}\n` +
    `${comparativeStanding(e, [
      "linesAuthored",
      "avgMessageLength",
      "totalFileCommits",
      "churnPerCommit",
    ])}`
  );
}

export const PERSPECTIVES: Perspective[] = [
  {
    id: "mental",
    label: "Mental & Emotional State",
    system: metricsInstruction("Mental & Emotional State", [
      "Mood",
      "Stress level",
      "Sleep debt",
      "Caffeine probability",
      "Hangover probability",
      "Confidence",
    ]),
    buildPrompt: (e) =>
      `Infer this author's mental and emotional state while writing this code.\n\n${mentalEvidence(e)}`,
  },
  {
    id: "skill",
    label: "Skill & Experience",
    system: metricsInstruction("Skill & Experience", [
      "Inferred years of experience",
      "Prior-language tells",
      "Docs-read probability",
      "Stack Overflow ratio",
      "Understanding-vs-passing-tests ratio",
    ]),
    buildPrompt: (e) =>
      `Estimate this author's skill and experience from the evidence.\n\n${skillEvidence(e)}`,
  },
  {
    id: "context",
    label: "Context & Circumstances",
    system: metricsInstruction("Context & Circumstances", [
      "Time pressure",
      "On-a-call probability",
      "Day-before-vacation energy",
      "Resignation-coding score",
      "Manager-standing-behind-them score",
    ]),
    buildPrompt: (e) =>
      `Infer the external circumstances surrounding this author's work.\n\n${contextEvidence(e)}`,
  },
  {
    id: "hidden",
    label: "Hidden Narratives",
    system:
      `${PERSONA}\n\n` +
      `Write exactly these Markdown sections in order:\n\n` +
      `# Hidden Narratives\n\n` +
      `## The bug being secretly worked around\n<One evidence-grounded paragraph.>\n\n` +
      `## The previous author this code is judging\n<One evidence-grounded paragraph.>\n\n` +
      `## The age of 'temporary'\n<One evidence-grounded paragraph.>\n\n` +
      `## What was deleted from the comment before committing\n<One evidence-grounded paragraph.>\n\n` +
      `Each paragraph MUST cite a concrete datum from the supplied git data.`,
    buildPrompt: (e) =>
      `Reconstruct the hidden narratives behind this author's code.\n\n${hiddenEvidence(e)}`,
  },
  {
    id: "ghostwriter",
    label: "The Ghostwriter",
    system: metricsInstruction("The Ghostwriter", [
      "AI-authored probability",
      "Boilerplate density",
      "Comment uniformity",
      "Naming blandness",
      "Error-handling thoroughness",
    ]),
    buildPrompt: (e) =>
      `Estimate the probability that an AI coding assistant (e.g. Copilot, ChatGPT, Claude) ` +
      `wrote this code, and the stylistic tells behind that judgment. Higher means more ` +
      `machine-authored. Weigh signals such as suspiciously uniform formatting, defensively ` +
      `complete error handling, textbook-explanatory comments, conventional-but-bland naming, ` +
      `and large polished additions landed in a single commit.\n\n${ghostwriterEvidence(e)}`,
  },
];

export function getPerspective(index: number): Perspective {
  return PERSPECTIVES[index] ?? PERSPECTIVES[0]!;
}
