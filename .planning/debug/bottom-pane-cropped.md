---
status: resolved
trigger: "In some terminal window sizes the pane rendering is off at the bottom. The block with model/language is one line further and cropped."
created: "2026-06-03"
updated: "2026-06-03"
---

# Debug Session: Bottom Pane Cropped

## Symptoms

- expected_behavior: The model/language selector row stays aligned with the lower-left layout and remains fully visible at the bottom of the terminal.
- actual_behavior: At some terminal window sizes, the model/language row is rendered one line too low and the bottom is cropped.
- error_messages: None reported; visual terminal layout defect.
- timeline: Unknown.
- reproduction: Run the TUI and resize the terminal to affected dimensions; screenshot shows the selector row shifted below the adjacent diagnosis pane bottom.

## Current Focus

- hypothesis: lower-left flex stack lets the fixed selector row render past the terminal bottom
- test: render App in OpenTUI's memory renderer at multiple terminal heights
- expecting: selector bottom border is present on the terminal bottom row
- next_action: resolved
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-03
  finding: At 120x16, the model/language selector content rendered on row 15 and its bottom border would have rendered on row 16, outside the 0-15 viewport.
- timestamp: 2026-06-03
  finding: The lower-left column used flex sizing for the subject/examination row and fixed height for the model/language row without reserving enough bottom-safe space.
- timestamp: 2026-06-03
  finding: A `space-between` cleanup pinned model/language to the bottom but split the control cluster apart at taller terminal sizes; the subject/examination panes also need enough content height for select labels/descriptions.

## Eliminated

## Resolution

- root_cause: The lower-left flex column compressed and placed the fixed-height model/language row at the terminal bottom without room for its bottom border; a later `space-between` cleanup separated related controls instead of keeping the lower control cluster together.
- fix: Made the lower control cluster a fixed-height bottom block: a 6-row subject/examination row, 1-row gap, and 3-row model/language row. The source pane absorbs extra or missing vertical space.
- verification: `bun test`; `node_modules/.bin/tsc --noEmit`; captured 120x16 frame shows subject/examination content visible and model/language bottom borders on row 15.
- files_changed: `src/App.tsx`, `src/App.layout.test.tsx`
