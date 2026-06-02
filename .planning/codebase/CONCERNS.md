# Codebase Concerns

**Analysis Date:** 2026-06-02

## Tech Debt

**Starter app only:**
- Issue: The codebase is still the generated OpenTUI starter with one static component
- Files: `src/index.tsx`, `README.md`
- Why: Project initialization has not yet defined product behavior
- Impact: There are no established domain modules, state patterns, test patterns, or error boundaries to reuse
- Fix approach: Let initial GSD phases introduce structure only when real requirements demand it

**No automated verification:**
- Issue: No test, lint, typecheck, or CI scripts are configured
- Files: `package.json`, `tsconfig.json`
- Why: Generated starter only includes `bun dev`
- Impact: Future changes can regress silently unless manually checked
- Fix approach: Add minimal scripts as soon as behavior becomes non-trivial, likely starting with typecheck and unit tests for extracted logic

## Known Bugs

**None documented:**
- Symptoms: No known runtime bugs found during mapping
- Trigger: Not applicable
- Workaround: Not applicable
- Root cause: Not applicable

## Security Considerations

**No secret handling yet:**
- Risk: Low currently because the app has no env vars, network calls, auth, or persistence
- Current mitigation: No sensitive data is handled
- Recommendations: Define secret and env conventions before adding integrations

**Terminal UI input handling not yet designed:**
- Risk: Future interactive flows may need careful validation and escaping, especially if shell commands or git operations are added
- Current mitigation: Current UI accepts no input
- Recommendations: Validate user inputs at boundaries and avoid passing raw user text to shell commands

## Performance Bottlenecks

**No measured bottlenecks:**
- Problem: No dynamic or high-volume behavior exists yet
- Measurement: Not measured
- Cause: Not applicable
- Improvement path: Establish performance checks when interaction loops, file scanning, or git operations are introduced

## Fragile Areas

**Single-file bootstrap:**
- Why fragile: UI definition and renderer initialization are currently coupled in `src/index.tsx`
- Common failures: Future feature additions may make the entry file grow into mixed bootstrap, state, and presentation logic
- Safe modification: Extract components and state modules once there is a second meaningful responsibility
- Test coverage: None

**OpenTUI JSX primitives:**
- Why fragile: The code depends on non-DOM JSX elements such as `<box>`, `<ascii-font>`, and `<text>`
- Common failures: Treating the UI like browser React may introduce unsupported DOM assumptions
- Safe modification: Follow `@opentui/react` patterns and verify in an actual terminal
- Test coverage: None

## Scaling Limits

**No application scale model yet:**
- Current capacity: Static UI only
- Limit: Unknown
- Symptoms at limit: Not applicable yet
- Scaling path: Depends on future product scope

## Dependencies at Risk

**OpenTUI 0.3.x ecosystem:**
- Risk: `@opentui/core` and `@opentui/react` are early-version dependencies
- Impact: APIs may shift, especially around JSX primitives and renderer behavior
- Migration plan: Keep dependency changes deliberate and verify UI manually after upgrades

**`@types/bun` set to latest:**
- Risk: Floating type dependency may change behavior between installs
- Impact: Type checking can change without a package.json edit
- Migration plan: Pin if reproducibility becomes important

## Missing Critical Features

**Product behavior undefined:**
- Problem: The app currently displays a placeholder prompt only
- Current workaround: None
- Blocks: Requirements, roadmap, and implementation planning
- Implementation complexity: Depends on project definition

**No persistence or integrations:**
- Problem: There is no data layer, external API, or storage
- Current workaround: Static UI only
- Blocks: Any feature needing saved state or external information
- Implementation complexity: Depends on chosen product direction

## Test Coverage Gaps

**Entire application:**
- What's not tested: Renderer bootstrap and root component behavior
- Risk: Changes can break startup or terminal rendering without automated detection
- Priority: Medium once behavior is added
- Difficulty to test: Terminal UI testing requires selecting an appropriate harness

---
*Concerns audit: 2026-06-02*
*Update as issues are fixed or new ones discovered*
