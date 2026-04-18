# Generative Pattern

Generative Pattern is a local-first TypeScript + Vite app for making deterministic abstract art in the browser. It supports both a classic grid renderer and a brick-style generator, with export to PNG and SVG.

## Features

- Dual generators: `grid` and `brick`.
- Deterministic output: the same seed + settings always recreate the same image.
- Palette tools: up to 20 colors, drag reorder, save/load palettes in `localStorage`.
- Color behavior controls: direction, randomness, solid vs gradient cell mode, gradient blend factor.
- Wave distortion: stack multiple wave layers (amplitude, frequency, phase, influence).
- Symmetry options: horizontal and vertical mirroring.
- Pixel editor: brush painting, brush size `1-32`, eyedropper (`Shift + Click`), clear overrides.
- Color replacement utility for bulk cell recoloring.
- Brick controls: style, dimensions, mortar, variation, cracks, moss, and SVG optimization.
- Brick texture modes: `solid`, `singlePreset`, and `randomPreset`, with scale/rotation controls.
- Export helpers: PNG and SVG with deterministic naming and metadata.

## Quick Start

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check (`tsc`) and build production assets |
| `npm run preview` | Preview the built app locally |
| `npm run test` | Run all Vitest tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage output |

Useful targeted test commands:

```bash
npm run test -- src/tests/rng.test.ts
npm run test -- -t "parseSeed"
npm run test -- src/tests/rng.test.ts -t "parseSeed"
```

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Ctrl/Cmd + S` | Export PNG |
| `Ctrl/Cmd + X` | Export SVG |
| `R` | Regenerate with a new seed |
| `E` | Toggle edit mode |
| `Shift + Click` | Eyedropper color pick |

## Project Layout

```text
src/
|- main.ts            # app bootstrap and wiring
|- ui.ts              # controls, bindings, localStorage
|- renderer.ts        # frame queue + drawing orchestration
|- brickGenerator.ts  # brick generation + brick render helpers
|- waveDistortion.ts  # wave layer transformation logic
|- exporter.ts        # PNG/SVG/JSON export helpers
|- pixelEditor.ts     # manual cell editing interactions
|- colorReplacer.ts   # global color replacement utility
|- gradient.ts        # color parsing + interpolation
|- rng.ts             # seeded random utilities
|- presets.ts         # built-in preset definitions
|- types.ts           # shared contracts/constants
`- tests/             # Vitest unit tests
```

## Technical Notes

- Browser app runtime, no backend service.
- Strict TypeScript project (`noUnusedLocals`, `noUnusedParameters`).
- Test environment is Node via Vitest (configured in `vite.config.ts`).
- Max canvas safety cap: `1,048,576` total pixels.
- Core seeded randomness uses `mulberry32`.

## License

MIT. See `LICENSE`.
