// The analysis pane: renders metric bars or narrative sections from the result.

import { useEffect, useRef, useState } from "react";
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";
import type { MetricsResult, NarrativeResult, Perspective } from "../perspectives";
import type { Language } from "../ai";
import type { AnalysisState } from "../types";

const NEUTRAL = "#4B5563";
const ACCENT = "#A6E22E";
const DIM = "#9CA3AF";
const ERROR = "#F87171";
const FG = "#E5E7EB";
const BAR_WIDTH = 18;
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

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
}

interface ActiveAnalysis {
  suspect: string;
  lens: string;
  model: string;
  language: Language;
}

function Spinner({
  analysis,
  tokens,
  startedAt,
}: {
  analysis: ActiveAnalysis;
  tokens: number;
  startedAt: number;
}) {
  const [frame, setFrame] = useState(0);
  // Derive elapsed seconds from the absolute start time so it stays correct
  // across remounts (switching lens away and back) instead of resetting to 0.
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
  // The message advances roughly every 5s; seed from startedAt so a fresh run
  // doesn't always open on the same word.
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(startedAt / 5000));
  useEffect(() => {
    const tick = setInterval(() => setFrame((f) => f + 1), 100);
    const clock = setInterval(
      () => setSecs(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))),
      1000,
    );
    const cycle = setInterval(() => setMsgIndex((i) => i + 1), 5000);
    return () => {
      clearInterval(tick);
      clearInterval(clock);
      clearInterval(cycle);
    };
  }, [startedAt]);
  const glyph = SPINNER[frame % SPINNER.length] ?? "⠋";
  const message = LOADING_MESSAGES[msgIndex % LOADING_MESSAGES.length] ?? "Analyzing…";
  return (
    <box flexDirection="column">
      <text fg={ACCENT}>
        {glyph} {message} <span fg={FG}>{analysis.suspect}</span>
      </text>
      <text fg={DIM}>
        {analysis.lens} · {analysis.model} · {analysis.language}
      </text>
      <text fg={DIM}>
        {secs}s · ~{fmtTokens(tokens)} tok · Esc cancels
      </text>
    </box>
  );
}

function MetricBar({ name, value, evidence }: { name: string; value: number; evidence: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const filled = Math.round((clamped / 100) * BAR_WIDTH);
  return (
    <box flexDirection="column" marginBottom={1}>
      <text>
        {name} <span fg={ACCENT}>{clamped}</span>
      </text>
      <text fg={ACCENT}>
        {"█".repeat(filled)}
        <span fg={NEUTRAL}>{"░".repeat(BAR_WIDTH - filled)}</span>
      </text>
      <text fg={DIM} attributes={TextAttributes.DIM}>
        {evidence}
      </text>
    </box>
  );
}

function MetricsView({ result }: { result: MetricsResult }) {
  return (
    <box flexDirection="column">
      {result.metrics.map((m, i) => (
        <MetricBar key={i} name={m.name} value={m.value} evidence={m.evidence} />
      ))}
      {result.notes.length > 0 && (
        <box flexDirection="column" marginTop={1}>
          {result.notes.map((n, i) => (
            <text key={i} fg={DIM} attributes={TextAttributes.DIM}>
              · {n}
            </text>
          ))}
        </box>
      )}
    </box>
  );
}

function NarrativeView({ result }: { result: NarrativeResult }) {
  return (
    <box flexDirection="column">
      {result.sections.map((s, i) => (
        <box key={i} flexDirection="column" marginBottom={1}>
          <text fg={ACCENT} attributes={TextAttributes.BOLD}>
            {s.heading}
          </text>
          <text fg={DIM}>{s.body}</text>
        </box>
      ))}
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
          Press <span fg={ACCENT} attributes={TextAttributes.BOLD}>Enter</span> to analyze.
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
}: WhyPaneProps) {
  const ref = useRef<ScrollBoxRenderable>(null);
  useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);

  let body: React.ReactNode;
  let footer = "";
  if (state.status === "loading" && activeAnalysis) {
    const tokens = state.approxOutputTokens;
    body = <Spinner analysis={activeAnalysis} tokens={tokens} startedAt={state.startedAt} />;
    footer = `${activeAnalysis.lens} · Esc cancel · ~${fmtTokens(tokens)} tok…`;
  } else if (!suspect) {
    body = <text attributes={TextAttributes.DIM}>Select a suspect from the Who pane.</text>;
  } else if (fresh && state.status === "error") {
    body = <text fg={ERROR}>analysis failed: {state.message}</text>;
  } else if (fresh && state.status === "done") {
    body =
      perspective.renderer === "metric-bars" ? (
        <MetricsView result={state.value as MetricsResult} />
      ) : (
        <NarrativeView result={state.value as NarrativeResult} />
      );
    footer = `${state.usage.output} out · ${fmtTokens(state.usage.total)} tok · session ${fmtTokens(sessionTokens)} · ${fmtTime(state.generatedAt)} · ${fmtElapsed(state.elapsedMs)}`;
  } else {
    body = (
      <ReadyView suspect={suspect} lens={perspective.label} model={model} language={language} />
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
