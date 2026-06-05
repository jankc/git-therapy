// The analysis pane: keeps run diagnostics above a streamed Markdown report.

import { useEffect, useState } from "react";
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";
import type { Perspective } from "../../ai/perspectives";
import type { Language } from "../../ai/llm";
import { MarkdownView } from "./MarkdownView";
import type {
  AnalysisActivity,
  AnalysisProgress,
  AnalysisState,
} from "../../types";
import { ACCENT, DIM, ERROR, FG, NEUTRAL } from "./theme";
import { useFocusRef } from "./useFocusRef";

const SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

// Cycled through while a run is in flight, in place of a plain "analyzing".
const LOADING_MESSAGES = [
  "Projecting…",
  "Gaslighting…",
  "Catastrophizing…",
  "Dissociating…",
  "Ruminating…",
  "Pathologizing…",
  "Overanalyzing…",
  "Repressing…",
  "Deflecting…",
  "Spiraling…",
  "Intellectualizing…",
  "Internalizing…",
  "Rationalizing…",
  "Splitting…",
  "Suppressing…",
  "Diagnosing…",
  "Perseverating…",
  "Hyperventilating…",
  "Somatizing…",
  "Fixating…",
  "Detaching…",
  "Regressing…",
  "Sublimating…",
  "Avoidizing…",
  "Transferenceing…",
  "Hypochondriating…",
  "Neuroticking…",
  "Cope-maxxing…",
  "Triangulating…",
  "Decompensating…",
  "Externalizing…",
  "Mentalizing…",
  "Catharsizing…",
  "Reframing…",
  "Enmeshing…",
  "Idealizing…",
  "Devaluing…",
  "Compartmentalizing…",
  "Trauma-dumping…",
  "Self-soothing…",
  "Boundary-setting…",
  "Co-ruminating…",
  "Doom-scrolling…",
  "Inner-childing…",
  "Shadow-working…",
  "Attachment-styling…",
  "Ego-deathing…",
  "Vibe-checking…",
];

function fmtTokens(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtCost(costUsd: number): string {
  return `$${costUsd.toFixed(6)}`;
}

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60
    ? `${s}s`
    : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
}

function activityDuration(activity: AnalysisActivity, now: number): string {
  return fmtElapsed((activity.endedAt ?? now) - activity.startedAt);
}

function ActivityLog({
  activities,
  now,
}: {
  activities: AnalysisActivity[];
  now: number;
}) {
  const visible = activities.slice(-8);
  if (visible.length === 0) return null;
  return (
    <box flexDirection="column" marginTop={1}>
      {visible.map((activity) => {
        const glyph =
          activity.status === "active"
            ? "·"
            : activity.status === "done"
              ? "✓"
              : "×";
        const color =
          activity.status === "error"
            ? ERROR
            : activity.status === "active"
              ? ACCENT
              : DIM;
        return (
          <text key={activity.id} fg={color}>
            {glyph} {activity.label} · {activity.detail ?? activity.status} ·{" "}
            {activityDuration(activity, now)}
          </text>
        );
      })}
    </box>
  );
}

interface ActiveAnalysis {
  suspect: string;
  lens: string;
  model: string;
  language: Language;
}

function Spinner({
  analysis,
  progress,
  startedAt,
}: {
  analysis: ActiveAnalysis;
  progress: AnalysisProgress;
  startedAt: number;
}) {
  const [frame, setFrame] = useState(0);
  // The message advances roughly every 5s; seed from startedAt so a fresh run
  // doesn't always open on the same word.
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(startedAt / 5000));
  useEffect(() => {
    const tick = setInterval(() => setFrame((f) => f + 1), 100);
    const cycle = setInterval(() => setMsgIndex((i) => i + 1), 5000);
    return () => {
      clearInterval(tick);
      clearInterval(cycle);
    };
  }, [startedAt]);
  const glyph = SPINNER[frame % SPINNER.length] ?? "⠋";
  const message =
    LOADING_MESSAGES[msgIndex % LOADING_MESSAGES.length] ?? "Analyzing…";
  return (
    <box flexDirection="column">
      <text fg={ACCENT}>
        {glyph} {message} <span fg={FG}>{analysis.suspect}</span>
      </text>
      <text fg={DIM}>
        {analysis.lens} · {analysis.model} · {analysis.language}
      </text>
      <ActivityLog activities={progress.activities} now={Date.now()} />
    </box>
  );
}

function CompletedRun({
  suspect,
  lens,
  model,
  language,
  elapsedMs,
  progress,
}: {
  suspect: string;
  lens: string;
  model: string;
  language: Language;
  elapsedMs: number;
  progress: AnalysisProgress;
}) {
  return (
    <box flexDirection="column">
      <text fg={ACCENT}>
        ✓ Analysis complete <span fg={FG}>{suspect}</span>
      </text>
      <text fg={DIM}>
        {lens} · {model} · {language}
      </text>
      <text fg={DIM}>
        {fmtElapsed(elapsedMs)} · ~{fmtTokens(progress.approxOutputTokens)} out
        · ~{fmtTokens(progress.approxReasoningTokens)} reasoning
      </text>
      <ActivityLog activities={progress.activities} now={Date.now()} />
    </box>
  );
}

function AnalysisMarkdown({ content }: { content: string }) {
  if (!content) return null;
  return (
    <box marginTop={1} flexDirection="column" gap={1}>
      <box border={["top"]} borderColor={NEUTRAL} />
      <MarkdownView content={content} />
    </box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <text>
      <span fg={DIM}>{label.padEnd(10)}</span>
      <span fg={FG}>{value}</span>
    </text>
  );
}

// Pre-run state: shows the assembled selection and how to start it.
function ReadyView({ suspect, lens, model, language }: ReadyProps) {
  return (
    <box flexDirection="column">
      <box marginBottom={1}>
        <text fg={DIM} attributes={TextAttributes.DIM}>
          Ready when you are.
        </text>
      </box>
      <Row label="Suspect" value={suspect} />
      <Row label="Lens" value={lens} />
      <Row label="Model" value={model} />
      <Row label="Language" value={language} />
      <box marginTop={1}>
        <text>
          Press{" "}
          <span fg={ACCENT} attributes={TextAttributes.BOLD}>
            Enter
          </span>{" "}
          to analyze.
        </text>
      </box>
    </box>
  );
}

interface ReadyProps {
  suspect: string;
  lens: string;
  model: string;
  language: string;
}

interface WhyPaneProps {
  focused: boolean;
  perspective: Perspective;
  state: AnalysisState;
  suspect: string | null;
  model: string;
  language: Language;
  activeAnalysis: ActiveAnalysis | null;
  /** True when `state` reflects the current selection (vs. a stale prior run). */
  fresh: boolean;
  sessionTokens: number;
  sessionCostUsd: number | null;
}

export function WhyPane({
  focused,
  perspective,
  state,
  suspect,
  model,
  language,
  activeAnalysis,
  fresh,
  sessionTokens,
  sessionCostUsd,
}: WhyPaneProps) {
  const ref = useFocusRef<ScrollBoxRenderable>(focused);

  let body: React.ReactNode;
  let footer = "";
  if (state.status === "loading" && activeAnalysis) {
    const tokens = state.progress.approxOutputTokens;
    body = (
      <box flexDirection="column">
        <Spinner
          analysis={activeAnalysis}
          progress={state.progress}
          startedAt={state.startedAt}
        />
        <AnalysisMarkdown content={state.progress.markdown} />
      </box>
    );
    footer = `${activeAnalysis.lens} · Esc cancel · ~${fmtTokens(tokens)} out · ~${fmtTokens(state.progress.approxReasoningTokens)} reasoning`;
  } else if (!suspect) {
    body = (
      <text attributes={TextAttributes.DIM}>
        Select a suspect from the Who pane.
      </text>
    );
  } else if (fresh && state.status === "error") {
    body = (
      <box flexDirection="column">
        <text fg={ERROR}>analysis failed: {state.message}</text>
        <ActivityLog activities={state.progress.activities} now={Date.now()} />
        <AnalysisMarkdown content={state.progress.markdown} />
      </box>
    );
  } else if (fresh && state.status === "done") {
    body = (
      <box flexDirection="column">
        <CompletedRun
          suspect={suspect}
          lens={perspective.label}
          model={model}
          language={language}
          elapsedMs={state.elapsedMs}
          progress={state.progress}
        />
        <AnalysisMarkdown content={state.markdown} />
      </box>
    );
    const runCost =
      state.costUsd === undefined ? "" : ` · ${fmtCost(state.costUsd)}`;
    const sessionCost =
      sessionCostUsd === null
        ? `${fmtTokens(sessionTokens)} tok`
        : `${fmtTokens(sessionTokens)}/${fmtCost(sessionCostUsd)}`;
    footer = `${fmtTokens(state.usage.total)} tok${runCost} · session ${sessionCost} · ${fmtElapsed(state.elapsedMs)}`;
  } else {
    body = (
      <ReadyView
        suspect={suspect}
        lens={perspective.label}
        model={model}
        language={language}
      />
    );
  }

  return (
    <box
      title={`Diagnosis · ${activeAnalysis ? `running ${activeAnalysis.lens}` : perspective.label}`}
      bottomTitle={footer}
      border
      borderColor={focused ? ACCENT : NEUTRAL}
      padding={1}
      overflow="hidden"
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, minHeight: 0 }}
    >
      <scrollbox ref={ref} focused={focused} style={{ flexGrow: 1 }}>
        {body}
      </scrollbox>
    </box>
  );
}
