# Generative Pattern

A local, offline-capable web application for generating abstract geometric patterns with customizable gradients, pixel editing, and export capabilities.

![Generative Pattern](https://placehold.co/800x400/1a1a24/6366f1?text=Generative+Pattern)

## Features

- **Canvas Controls**: Width, height (up to 1,048,576 total pixels), and cell size
- **20-Color Palette**: Add up to 20 colors with drag-and-drop reordering
- **Gradient Engine**: Multi-stop linear gradient with 4 direction options and adjustable blend factor
- **Pixel Editor**: Manual cell editing with brush size control (1–32 cells)
- **Color Replace**: Find and replace colors across the entire canvas
- **Symmetry**: Horizontal and vertical mirroring
- **Deterministic Seeds**: Same seed + settings = identical output
- **Export**: PNG (with DPI scaling) and SVG (vector)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+S` | Export PNG |
| `Ctrl+Shift+S` | Export SVG |
| `R` | Regenerate with new seed |
| `E` | Toggle edit mode |
| `Shift+Click` | Eyedropper (pick color) |

## Example Presets

### Neon Grid
- **Colors**: `#0ff`, `#f0f`, `#ff0`
- **Seed**: 1337
- **Cell Size**: 24
- **Direction**: Left → Right

### Dusky Blocks
- **Colors**: `#0b1021`, `#3b2f5b`, `#b26b6b`
- **Seed**: 420
- **Cell Size**: 32
- **Direction**: Top → Bottom

### Sunset Gradient
- **Colors**: `#ff6b35`, `#ff9f1c`, `#ffbf69`, `#cbf3f0`, `#2ec4b6`
- **Seed**: 2024
- **Cell Size**: 16
- **Direction**: Top → Bottom

## Project Structure

```
generative-pattern/
├── index.html          # Main HTML
├── src/
│   ├── main.ts         # Entry point
│   ├── ui.ts           # UI controller
│   ├── renderer.ts     # Canvas rendering
│   ├── gradient.ts     # Color interpolation
│   ├── pixelEditor.ts  # Manual editing
│   ├── colorReplacer.ts # Find/replace colors
│   ├── exporter.ts     # PNG/SVG export
│   ├── rng.ts          # Seeded PRNG
│   ├── types.ts        # TypeScript types
│   ├── presets.ts      # Built-in presets
│   ├── style.css       # Styles
│   └── tests/          # Unit tests
├── package.json
├── tsconfig.json
├── vite.config.ts
├── LICENSE
└── README.md
```

## Export Details

### PNG Export
- Honors `devicePixelRatio` for crisp images on retina displays
- Filename format: `pattern-YYYYMMDD-HHMM-seed123-3colors.png`

### SVG Export
- True vector output with `<rect>` elements
- Includes metadata: seed, cell size, direction, colors
- Rects grouped by color to minimize file size
- Integer coordinates for crisp rendering

## Technical Notes

- **Max Canvas**: 1,048,576 pixels (e.g., 1024×1024)
- **Cell Color Modes**: 
  - **Solid**: Each cell is a single sampled color
  - **Gradient**: Cells blend with neighbors, controlled by blend factor (0-1)
- **PRNG**: Uses mulberry32 algorithm for deterministic randomness
- **No external dependencies** at runtime

## License

MIT License - See [LICENSE](./LICENSE) for details.
