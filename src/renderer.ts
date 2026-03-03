/**
 * Canvas renderer for pattern generation
 */

import type { PatternSettings, Preset } from './types';
import { createGradientSampler, hexToRgb, rgbToHex, safeColor } from './gradient';
import { mulberry32 } from './rng';
import { computeSnappedGrid, normalizeCellSize } from './gridUtils';
import {
    generateBricks,
    renderBricksToCanvas,
    type BrickTextureCanvasProvider,
} from './brickGenerator';

const brickTextureCanvasCache = new Map<string, HTMLCanvasElement>();
const brickTextureCanvasProvider = createBrickTextureCanvasProvider();

/** Grid cell data for rendering */
interface CellData {
    row: number;
    col: number;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

/**
 * Calculates the grid dimensions based on settings
 */
export function getGridDimensions(settings: PatternSettings): { rows: number; cols: number } {
    const { rows, cols } = computeSnappedGrid(settings.width, settings.height, settings.cellSize);
    return {
        cols,
        rows,
    };
}

/**
 * Generates a key for cell override map
 */
export function getCellKey(row: number, col: number): string {
    return `${row},${col}`;
}

/**
 * Parses a cell key back to row/col
 */
export function parseCellKey(key: string): { row: number; col: number } {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
}

/**
 * Applies symmetry transformation to get mirrored cells
 */
function getSymmetricCells(
    row: number,
    col: number,
    rows: number,
    cols: number,
    horizontal: boolean,
    vertical: boolean
): Array<{ row: number; col: number }> {
    const cells: Array<{ row: number; col: number }> = [{ row, col }];

    if (horizontal) {
        cells.push({ row, col: cols - 1 - col });
    }

    if (vertical) {
        cells.push({ row: rows - 1 - row, col });
    }

    if (horizontal && vertical) {
        cells.push({ row: rows - 1 - row, col: cols - 1 - col });
    }

    return cells;
}

/**
 * Generates color for a cell with optional randomness perturbation
 */
function getCellColor(
    row: number,
    col: number,
    rows: number,
    cols: number,
    settings: PatternSettings,
    sampler: (x: number, y: number) => string,
    rng: () => number
): string {
    // Calculate normalized position (cell center)
    const x = (col + 0.5) / cols;
    const y = (row + 0.5) / rows;

    // Apply randomness perturbation
    let perturbedX = x;
    let perturbedY = y;

    if (settings.randomness > 0) {
        const offsetX = (rng() - 0.5) * 2 * settings.randomness;
        const offsetY = (rng() - 0.5) * 2 * settings.randomness;
        perturbedX = Math.max(0, Math.min(1, x + offsetX));
        perturbedY = Math.max(0, Math.min(1, y + offsetY));
    }

    return sampler(perturbedX, perturbedY);
}

/**
 * Blends colors for gradient mode (averages with neighbors)
 */
function blendCellColor(
    row: number,
    col: number,
    rows: number,
    cols: number,
    cellColors: Map<string, string>
): string {
    const neighbors: string[] = [];
    const centerColor = cellColors.get(getCellKey(row, col));

    if (!centerColor) return '#000000';

    neighbors.push(centerColor);

    // Add neighboring cells
    const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of offsets) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighborColor = cellColors.get(getCellKey(nr, nc));
            if (neighborColor) {
                neighbors.push(neighborColor);
            }
        }
    }

    // Average all colors
    let totalR = 0, totalG = 0, totalB = 0;
    let count = 0;

    for (const hex of neighbors) {
        const rgb = hexToRgb(hex);
        if (rgb) {
            totalR += rgb.r;
            totalG += rgb.g;
            totalB += rgb.b;
            count++;
        }
    }

    if (count === 0) return centerColor;

    return rgbToHex({
        r: totalR / count,
        g: totalG / count,
        b: totalB / count,
    });
}

/**
 * Generates all cell data for the pattern
 */
export function generateCellData(
    settings: PatternSettings,
    overrides: Map<string, string>
): CellData[] {
    const snappedGrid = computeSnappedGrid(settings.width, settings.height, settings.cellSize);
    const { rows, cols, offsetX, offsetY } = snappedGrid;
    const cellSize = normalizeCellSize(settings.cellSize);
    const sampler = createGradientSampler(
        settings.colors.map(c => safeColor(c)),
        settings.direction
    );
    const rng = mulberry32(settings.seed);

    // First pass: generate base colors
    const cellColors = new Map<string, string>();
    const processedCells = new Set<string>();

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const key = getCellKey(row, col);

            // Skip if already processed (via symmetry)
            if (processedCells.has(key)) continue;

            // Check for manual override
            if (overrides.has(key)) {
                cellColors.set(key, safeColor(overrides.get(key)!));
                processedCells.add(key);
                continue;
            }

            // Generate color
            const color = getCellColor(row, col, rows, cols, settings, sampler, rng);

            // Apply symmetry
            if (settings.symmetry.horizontal || settings.symmetry.vertical) {
                const symmetric = getSymmetricCells(
                    row, col, rows, cols,
                    settings.symmetry.horizontal,
                    settings.symmetry.vertical
                );

                for (const cell of symmetric) {
                    const cellKey = getCellKey(cell.row, cell.col);
                    if (!overrides.has(cellKey) && !processedCells.has(cellKey)) {
                        cellColors.set(cellKey, color);
                        processedCells.add(cellKey);
                    }
                }
            } else {
                cellColors.set(key, color);
                processedCells.add(key);
            }
        }
    }

    // Second pass: apply gradient blending if needed
    const cells: CellData[] = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const key = getCellKey(row, col);
            let color = cellColors.get(key) || '#000000';

            // Apply gradient blending for non-overridden cells
            if (settings.cellColorMode === 'gradient' && !overrides.has(key)) {
                color = blendCellColor(row, col, rows, cols, cellColors);
            }

            cells.push({
                row,
                col,
                x: offsetX + col * cellSize,
                y: offsetY + row * cellSize,
                width: cellSize,
                height: cellSize,
                color,
            });
        }
    }

    return cells;
}

/**
 * Renders the pattern to a canvas context
 */
export function renderPattern(
    ctx: CanvasRenderingContext2D,
    settings: PatternSettings,
    overrides: Map<string, string>
): void {
    // Brick generator path
    if (settings.generator === 'brick' && settings.brickSettings) {
        const rng = mulberry32(settings.seed);
        const cells = generateBricks(settings, rng);
        renderBricksToCanvas(ctx, cells, settings, brickTextureCanvasProvider);
        return;
    }

    renderGridPatternToCanvas(ctx, settings, overrides, true);
}

function renderGridPatternToCanvas(
    ctx: CanvasRenderingContext2D,
    settings: PatternSettings,
    overrides: Map<string, string>,
    clearCanvas: boolean,
): void {
    const cells = generateCellData(settings, overrides);
    if (clearCanvas) {
        ctx.clearRect(0, 0, settings.width, settings.height);
    }
    for (const cell of cells) {
        ctx.fillStyle = cell.color;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    }
}

function createBrickTextureCanvasProvider(): BrickTextureCanvasProvider {
    return (preset: Preset, seed: number, scale: number): HTMLCanvasElement => {
        const cacheKey = `${preset.name}::${seed}::${scale.toFixed(2)}`;
        const cached = brickTextureCanvasCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const size = Math.max(32, Math.min(256, Math.round(96 * scale)));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const textureCtx = canvas.getContext('2d');
        if (!textureCtx) {
            throw new Error('Failed to create texture canvas context');
        }

        const textureSettings: PatternSettings = {
            width: size,
            height: size,
            cellSize: Math.max(1, Math.floor((preset.cellSize || 16) / Math.max(0.1, scale))),
            colors: [...preset.colors],
            direction: preset.direction,
            randomness: preset.randomness,
            seed,
            symmetry: { horizontal: false, vertical: false },
            tileMode: false,
            cellColorMode: 'solid',
            generator: 'grid',
            brickSettings: undefined,
        };

        renderGridPatternToCanvas(textureCtx, textureSettings, new Map<string, string>(), true);
        brickTextureCanvasCache.set(cacheKey, canvas);
        return canvas;
    };
}

/**
 * Renders with requestAnimationFrame for smooth updates
 */
let renderQueued = false;
let pendingRender: {
    ctx: CanvasRenderingContext2D;
    settings: PatternSettings;
    overrides: Map<string, string>;
} | null = null;

export function queueRender(
    ctx: CanvasRenderingContext2D,
    settings: PatternSettings,
    overrides: Map<string, string>
): void {
    pendingRender = { ctx, settings, overrides };

    if (!renderQueued) {
        renderQueued = true;
        requestAnimationFrame(() => {
            if (pendingRender) {
                renderPattern(
                    pendingRender.ctx,
                    pendingRender.settings,
                    pendingRender.overrides
                );
            }
            renderQueued = false;
            pendingRender = null;
        });
    }
}

/**
 * Gets the color at a specific cell position
 */
export function getColorAtCell(
    row: number,
    col: number,
    settings: PatternSettings,
    overrides: Map<string, string>
): string {
    const { rows, cols } = getGridDimensions(settings);
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
        return '#000000';
    }

    const key = getCellKey(row, col);

    // Check override first
    if (overrides.has(key)) {
        return overrides.get(key)!;
    }

    // Generate the color
    const sampler = createGradientSampler(
        settings.colors.map(c => safeColor(c)),
        settings.direction
    );
    const rng = mulberry32(settings.seed);

    // Fast-forward RNG to this cell
    const cellIndex = row * cols + col;
    for (let i = 0; i < cellIndex * 2; i++) {
        rng();
    }

    return getCellColor(row, col, rows, cols, settings, sampler, rng);
}
