// The analysis pane: renders metric bars or narrative sections from the result.

import { TextAttributes } from "@opentui/core";
import type { MetricsResult, NarrativeResult, Perspective } from "../perspectives";
import type { AnalysisState } from "../types";

const NEUTRAL = "#4B5563";
const ACCENT = "#A6E22E";
const DIM = "#9CA3AF";
const ERROR = "#F87171";
const BAR_WIDTH = 18;

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
}

export function WhyPane({ focused, perspective, state, hasAuthor }: WhyPaneProps) {
  let body: React.ReactNode;

  if (!hasAuthor) {
    body = <text attributes={TextAttributes.DIM}>Select a suspect from the Who pane.</text>;
  } else if (state.status === "idle" || state.status === "loading") {
    body = <text attributes={TextAttributes.DIM}>analyzing… {perspective.label}</text>;
  } else if (state.status === "error") {
    body = <text fg={ERROR}>analysis failed: {state.message}</text>;
  } else if (perspective.renderer === "metric-bars") {
    body = <MetricsView result={state.value as MetricsResult} />;
  } else {
    body = <NarrativeView result={state.value as NarrativeResult} />;
  }

  return (
    <box
      title={`Why · ${perspective.label} [${perspective.hotkey}]`}
      border
      borderColor={NEUTRAL}
      focusedBorderColor={ACCENT}
      focusable
      focused={focused}
      padding={1}
      overflow="hidden"
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
    >
      <scrollbox focused={focused} style={{ flexGrow: 1 }}>
        {body}
      </scrollbox>
    </box>
  );
}
