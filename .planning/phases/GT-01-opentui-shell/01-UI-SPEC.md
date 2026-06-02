---
phase: 01
slug: opentui-shell
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-02
reviewed_at: 2026-06-02
---

# Phase 01 - UI Design Contract

Visual and interaction contract for the first OpenTUI shell. This contract is scoped to terminal rendering only.

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | OpenTUI React primitives (`box`, `text`) |
| Icon library | none in Phase 1 |
| Font | terminal default monospace |

No web design system is initialized. This project is a terminal UI, not a browser React/Next/Vite surface. Do not initialize shadcn, Tailwind, CSS tokens, browser icons, or web component registries for this phase.

## Component Inventory

| Component | Source | Contract |
|-----------|--------|----------|
| Root shell | `src/index.tsx` | Full-height horizontal terminal layout with exactly three visible pane boxes. |
| Pane box | OpenTUI `<box>` | Bordered container with `title`, body copy, stable width allocation, and optional focused border color. |
| Pane body text | OpenTUI `<text>` | One locked empty-state string per pane. |
| Keyboard handler | `useKeyboard` from `@opentui/react` | Handles `tab`, `q`, and inert `1` to `4` hotkeys. |

## Layout Contract

| Region | Allocation | Title | Body Copy |
|--------|------------|-------|-----------|
| Source/blame pane | 60% target width | `What` | `No file under examination` |
| Authors pane | 20% target width | `Who` | `No suspects identified` |
| Analysis pane | 20% target width | `Why` | `No theory formed` |

Layout rules:

- Render the three panes simultaneously at startup.
- Use one horizontal row. Do not stack panes in Phase 1 unless the terminal is too narrow to render readable boxes.
- Keep pane borders visible at all times.
- Initial focus is the `What` pane.
- Focus order is `What -> Who -> Why -> What`.
- Do not add a footer, help strip, perspective label, status line, counts, loading state, file picker, author list, or analysis placeholder beyond the locked body copy.

## Visual Hierarchy

| Element | Priority | Treatment |
|---------|----------|-----------|
| Focused pane | Primary focal point | Accent-colored border only. |
| Pane titles | Secondary | Semibold text if available through OpenTUI attributes; otherwise plain title text. |
| Pane body copy | Tertiary | Dim text, one line where terminal width allows. |

The shell should feel clinical and quiet. The user should first notice which pane has focus, then read the three titles. Do not introduce animation, illustration, gradients, decorative cards, or oversized display text.

## Spacing Scale

Declared values, all multiples of 4:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline text gaps if needed |
| sm | 8px | Compact internal pane padding equivalent |
| md | 16px | Default pane padding equivalent |
| lg | 24px | Root edge padding equivalent |
| xl | 32px | Gap between major regions if terminal width permits |
| 2xl | 48px | Reserved for later phase section breaks |
| 3xl | 64px | Reserved for later phase page-level spacing |

Terminal mapping:

- OpenTUI may express spacing in terminal cells rather than CSS pixels.
- Use the nearest cell equivalent while preserving the 4-point scale intent.
- Phase 1 pane gap target is 1 terminal cell.
- Phase 1 pane internal padding target is 1 terminal cell.

Exceptions: none.

## Typography

The terminal controls actual font family and pixel rendering. These values define hierarchy targets for implementation and later visual review.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label | 14px equivalent | 400 regular | 1.2 |
| Body | 16px equivalent | 400 regular | 1.5 |
| Heading | 20px equivalent | 600 semibold | 1.2 |
| Display | not used in Phase 1 | not used | not used |

Typography rules:

- Use no more than Label, Body, and Heading hierarchy in Phase 1.
- Pane titles are Heading role.
- Pane body copy is Body role.
- Do not render the starter `OpenTUI` ascii-font display.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#0B0D0E` | Terminal background and root shell surface |
| Secondary (30%) | `#161A1D` | Pane interior surface if background color is set |
| Accent (10%) | `#A6E22E` | Focused pane border only |
| Destructive | `#FF5C57` | Reserved for future destructive/error actions; unused in Phase 1 |

Accent reserved for: focused pane border.

Color rules:

- Unfocused pane borders use a neutral gray such as `#4B5563`.
- Body copy may use dim text treatment or neutral gray such as `#8B949E`.
- Normal title/body text should remain high-contrast, such as `#E6E6E6`.
- Do not use accent color for all interactive elements.
- Do not introduce perspective-specific colors in Phase 1.

## Interaction Contract

| Key | Behavior | Visible Result |
|-----|----------|----------------|
| `tab` | Cycle focus to the next pane | Focus border moves to the next pane. |
| `q` | Quit the TUI process | User returns to shell without an unhandled error. |
| `1` | Registered inert perspective hotkey | No visible change and no analysis call. |
| `2` | Registered inert perspective hotkey | No visible change and no analysis call. |
| `3` | Registered inert perspective hotkey | No visible change and no analysis call. |
| `4` | Registered inert perspective hotkey | No visible change and no analysis call. |

Interaction rules:

- `tab` must not create or remove panes.
- `1` to `4` must not show active perspective text in Phase 1.
- `1` to `4` must not call git, AI providers, or future perspective registry code.
- There are no mouse interactions in Phase 1.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | None - Phase 1 has no button or command CTA. |
| Empty state heading | Pane titles: `What`, `Who`, `Why` |
| Empty state body | `No file under examination`; `No suspects identified`; `No theory formed` |
| Error state | `Terminal shell unavailable. Rerun bun dev and inspect the startup error.` |
| Destructive confirmation | None - no destructive actions exist in Phase 1. |

Copywriting rules:

- Keep the deadpan forensic tone.
- Do not add jokes, tooltips, or explanatory onboarding text.
- Do not add `0 lines`, `0 authors`, `idle`, or other status hints.
- Do not add a keymap footer in Phase 1.

## Accessibility and Terminal Ergonomics

| Concern | Contract |
|---------|----------|
| Keyboard access | All Phase 1 behavior is keyboard-only: Tab, q, and 1-4. |
| Focus visibility | Focus must be visible through border treatment, not copy changes alone. |
| Contrast | Text and border colors must remain readable on a dark terminal background. |
| Motion | No animation or blinking treatment. |
| Screen reader equivalent | Not applicable to raw terminal rendering; preserve plain text labels and body copy. |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable - no browser UI components |

No third-party registries are declared or used.

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-02
