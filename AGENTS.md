# AGENTS.md

## Purpose

This document is for autonomous coding agents working in this repository.
Follow these project-specific commands, constraints, and conventions.

## Project Snapshot

- Stack: TypeScript + Vite + Vitest
- Runtime: Browser app (Canvas/SVG), no backend service
- Module system: ESM (`"type": "module"`)
- Source root: `src/`
- Tests: `src/tests/**/*.test.ts`
- Test environment: Node (configured in `vite.config.ts`)
- Build output: `dist/`
- Type safety: strict TypeScript, `noUnusedLocals`, `noUnusedParameters`

## Setup Commands

- Install dependencies:
  - `npm install`
- Start dev server:
  - `npm run dev`
- Preview production build locally:
  - `npm run preview`

## Build / Lint / Test Commands

### Build

- Full build (type-check + Vite build):
  - `npm run build`
- Notes:
  - `build` runs: `tsc && vite build`

### Lint / Static Checks

- There is no dedicated ESLint or Prettier config/script in this repo.
- Use TypeScript checks as the quality gate:
  - `npx tsc --noEmit`
- `npm run build` is also a valid gate since it runs `tsc`.

### Tests

- Run all tests once:
  - `npm run test`
- Watch mode:
  - `npm run test:watch`
- Coverage:
  - `npm run test:coverage`

### Run a Single Test File (important)

- Preferred:
  - `npm run test -- src/tests/rng.test.ts`
- Alternative direct Vitest:
  - `npx vitest run src/tests/rng.test.ts`

### Run a Single Test Case by Name

- By test name pattern:
  - `npm run test -- -t "parseSeed"`
- File + test name:
  - `npm run test -- src/tests/rng.test.ts -t "parseSeed"`

## Test Conventions

- Use Vitest APIs:
  - `describe`, `it`, `expect` from `vitest`
- Keep tests deterministic (seeded RNG is available).
- Prefer focused unit tests per module (`gradient`, `rng`, `exporter`, etc.).
- Since environment is Node, avoid browser-only DOM assumptions in tests unless explicitly configured.

## High-Level Architecture

- `src/main.ts`: app bootstrap, orchestration, wiring callbacks
- `src/ui.ts`: control panel logic, localStorage, event bindings
- `src/renderer.ts`: grid rendering and frame queueing
- `src/brickGenerator.ts`: brick-mode generation + canvas/SVG helpers
- `src/pixelEditor.ts`: manual cell editing and pointer interactions
- `src/exporter.ts`: PNG/SVG/JSON export helpers
- `src/gradient.ts`: color parsing and interpolation
- `src/rng.ts`: seeded random utilities
- `src/types.ts`: shared domain types and constants
- `src/tests/`: unit tests

## Code Style Guidelines

### Imports

- Use ESM imports with explicit relative paths.
- Keep `import type` separated for type-only imports.
- Group imports as:
  1. type imports
  2. value imports
- Prefer named exports; avoid default exports unless already established.

### Formatting

- Follow existing file-local formatting; do not mass-reformat unrelated code.
- Use semicolons.
- Use single quotes for strings.
- Use trailing commas in multiline objects/arrays/args where existing style uses them.
- Keep line length reasonable and readable.
- Preserve existing comment blocks and JSDoc style where present.

### Types and TypeScript

- Maintain strict typing; avoid `any`.
- Prefer explicit function return types for exported functions.
- Use narrow union types from `src/types.ts` (e.g., `GradientDirection`, `GeneratorType`).
- Validate nullable lookups (`getElementById`, `canvas.getContext`) before use.
- Use `Map<string, string>` for cell override collections, consistent with current design.

### Naming Conventions

- Types/interfaces: `PascalCase` (`PatternSettings`, `BrickCell`)
- Functions/variables: `camelCase` (`generateCellData`, `safeColor`)
- Constants: `UPPER_SNAKE_CASE` for global constants (`MAX_CANVAS_PIXELS`)
- Booleans: use readable predicates (`isDrawing`, `editMode`, `showCracks`)
- Event handlers: `handleX` naming (`handlePointerDown`, `handleExportPNG`)

### Error Handling and Logging

- Throw `Error` for impossible/required state failures (missing canvas context, missing required elements).
- For user-triggered flows (export/import), catch errors and provide:
  - console detail (`console.error` or `console.warn`)
  - user-facing feedback when applicable
- Avoid swallowing errors silently unless intentionally safe fallback is required.
- Use guard clauses early (`if (!uiState) return;`).

### State and Mutability

- Prefer immutable updates for settings objects (`{ ...state, field }`).
- Mutating `Map` is acceptable where already used; ensure references are synchronized when needed.
- Keep deterministic behavior by threading seeded RNG from settings.

### DOM and UI Logic

- Centralize DOM reads/writes in UI-related modules.
- Keep rendering and generation logic separate from direct DOM manipulation.
- Use typed element helpers and explicit casts only when necessary.

### Performance and Determinism

- Preserve `requestAnimationFrame` queueing behavior in renderer.
- Keep generation deterministic for identical seed + settings.
- Avoid introducing non-deterministic randomness in core render paths.

## File-Specific Guidance

- `types.ts` is the source of truth for shared contracts; update it first when adding settings.
- If adding a new generator mode, keep both canvas and SVG export paths aligned.
- For export features, ensure filenames and metadata remain stable and parseable.
- For UI controls, update both:
  - state wiring
  - `syncUIToSettings` projection back to inputs

## Agent Workflow Expectations

- Make focused, minimal diffs.
- Do not edit generated/build output manually (`dist/`).
- Add or update tests when behavior changes.
- Run relevant checks before finalizing:
  1. `npm run test` (or targeted test command)
  2. `npm run build`
- If a full suite is too expensive, run nearest targeted tests and state what was not run.

## Cursor / Copilot Rule Files

The following rule files were checked and not found in this repository:

- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

If these files are added later, treat their instructions as higher-priority repository rules and merge them into this guide.

## Quick Pre-PR Checklist

- Code compiles under strict TypeScript.
- Behavior is deterministic where expected (seeded paths).
- Tests added/updated for changed logic.
- Single-test command documented in PR notes if useful.
- No unrelated refactors or formatting churn.
- No secrets or local environment artifacts committed.
