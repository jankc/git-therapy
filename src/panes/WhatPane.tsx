// The source pane: each scoped line prefixed with a git-blame gutter.

import { useEffect, useRef } from "react";
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";
import type { Perspective } from "../perspectives";
import type {
  AuthorEvidence,
  BlameLine,
  EvidenceCollectionSummary,
} from "../types";

const NEUTRAL = "#4B5563";
const ACCENT = "#A6E22E";
const GUTTER = "#6B7280";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function shortDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

interface WhatPaneProps {
  focused: boolean;
  file: string;
  blame: BlameLine[];
  authors: AuthorEvidence[];
  evidenceSummary: EvidenceCollectionSummary;
  selectedAuthor: AuthorEvidence | null;
  perspective: Perspective;
  view: "code" | "evidence";
}

function fmtDuration(ms: number): string {
  return ms < 10 ? `${ms.toFixed(1)}ms` : `${Math.round(ms)}ms`;
}

function EvidenceView({
  authors,
  summary,
  selectedAuthor,
  perspective,
}: {
  authors: AuthorEvidence[];
  summary: EvidenceCollectionSummary;
  selectedAuthor: AuthorEvidence | null;
  perspective: Perspective;
}) {
  const promptChars = selectedAuthor ? perspective.buildPrompt(selectedAuthor).length : 0;
  const signalCount = selectedAuthor
    ? Object.keys(selectedAuthor.derived).length - 1 +
      Object.keys(selectedAuthor.derived.codeScan).length
    : 0;
  const comparisonCount = selectedAuthor
    ? Object.keys(selectedAuthor.relativeToFile).length - 1
    : 0;

  return (
    <box flexDirection="column">
      <text attributes={TextAttributes.BOLD}>Selected suspect</text>
      {selectedAuthor ? (
        <>
          <text>{selectedAuthor.author.name || selectedAuthor.author.email || "(unknown)"}</text>
          <text>
            {selectedAuthor.linesAuthored} owned lines · {selectedAuthor.lineRanges.length} ranges
          </text>
          <text>
            primary: {selectedAuthor.blamedLines.length} blamed lines ·{" "}
            {selectedAuthor.blamedCommits.length} blamed commits
          </text>
          <text>
            background: {selectedAuthor.authorBaseline.totalFileCommits} file commits ·{" "}
            {selectedAuthor.authorBaseline.timeSpanDays.toFixed(1)} days
          </text>
          <text>
            derived: {signalCount} signals · comparisons: {comparisonCount} across{" "}
            {authors.length} authors
          </text>
          <text>
            {perspective.label}: {promptChars.toLocaleString()} chars · ~
            {Math.ceil(promptChars / 4).toLocaleString()} tok
          </text>
        </>
      ) : (
        <text attributes={TextAttributes.DIM}>No suspect selected.</text>
      )}

      <box marginTop={1} flexDirection="column">
        <text attributes={TextAttributes.BOLD}>Collection</text>
        <text>
          {summary.scopedLines} scoped lines · {summary.sourceCharacters.toLocaleString()} source chars
        </text>
        <text>
          {summary.historyCommits} history commits · {summary.authorCount} authors
        </text>
        <text fg={GUTTER}>git blame --line-porcelain</text>
        <text fg={GUTTER}>git log --no-merges --follow --numstat</text>
        <text fg={GUTTER}>
          git {fmtDuration(summary.gitCollectionMs)} · derive {fmtDuration(summary.evidenceBuildMs)}
        </text>
      </box>
    </box>
  );
}

export function WhatPane({
  focused,
  file,
  blame,
  authors,
  evidenceSummary,
  selectedAuthor,
  perspective,
  view,
}: WhatPaneProps) {
  // Match lines to the suspect the same way evidence buckets them (evidence.ts).
  const selectedKey = selectedAuthor?.author.email || selectedAuthor?.author.name || null;
  const ref = useRef<ScrollBoxRenderable>(null);
  // Imperatively grab keyboard focus so arrow keys scroll this pane.
  useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);

  return (
    <box
      title={`Symptoms · ${view === "code" ? "[Code] | Evidence" : "Code | [Evidence]"} [v]`}
      bottomTitle={view === "code" ? file : `${evidenceSummary.scopedLines} lines · ${evidenceSummary.historyCommits} commits`}
      border
      borderColor={focused ? ACCENT : NEUTRAL}
      padding={1}
      overflow="hidden"
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, minHeight: 0 }}
    >
      <scrollbox ref={ref} focused={focused} style={{ flexGrow: 1 }}>
        {view === "evidence" ? (
          <EvidenceView
            authors={authors}
            summary={evidenceSummary}
            selectedAuthor={selectedAuthor}
            perspective={perspective}
          />
        ) : blame.length === 0 ? (
          <text attributes={TextAttributes.DIM}>No blame data for this scope.</text>
        ) : (
          blame.map((line) => {
            // Brighten the gutter for the selected suspect; leave others muted.
            const mine = selectedKey !== null && (line.authorMail || line.author) === selectedKey;
            return (
              <text key={line.lineNumber}>
                <span fg={mine ? ACCENT : GUTTER} attributes={mine ? undefined : TextAttributes.DIM}>
                  {line.sha} {initials(line.author).padEnd(2)} {shortDate(line.authorTime)}{" "}
                </span>
                {line.code}
              </text>
            );
          })
        )}
      </scrollbox>
    </box>
  );
}
