/**
 * Brick Pattern Generator
 * Implements masonry-style brick layout with RedBrick and MossyBrick texture variants.
 * All randomness is driven by the global settings.seed via mulberry32 — fully deterministic.
 */

import type { PatternSettings, BrickSettings, BrickCell, MossPatch, BrickCrack } from './types';
import { hexToRgb, rgbToHex } from './gradient';

// ---------------------------------------------------------------------------
// Input guards
// ---------------------------------------------------------------------------

/**
 * Clamps BrickSettings values to safe operating ranges.
 */
export function clampBrickSettings(s: BrickSettings): BrickSettings {
    const brickWidth = Math.max(5, s.brickWidth);
    const brickHeight = Math.max(5, s.brickHeight);
    const mortarThickness = Math.max(0, Math.min(brickWidth - 1, s.mortarThickness));
    const mossDensity = Math.max(0, Math.min(1, s.mossDensity));
    const brickVariation = Math.max(0, Math.min(1, s.brickVariation));
    return { ...s, brickWidth, brickHeight, mortarThickness, mossDensity, brickVariation };
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/** Converts RGB (0-255) to HSL (h: 0-360, s: 0-100, l: 0-100) */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l * 100];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
    return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const hn = h / 360, sn = s / 100, ln = l / 100;
    if (sn === 0) {
        const v = Math.round(ln * 255);
        return [v, v, v];
    }
    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    const p = 2 * ln - q;
    const hue2rgb = (t: number): number => {
        let tc = t;
        if (tc < 0) tc += 1;
        if (tc > 1) tc -= 1;
        if (tc < 1 / 6) return p + (q - p) * 6 * tc;
        if (tc < 1 / 2) return q;
        if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
        return p;
    };
    return [
        Math.round(hue2rgb(hn + 1 / 3) * 255),
        Math.round(hue2rgb(hn) * 255),
        Math.round(hue2rgb(hn - 1 / 3) * 255),
    ];
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

/**
 * Computes a per-brick colour by perturbing the base colour in HSL space.
 * @param rng       - Seeded RNG (advances 4 calls)
 * @param baseHex   - Base hex colour
 * @param variation - 0–1 deviation strength
 * @param rowIndex  - Row position for subtle top-to-bottom darkening
 * @param totalRows - Total row count for normalising rowIndex
 */
function getBrickColor(
    rng: () => number,
    baseHex: string,
    variation: number,
    rowIndex: number,
    totalRows: number
): string {
    const rgb = hexToRgb(baseHex) ?? { r: 139, g: 37, b: 0 };
    let [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);

    const hueDelta = (rng() - 0.5) * 10 * variation;        // ±5° max (at var=1)
    const satDelta = (rng() - 0.5) * 16 * variation;        // ±8%
    const lightDelta = (rng() - 0.5) * 30 * variation;        // ±15%
    const rowDarken = (rowIndex / Math.max(1, totalRows)) * 6 * variation; // subtle row shading

    h = clamp(h + hueDelta, 0, 360);
    s = clamp(s + satDelta, 10, 90);
    l = clamp(l + lightDelta - rowDarken, 8, 75);

    rng(); // consume 4th call for forward-compatibility

    const [r, g, b] = hslToRgb(h, s, l);
    return rgbToHex({ r, g, b });
}

// ---------------------------------------------------------------------------
// Moss patches
// ---------------------------------------------------------------------------

/**
 * Generates moss patches for a single brick face using a 4×4 candidate grid.
 * Probability: p = density × edgeBias × bottomBias (structured, not fully random).
 */
function generateMossPatches(
    rng: () => number,
    brick: { x: number; y: number; width: number; height: number },
    density: number,
    optimizeSVG: boolean
): MossPatch[] {
    if (density <= 0) return [];

    const patches: MossPatch[] = [];
    const cols = 4, rows = 4;
    const blockW = brick.width / cols;
    const blockH = brick.height / rows;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            // edgeBias: distance from horizontal center (0 = center, 1 = edge)
            const centerDist = Math.abs(col + 0.5 - cols / 2) / (cols / 2);
            const edgeBias = 0.4 + 0.6 * centerDist;
            // bottomBias: increases toward bottom of brick
            const bottomBias = 0.3 + 0.7 * ((row + 0.5) / rows);

            const p = density * edgeBias * bottomBias;
            if (rng() >= p) continue;

            const pw = Math.floor(blockW * (0.4 + rng() * 0.5));
            const ph = Math.floor(blockH * (0.4 + rng() * 0.5));

            if (optimizeSVG && (pw < 3 || ph < 3)) continue;
            if (pw < 1 || ph < 1) continue;

            const px = brick.x + Math.floor(col * blockW + rng() * Math.max(1, blockW - pw));
            const py = brick.y + Math.floor(row * blockH + rng() * Math.max(1, blockH - ph));

            // Moss colour: hsl 100–130°, slightly varied
            const mossH = 100 + rng() * 30;
            const mossS = 40 + rng() * 25;
            const mossL = 22 + rng() * 20;
            const [mr, mg, mb] = hslToRgb(mossH, mossS, mossL);

            patches.push({ x: px, y: py, width: pw, height: ph, color: rgbToHex({ r: mr, g: mg, b: mb }) });
        }
    }
    return patches;
}

// ---------------------------------------------------------------------------
// Cracks
// ---------------------------------------------------------------------------

/**
 * Generates 0–3 subtle crack rects inside a brick, deterministic from rng.
 */
function generateCracks(
    rng: () => number,
    brick: { x: number; y: number; width: number; height: number }
): BrickCrack[] {
    const count = Math.floor(rng() * 4); // 0, 1, 2, or 3
    const cracks: BrickCrack[] = [];
    for (let i = 0; i < count; i++) {
        const isHorizontal = rng() < 0.5;
        const w = isHorizontal ? Math.floor(brick.width * (0.1 + rng() * 0.25)) : 1;
        const h = isHorizontal ? 1 : Math.floor(brick.height * (0.1 + rng() * 0.25));
        const x = brick.x + Math.floor(rng() * Math.max(1, brick.width - w));
        const y = brick.y + Math.floor(rng() * Math.max(1, brick.height - h));
        cracks.push({ x, y, width: w, height: h });
    }
    return cracks;
}

// ---------------------------------------------------------------------------
// Symmetry helpers
// ---------------------------------------------------------------------------

/** Mirrors a set of BrickCells horizontally, vertically, or both. */
function applyBrickSymmetry(
    baseCells: BrickCell[],
    canvasWidth: number,
    canvasHeight: number,
    horizontal: boolean,
    vertical: boolean
): BrickCell[] {
    if (!horizontal && !vertical) return baseCells;

    const result: BrickCell[] = [...baseCells];

    for (const cell of baseCells) {
        if (horizontal) {
            const mx = canvasWidth - cell.x - cell.width;
            result.push(mirrorCell(cell, mx, cell.y, canvasWidth, canvasHeight, true, false));
        }
        if (vertical) {
            const my = canvasHeight - cell.y - cell.height;
            result.push(mirrorCell(cell, cell.x, my, canvasWidth, canvasHeight, false, true));
        }
        if (horizontal && vertical) {
            const mx = canvasWidth - cell.x - cell.width;
            const my = canvasHeight - cell.y - cell.height;
            result.push(mirrorCell(cell, mx, my, canvasWidth, canvasHeight, true, true));
        }
    }
    return result;
}

function mirrorCell(
    src: BrickCell,
    newX: number,
    newY: number,
    _canvasWidth: number,
    _canvasHeight: number,
    _flipH: boolean,
    _flipV: boolean
): BrickCell {
    const dx = newX - src.x;
    const dy = newY - src.y;

    const mossPatchs: MossPatch[] = src.mossPatchs.map(p => ({
        x: p.x + dx, y: p.y + dy, width: p.width, height: p.height, color: p.color,
    }));
    const cracks: BrickCrack[] = src.cracks.map(c => ({
        x: c.x + dx, y: c.y + dy, width: c.width, height: c.height,
    }));

    return { x: newX, y: newY, width: src.width, height: src.height, color: src.color, mossPatchs, cracks };
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generates the full list of BrickCells for the pattern.
 * Uses the global settings.seed for determinism.
 * This returned array is the single source of truth for both canvas and SVG rendering.
 */
export function generateBricks(settings: PatternSettings, rng: () => number): BrickCell[] {
    if (!settings.brickSettings) return [];

    const bs = clampBrickSettings(settings.brickSettings);
    const { width, height, symmetry } = settings;
    const { brickWidth, brickHeight, mortarThickness, brickBaseColor, brickVariation,
        brickStyle, mossDensity, showCracks, optimizeSVG } = bs;

    const stepX = brickWidth + mortarThickness;
    const stepY = brickHeight + mortarThickness;

    const totalRows = Math.ceil(height / stepY);
    const cells: BrickCell[] = [];

    for (let row = 0; row < totalRows; row++) {
        const isOddRow = row % 2 === 1;
        const offsetX = isOddRow ? -stepX / 2 : 0;
        const brickY = row * stepY;

        if (brickY >= height) break;

        // Total bricks per row including the partial offset brick
        const totalCols = Math.ceil((width - offsetX) / stepX) + 1;

        for (let col = 0; col < totalCols; col++) {
            const brickX = offsetX + col * stepX;

            // Clip: skip bricks entirely outside canvas
            if (brickX + brickWidth <= 0 || brickX >= width) continue;
            if (brickY + brickHeight <= 0 || brickY >= height) continue;

            const color = getBrickColor(rng, brickBaseColor, brickVariation, row, totalRows);

            const brick = { x: brickX, y: brickY, width: brickWidth, height: brickHeight };

            const mossPatchs: MossPatch[] =
                brickStyle === 'MossyBrick'
                    ? generateMossPatches(rng, brick, mossDensity, optimizeSVG)
                    : [];

            const cracks: BrickCrack[] = showCracks ? generateCracks(rng, brick) : [];

            cells.push({ ...brick, color, mossPatchs, cracks });
        }
    }

    // Apply symmetry (mirror cells; mortar bg is always full-canvas, no mirroring needed)
    return applyBrickSymmetry(cells, width, height, symmetry.horizontal, symmetry.vertical);
}

// ---------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------

/**
 * Renders pre-generated brick cells to a 2D canvas context.
 * Call inside renderPattern() — does NOT call generateBricks() internally.
 */
export function renderBricksToCanvas(
    ctx: CanvasRenderingContext2D,
    cells: BrickCell[],
    settings: PatternSettings
): void {
    const bs = clampBrickSettings(settings.brickSettings!);

    // Clear
    ctx.clearRect(0, 0, settings.width, settings.height);

    // Mortar background (only when thickness > 0)
    if (bs.mortarThickness > 0) {
        ctx.fillStyle = bs.mortarColor;
        ctx.fillRect(0, 0, settings.width, settings.height);
    }

    // Crack colour: dark semi-transparent overlay (use fixed dark hex)
    const CRACK_COLOR = '#1a0a00';

    for (const cell of cells) {
        // Brick body
        ctx.fillStyle = cell.color;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

        // Moss patches
        for (const p of cell.mossPatchs) {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.width, p.height);
        }

        // Cracks
        if (cell.cracks.length > 0) {
            ctx.fillStyle = CRACK_COLOR;
            for (const c of cell.cracks) {
                ctx.fillRect(c.x, c.y, c.width, c.height);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// SVG element generator
// ---------------------------------------------------------------------------

/**
 * Returns an array of SVG line strings for bricks, moss, and cracks.
 * No canvas rasterization — pure vector <rect> elements.
 * Call inside generateSVGString() — does NOT call generateBricks() internally.
 */
export function generateBrickSVGElements(
    cells: BrickCell[],
    settings: PatternSettings
): string[] {
    const bs = clampBrickSettings(settings.brickSettings!);
    const lines: string[] = [];

    // Mortar background only when thickness > 0
    if (bs.mortarThickness > 0) {
        lines.push(
            `  <rect x="0" y="0" width="${settings.width}" height="${settings.height}" fill="${bs.mortarColor}"/>`
        );
    }

    const CRACK_COLOR = '#1a0a00';

    // Group bricks by colour to reduce SVG size
    const bricksByColor = new Map<string, BrickCell[]>();
    for (const cell of cells) {
        const arr = bricksByColor.get(cell.color) ?? [];
        arr.push(cell);
        bricksByColor.set(cell.color, arr);
    }

    for (const [color, group] of bricksByColor) {
        lines.push(`  <g fill="${color}">`);
        for (const cell of group) {
            const x = Math.round(cell.x);
            const y = Math.round(cell.y);
            const w = Math.round(cell.width);
            const h = Math.round(cell.height);
            lines.push(`    <rect x="${x}" y="${y}" width="${w}" height="${h}"/>`);
        }
        lines.push(`  </g>`);
    }

    // Moss patches (grouped by colour)
    const mossAll: MossPatch[] = cells.flatMap(c => c.mossPatchs);
    if (mossAll.length > 0) {
        const mossByColor = new Map<string, MossPatch[]>();
        for (const p of mossAll) {
            const arr = mossByColor.get(p.color) ?? [];
            arr.push(p);
            mossByColor.set(p.color, arr);
        }
        for (const [mColor, patches] of mossByColor) {
            lines.push(`  <g fill="${mColor}">`);
            for (const p of patches) {
                lines.push(`    <rect x="${Math.round(p.x)}" y="${Math.round(p.y)}" width="${Math.round(p.width)}" height="${Math.round(p.height)}"/>`);
            }
            lines.push(`  </g>`);
        }
    }

    // Cracks (all grouped together)
    const cracksAll: BrickCrack[] = cells.flatMap(c => c.cracks);
    if (cracksAll.length > 0) {
        lines.push(`  <g fill="${CRACK_COLOR}">`);
        for (const c of cracksAll) {
            lines.push(`    <rect x="${Math.round(c.x)}" y="${Math.round(c.y)}" width="${Math.round(c.width)}" height="${Math.round(c.height)}"/>`);
        }
        lines.push(`  </g>`);
    }

    return lines;
}
