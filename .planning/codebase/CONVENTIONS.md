# Coding Conventions

**Analysis Date:** 2026-06-02

## Naming Patterns

**Files:**
- Current application source uses `index.tsx` as the root entry point
- No established feature file naming pattern yet
- No test file naming pattern yet

**Functions:**
- React components use PascalCase, as in `App`
- Imported framework functions use their library names, as in `createCliRenderer` and `createRoot`
- No event-handler naming pattern exists yet

**Variables:**
- Current code uses camelCase for variables, as in `renderer`
- No constant naming pattern has been established
- No private member pattern exists

**Types:**
- No local interfaces, type aliases, or enums are currently defined
- Imported type/value names follow upstream library naming, as in `TextAttributes`

## Code Style

**Formatting:**
- Two-space indentation in `src/index.tsx`
- Double quotes for imports and string props
- Semicolons are used
- JSX attributes are inline for compact components

**Linting:**
- No ESLint configuration is present
- No lint script exists in `package.json`

## Import Organization

**Order:**
1. External packages
2. Internal modules, when they exist
3. Relative imports, when they exist
4. Type imports, when they exist

**Grouping:**
- Current code has one grouped block of external imports
- No blank-line grouping pattern beyond the initial imports has been established

**Path Aliases:**
- No path aliases are configured in `tsconfig.json`
- Module resolution is set to `bundler`

## Error Handling

**Patterns:**
- No explicit error handling exists in current source
- Renderer initialization currently relies on top-level `await` and normal exception bubbling

**Error Types:**
- No custom errors are defined
- No Result-style or error-object pattern exists

## Logging

**Framework:**
- No logging framework is configured
- No `console.*` calls exist in current source

**Patterns:**
- Logging conventions should be defined when runtime interactions or command flows are added

## Comments

**When to Comment:**
- Current source has no comments
- Keep future comments focused on non-obvious terminal rendering or interaction behavior

**JSDoc/TSDoc:**
- Not currently used

**TODO Comments:**
- No TODO/FIXME comments were found in application files

## Function Design

**Size:**
- Current root component is intentionally small
- Extract helper components once UI branches or stateful flows emerge

**Parameters:**
- No custom function parameters are currently used

**Return Values:**
- Components return JSX directly
- Top-level bootstrap does not export values

## Module Design

**Exports:**
- No local exports currently exist
- `src/index.tsx` is executable entry code rather than a reusable module

**Barrel Files:**
- No barrel files exist
- Avoid introducing barrels until there are multiple reusable modules

---
*Convention analysis: 2026-06-02*
*Update when patterns change*
