// The source pane: each scoped line prefixed with a git-blame gutter.

import { useEffect, useRef } from "react";
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";
import type { BlameLine } from "../types";

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
}

export function WhatPane({ focused, file, blame }: WhatPaneProps) {
  const ref = useRef<ScrollBoxRenderable>(null);
  // Imperatively grab keyboard focus so arrow keys scroll this pane.
  useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);

  return (
    <box
      title="Symptoms"
      bottomTitle={file}
      border
      borderColor={focused ? ACCENT : NEUTRAL}
      padding={1}
      overflow="hidden"
      style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, minHeight: 0 }}
    >
      <scrollbox ref={ref} focused={focused} style={{ flexGrow: 1 }}>
        {blame.length === 0 ? (
          <text attributes={TextAttributes.DIM}>No blame data for this scope.</text>
        ) : (
          blame.map((line) => (
            <text key={line.lineNumber}>
              <span fg={GUTTER} attributes={TextAttributes.DIM}>
                {line.sha} {initials(line.author).padEnd(2)} {shortDate(line.authorTime)}{" "}
              </span>
              {line.code}
            </text>
          ))
        )}
      </scrollbox>
    </box>
  );
}
