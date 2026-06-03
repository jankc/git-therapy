// The analysis pane: renders metric bars or narrative sections from the result.

import { useEffect, useRef, useState } from "react";
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";
import type { MetricsResult, NarrativeResult, Perspective } from "../perspectives";
import type { AnalysisState } from "../types";

const NEUTRAL = "#4B5563";
const ACCENT = "#A6E22E";
const DIM = "#9CA3AF";
const ERROR = "#F87171";
const BAR_WIDTH = 18;
const SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

function fmtTokens(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function Spinner({ label, tokens }: { label: string; tokens: number }) {
  const [frame, setFrame] = useState(0);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setFrame((f) => f + 1), 100);
    const clock = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => {
      clearInterval(tick);
      clearInterval(clock);
    };
  }, []);
  const glyph = SPINNER[frame % SPINNER.length] ?? "⠋";
  return (
    <text fg={ACCENT}>
      {glyph} analyzing… <span fg={DIM}>{label}</span>{" "}
      <span fg={DIM}>({secs}s · ~{fmtTokens(tokens)} tok)</span>
    </text>
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

interface WhyPaneProps {
  focused: boolean;
  perspective: Perspective;
  state: AnalysisState;
  hasAuthor: boolean;
  sessionTokens: number;
}

export function WhyPane({ focused, perspective, state, hasAuthor, sessionTokens }: WhyPaneProps) {
  const ref = useRef<ScrollBoxRenderable>(null);
  useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);

  let body: React.ReactNode;
  let footer = "";
  if (!hasAuthor) {
    body = <text attributes={TextAttributes.DIM}>Select a suspect from the Who pane.</text>;
  } else if (state.status === "idle" || state.status === "loading") {
    const tokens = state.status === "loading" ? state.approxOutputTokens : 0;
    body = <Spinner label={perspective.label} tokens={tokens} />;
    footer = `~${fmtTokens(tokens)} tok…`;
  } else if (state.status === "error") {
    body = <text fg={ERROR}>analysis failed: {state.message}</text>;
  } else if (perspective.renderer === "metric-bars") {
    body = <MetricsView result={state.value as MetricsResult} />;
  } else {
    body = <NarrativeView result={state.value as NarrativeResult} />;
  }

  if (state.status === "done") {
    footer = `${state.usage.output} out · ${fmtTokens(state.usage.total)} tok · session ${fmtTokens(sessionTokens)}`;
  }

  return (
    <box
      title={`Why · ${perspective.label} [${perspective.hotkey}]`}
      bottomTitle={footer}
      border
      borderColor={focused ? ACCENT : NEUTRAL}
      padding={1}
      overflow="hidden"
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
    >
      <scrollbox ref={ref} focused={focused} style={{ flexGrow: 1 }}>
        {body}
      </scrollbox>
    </box>
  );
}
