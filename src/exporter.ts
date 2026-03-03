/**
 * Export module for PNG and SVG generation
 */

import type { PatternSettings, Preset } from './types';
import { MAX_CANVAS_PIXELS } from './types';
import { generateCellData } from './renderer';
import { mulberry32 } from './rng';
import { generateBricks, generateBrickSVGElements } from './brickGenerator';
import { normalizeCellSize } from './gridUtils';

/**
 * Generates a filename with timestamp, seed, and palette info
 */
export function generateFilename(
    settings: PatternSettings,
    extension: 'png' | 'svg'
): string {
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '-')
        .slice(0, 13);

    const seed = settings.seed;
    const colorCount = settings.colors.length;

    return `pattern-${timestamp}-seed${seed}-${colorCount}colors.${extension}`;
}

/**
 * Checks if canvas size exceeds maximum and returns warning if so
 */
export function checkCanvasSize(width: number, height: number): string | null {
    const totalPixels = width * height;

    if (totalPixels > MAX_CANVAS_PIXELS) {
        return `Canvas size (${totalPixels.toLocaleString()} pixels) exceeds maximum (${MAX_CANVAS_PIXELS.toLocaleString()} pixels). Export may fail or be slow.`;
    }

    return null;
}

/**
 * Exports the canvas as PNG with high DPI support
 */
export async function exportPNG(
    canvas: HTMLCanvasElement,
    settings: PatternSettings,
    overrides: Map<string, string>
): Promise<void> {
    const warning = checkCanvasSize(settings.width, settings.height);
    if (warning) {
        console.warn(warning);
    }

    // For brick mode, export the existing canvas directly (already rendered)
    if (settings.generator === 'brick') {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (!blob) { reject(new Error('Failed to export canvas')); return; }
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = generateFilename(settings, 'png');
                a.click();
                URL.revokeObjectURL(url);
                resolve();
            }, 'image/png');
        });
    }

    // Grid mode: Create a temporary canvas at full resolution with DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = settings.width * dpr;
    exportCanvas.height = settings.height * dpr;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context for export');
    }

    // Scale context for DPI
    ctx.scale(dpr, dpr);

    // Generate and render cells
    const cells = generateCellData(settings, overrides);

    for (const cell of cells) {
        ctx.fillStyle = cell.color;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    }

    // Export as PNG
    return new Promise((resolve, reject) => {
        exportCanvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Failed to create PNG blob'));
                    return;
                }

                const filename = generateFilename(settings, 'png');
                downloadBlob(blob, filename);
                resolve();
            },
            'image/png',
            1.0
        );
    });
}

/**
 * Generates SVG string from pattern settings
 */
export function generateSVGString(
    settings: PatternSettings,
    overrides: Map<string, string>
): string {
    const cellSize = normalizeCellSize(settings.cellSize);

    // Build SVG header with metadata
    const lines: string[] = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${settings.width} ${settings.height}" width="${settings.width}" height="${settings.height}"`,
        `  data-seed="${settings.seed}"`,
        `  data-generator="${settings.generator ?? 'grid'}"`,
        `  data-cell-size="${cellSize}"`,
        `  data-direction="${settings.direction}"`,
        `  data-randomness="${settings.randomness}"`,
        `  data-colors="${settings.colors.join(',')}"`,
        `  data-generator-app="generative-pattern">`,
    ];

    // Brick generator path — pure vector <rect> elements
    if (settings.generator === 'brick' && settings.brickSettings) {
        const rng = mulberry32(settings.seed);
        const cells = generateBricks(settings, rng);
        lines.push(
            ...generateBrickSVGElements(
                cells,
                settings,
                (preset, seed, width, height) => generateTextureSVGElements(preset, seed, width, height),
            ),
        );
        lines.push(`</svg>`);
        return lines.join('\n');
    }

    lines.push(...generateGridSVGElements(settings, overrides));

    lines.push(`</svg>`);

    return lines.join('\n');
}

function generateGridSVGElements(settings: PatternSettings, overrides: Map<string, string>): string[] {
    const lines: string[] = [];
    const cells = generateCellData(settings, overrides);

    // Group cells by color to reduce SVG size
    const cellsByColor = new Map<string, typeof cells>();

    for (const cell of cells) {
        const existing = cellsByColor.get(cell.color) || [];
        existing.push(cell);
        cellsByColor.set(cell.color, existing);
    }

    // Generate rect elements grouped by color
    for (const [color, colorCells] of cellsByColor) {
        lines.push(`  <g fill="${color}">`);

        for (const cell of colorCells) {
            // Use integer coordinates for crisp rendering
            const x = Math.round(cell.x);
            const y = Math.round(cell.y);
            const w = Math.round(cell.width);
            const h = Math.round(cell.height);

            lines.push(`    <rect x="${x}" y="${y}" width="${w}" height="${h}"/>`);
        }

        lines.push(`  </g>`);
    }

    return lines;
}

function generateTextureSVGElements(
    preset: Preset,
    seed: number,
    width: number,
    height: number,
): string[] {
    const textureSettings: PatternSettings = {
        width,
        height,
        cellSize: normalizeCellSize(preset.cellSize),
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
    return generateGridSVGElements(textureSettings, new Map<string, string>());
}

/**
 * Exports the pattern as SVG
 */
export async function exportSVG(
    settings: PatternSettings,
    overrides: Map<string, string>
): Promise<void> {
    const warning = checkCanvasSize(settings.width, settings.height);
    if (warning) {
        console.warn(warning);
    }

    const svgString = generateSVGString(settings, overrides);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const filename = generateFilename(settings, 'svg');

    downloadBlob(blob, filename);
}

/**
 * Downloads a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports current settings and overrides as JSON
 */
export function exportSettingsJSON(
    settings: PatternSettings,
    overrides: Map<string, string>
): string {
    const data = {
        settings,
        overrides: Object.fromEntries(overrides),
        exportedAt: new Date().toISOString(),
        version: '1.0',
    };

    return JSON.stringify(data, null, 2);
}

/**
 * Imports settings and overrides from JSON
 */
export function importSettingsJSON(json: string): {
    settings: PatternSettings;
    overrides: Map<string, string>;
} | null {
    try {
        const data = JSON.parse(json);

        if (!data.settings) {
            throw new Error('Missing settings in JSON');
        }

        const overrides = new Map<string, string>();
        if (data.overrides) {
            for (const [key, value] of Object.entries(data.overrides)) {
                overrides.set(key, value as string);
            }
        }

        return {
            settings: data.settings,
            overrides,
        };
    } catch (error) {
        console.error('Failed to import settings:', error);
        return null;
    }
}

/**
 * Exports a palette as JSON
 */
export function exportPaletteJSON(
    name: string,
    colors: string[]
): string {
    return JSON.stringify({
        name,
        colors,
        exportedAt: new Date().toISOString(),
    }, null, 2);
}
