# Generative Pattern

Generative Pattern is a local-first TypeScript + Vite app for creating deterministic abstract art in the browser. It supports both classic grid generation and a brick-pattern renderer with texture layering, then exports to PNG or SVG.

## Latest Changes Included

- Added a full **brick generator mode** with dedicated controls (brick size, mortar, variation, cracks, moss, and SVG optimization).
- Added **brick texture modes**: `solid`, `singlePreset`, and `randomPreset`, including per-brick randomization, texture scale, and texture rotation.
- Added **wave distortion** with up to 10 layers, each with amplitude, frequency, phase, and influence.
- Added **gradient blend factor** control for smoother interpolation in gradient cell mode.
- Added **preset mode toggle** (grid presets vs brick presets) and expanded built-in preset collection.
- Fixed **cell-size snapping / centered grid rendering** for cleaner alignment.
- Updated shortcuts: SVG export is now `Ctrl/Cmd + X`.
- Made rendering/export behavior align with the current transparent-background workflow.

## Features

- Two generators: **Grid** and **Brick**.
- Palette workflow: up to **20 colors**, drag-and-drop reorder, save/load palettes from `localStorage`.
- Gradient controls: direction, seeded randomness, solid vs gradient color mode, and blend factor.
- Wave distortion system: layer multiple waves without breaking deterministic output.
- Symmetry controls: horizontal and vertical mirroring.
- Pixel editor: paint overrides, brush size `1-32`, eyedropper with `Shift + Click`, clear all edits.
- Color replace utility: find/replace across generated cells.
- Deterministic generation: same settings + seed always reproduce the same result.
- Export: PNG and SVG with stable, parseable filenames and SVG metadata.

## Quick Start

```bash
npm install
npm run dev
```

Build and test:

```bash
npm run build
npm run test
```

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Ctrl/Cmd + S` | Export PNG |
| `Ctrl/Cmd + X` | Export SVG |
| `R` | Regenerate with a new seed |
| `E` | Toggle edit mode |
| `Shift + Click` | Eyedropper color pick |

## Presets

- Built-in presets include both **grid** and **brick** categories.
- Notable entries: `Terrain Waves`, `Classic Brick`, `Mossy Ruins`, and `Preset Texture Brick Demo`.
- Presets carry full config (palette, seed, randomness, direction, and optional wave/brick settings).

## Export Notes

- PNG export uses `devicePixelRatio` for high-DPI output in grid mode.
- SVG export is pure vector and includes metadata attributes (seed, generator, cell size, direction, randomness, blend factor, wave info, colors).
- Brick SVG export supports mortar/background, grouped solid fills, textured clipping paths, moss patches, and cracks.

## Project Structure

```text
generative-pattern/
|- index.html
|- src/
|  |- main.ts
|  |- ui.ts
|  |- renderer.ts
|  |- brickGenerator.ts
|  |- waveDistortion.ts
|  |- gridUtils.ts
|  |- gradient.ts
|  |- pixelEditor.ts
|  |- colorReplacer.ts
|  |- exporter.ts
|  |- rng.ts
|  |- presets.ts
|  |- types.ts
|  |- style.css
|  `- tests/
|- package.json
|- tsconfig.json
|- vite.config.ts
`- README.md
```

## Technical Notes

- Max canvas safety cap: `1,048,576` total pixels.
- Runtime is browser-only, but tests run in Node via Vitest.
- Strict TypeScript is enabled (`noUnusedLocals`, `noUnusedParameters`).
- Core randomness uses `mulberry32` for reproducibility.

## License

MIT. See `LICENSE`.
