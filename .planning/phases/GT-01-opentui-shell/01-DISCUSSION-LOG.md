# Phase 1: OpenTUI Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 1-OpenTUI Shell
**Areas discussed:** Pane content and labels

---

## Pane Content and Labels

| Option | Description | Selected |
|--------|-------------|----------|
| Source / Authors / Analysis | Matches the roadmap and keeps later phases obvious. | |
| Blame / Authors / Analysis | More git-native, but Phase 2 owns real blame rendering. | |
| Source / Suspects / Diagnosis | More themed, but risks making Phase 1 feel jokey. | |
| Other | User-provided exact titles. | ✓ |

**User's choice:** `What`, `Who`, and `Why`.
**Notes:** These labels preserve the product premise while staying short and minimal.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Plain placeholders | `Source will appear here`, `Authors will appear here`, `Analysis will appear here`. | |
| Deadpan placeholders | `No file under examination`, `No suspects identified`, `No theory formed`. | ✓ |
| Sparse shell | Show titles only, with no body copy. | |
| Other | User-provided exact placeholder behavior. | |

**User's choice:** Deadpan placeholders.
**Notes:** Placeholder copy should be clinical and restrained, not jokey.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show `Perspective: Mental` in the Why pane | Prepares Phase 5 without implying analysis is running. | |
| Show `Perspective: None` | Accurate for Phase 1, but less useful for hotkey wiring. | |
| Omit perspective text entirely | Cleanest shell; hotkey state has no visible confirmation. | ✓ |
| Other | User-provided preference. | |

**User's choice:** Omit perspective text entirely in Phase 1.
**Notes:** Perspective UI should wait until analysis phases.

---

| Option | Description | Selected |
|--------|-------------|----------|
| No counts or status hints | Keep Phase 1 as a clean empty shell. | ✓ |
| Minimal zero states | Show `0 lines`, `0 authors`, and `idle`. | |
| Only analysis status | Show `Idle` in Why, because later phases stream there. | |
| Other | User-provided preference. | |

**User's choice:** No counts or status hints.
**Notes:** The user then approved context creation and delegated remaining decisions to the agent: choose the cleanest minimal solution without sacrificing core functionality.

---

## the agent's Discretion

- Focus indicator: use a minimal but unambiguous visual distinction for the focused pane.
- Hotkey feedback: register `1`-`4` as inert handlers with no visible perspective UI in Phase 1.
- Keymap affordance: do not add a controls footer/status line in Phase 1.

## Deferred Ideas

None.
