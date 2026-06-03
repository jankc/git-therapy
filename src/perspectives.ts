// The perspective registry: one git evidence input, four prompts, four readings.
// Perspectives 1-3 share the metric-bars schema; 4 (Hidden) uses narrative sections.

import { z } from "zod";
import type { AuthorEvidence } from "./types";

export const MetricsSchema = z.object({
  author: z.string(),
  metrics: z
    .array(
      z.object({
        name: z.string(),
        value: z.number().min(0).max(100),
        evidence: z.string(),
      }),
    )
    .min(3)
    .max(6),
  notes: z.array(z.string()).max(5),
});

export const NarrativeSchema = z.object({
  sections: z
    .array(z.object({ heading: z.string(), body: z.string() }))
    .min(1)
    .max(6),
});

export type Renderer = "metric-bars" | "narrative";

export interface Perspective {
  id: string;
  hotkey: "1" | "2" | "3" | "4";
  label: string;
  renderer: Renderer;
  schema: z.ZodTypeAny;
  system: string;
  buildPrompt: (e: AuthorEvidence) => string;
}

// The 5-rule contract shared by every perspective.
const PERSONA =
  "You are a forensic analyst of software-engineering behavior — calm, clinical, " +
  "slightly pretentious. You are NOT a therapist or a comedian. " +
  "Every metric or claim MUST cite specific evidence drawn from the provided git data " +
  "(commit hours, messages, additions/deletions, weekday, word frequencies, line ranges). " +
  "Invent no facts. Do not joke, wink, or break the fourth wall — the analysis must read " +
  "like a lab report. Return ONLY a JSON object matching the requested shape: no markdown, " +
  "no code fences, no prose outside the JSON.";

function metricsInstruction(metricNames: string[]): string {
  return (
    `${PERSONA}\n\n` +
    `Produce these metrics, each 0-100 with an "evidence" string citing the data: ` +
    `${metricNames.join(", ")}. Also include up to 5 short "notes". ` +
    `Shape: { "author": string, "metrics": [{ "name": string, "value": number, "evidence": string }], "notes": string[] }.`
  );
}

function evidenceBlock(e: AuthorEvidence): string {
  return (
    `AUTHOR: ${e.author.name} <${e.author.email}>\n` +
    `LINES AUTHORED: ${e.linesAuthored} (ranges ${JSON.stringify(e.lineRanges)})\n` +
    `AGGREGATES: ${JSON.stringify(e.aggregates)}\n` +
    `COMMITS: ${JSON.stringify(e.commits)}\n` +
    `SCOPE CODE:\n${e.scopeCode}`
  );
}

export const PERSPECTIVES: Perspective[] = [
  {
    id: "mental",
    hotkey: "1",
    label: "Mental & Emotional State",
    renderer: "metric-bars",
    schema: MetricsSchema,
    system: metricsInstruction([
      "Mood",
      "Stress level",
      "Sleep debt",
      "Caffeine probability",
      "Hangover probability",
      "Confidence",
    ]),
    buildPrompt: (e) =>
      `Infer this author's mental and emotional state while writing this code.\n\n${evidenceBlock(e)}`,
  },
  {
    id: "skill",
    hotkey: "2",
    label: "Skill & Experience",
    renderer: "metric-bars",
    schema: MetricsSchema,
    system: metricsInstruction([
      "Inferred years of experience",
      "Prior-language tells",
      "Docs-read probability",
      "Stack Overflow ratio",
      "Understanding-vs-passing-tests ratio",
    ]),
    buildPrompt: (e) =>
      `Estimate this author's skill and experience from the evidence.\n\n${evidenceBlock(e)}`,
  },
  {
    id: "context",
    hotkey: "3",
    label: "Context & Circumstances",
    renderer: "metric-bars",
    schema: MetricsSchema,
    system: metricsInstruction([
      "Time pressure",
      "On-a-call probability",
      "Day-before-vacation energy",
      "Resignation-coding score",
      "Manager-standing-behind-them score",
    ]),
    buildPrompt: (e) =>
      `Infer the external circumstances surrounding this author's work.\n\n${evidenceBlock(e)}`,
  },
  {
    id: "hidden",
    hotkey: "4",
    label: "Hidden Narratives",
    renderer: "narrative",
    schema: NarrativeSchema,
    system:
      `${PERSONA}\n\n` +
      `Produce narrative "sections", each with a "heading" and a "body" paragraph, covering: ` +
      `"The bug being secretly worked around", "The previous author this code is judging", ` +
      `"The age of 'temporary'", "What was deleted from the comment before committing". ` +
      `Each body MUST cite specific evidence. ` +
      `Shape: { "sections": [{ "heading": string, "body": string }] }.`,
    buildPrompt: (e) =>
      `Reconstruct the hidden narratives behind this author's code.\n\n${evidenceBlock(e)}`,
  },
];

export function getPerspective(index: number): Perspective {
  return PERSPECTIVES[index] ?? PERSPECTIVES[0]!;
}

/** Map a digit key ("1".."4") to its perspective index, or null. */
export function perspectiveIndexForKey(key: string): number | null {
  const idx = PERSPECTIVES.findIndex((p) => p.hotkey === key);
  return idx === -1 ? null : idx;
}
