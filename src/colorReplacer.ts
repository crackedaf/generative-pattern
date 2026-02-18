/**
 * Color replacement tool for find/replace across canvas
 */

import type { PatternSettings } from './types';
import { hexToRgb, colorDistance, safeColor } from './gradient';
import { getGridDimensions, getCellKey, generateCellData } from './renderer';

/** Tolerance for color matching (0-100) */
const DEFAULT_TOLERANCE = 10;

/**
 * Checks if two colors match within tolerance
 * @param c1 - First color (hex)
 * @param c2 - Second color (hex)
 * @param tolerance - Match tolerance (0-100, default 10)
 * @returns True if colors match within tolerance
 */
export function colorsMatch(
    c1: string,
    c2: string,
    tolerance: number = DEFAULT_TOLERANCE
): boolean {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);

    if (!rgb1 || !rgb2) return false;

    const distance = colorDistance(c1, c2);
    // Max distance in RGB space is ~441.67
    const normalizedTolerance = (tolerance / 100) * 441.67;

    return distance <= normalizedTolerance;
}

/**
 * Replaces a specific color with another in the overrides map
 * @param overrides - Current cell overrides
 * @param fromColor - Color to find (hex)
 * @param toColor - Replacement color (hex)
 * @param tolerance - Match tolerance (0-100)
 * @returns New overrides map with replacements
 */
export function replaceColorInOverrides(
    overrides: Map<string, string>,
    fromColor: string,
    toColor: string,
    tolerance: number = DEFAULT_TOLERANCE
): Map<string, string> {
    const newOverrides = new Map(overrides);
    const safeToColor = safeColor(toColor);

    for (const [key, color] of newOverrides) {
        if (colorsMatch(color, fromColor, tolerance)) {
            newOverrides.set(key, safeToColor);
        }
    }

    return newOverrides;
}

/**
 * Replaces a color across the entire canvas (including generated cells)
 * Creates overrides for all matching cells
 * @param settings - Pattern settings
 * @param overrides - Current cell overrides
 * @param fromColor - Color to find (hex)
 * @param toColor - Replacement color (hex)
 * @param tolerance - Match tolerance (0-100)
 * @returns New overrides map with all replacements
 */
export function replaceColorGlobal(
    settings: PatternSettings,
    overrides: Map<string, string>,
    fromColor: string,
    toColor: string,
    tolerance: number = DEFAULT_TOLERANCE
): Map<string, string> {
    const cells = generateCellData(settings, overrides);
    const newOverrides = new Map(overrides);
    const safeToColor = safeColor(toColor);

    for (const cell of cells) {
        if (colorsMatch(cell.color, fromColor, tolerance)) {
            const key = getCellKey(cell.row, cell.col);
            newOverrides.set(key, safeToColor);
        }
    }

    return newOverrides;
}

/**
 * Replaces an entire palette with a new one
 * Maps old colors to new colors by position
 * @param settings - Pattern settings
 * @param overrides - Current cell overrides
 * @param oldPalette - Original palette colors
 * @param newPalette - New palette colors
 * @param tolerance - Match tolerance (0-100)
 * @returns New overrides map with palette replacements
 */
export function replaceEntirePalette(
    settings: PatternSettings,
    overrides: Map<string, string>,
    oldPalette: string[],
    newPalette: string[],
    tolerance: number = DEFAULT_TOLERANCE
): Map<string, string> {
    // Create color mapping from old to new
    const colorMap = new Map<string, string>();
    const minLength = Math.min(oldPalette.length, newPalette.length);

    for (let i = 0; i < minLength; i++) {
        colorMap.set(oldPalette[i].toLowerCase(), safeColor(newPalette[i]));
    }

    // Generate all cell data
    const cells = generateCellData(settings, overrides);
    const newOverrides = new Map<string, string>();

    for (const cell of cells) {
        // Find the closest matching color in old palette
        let bestMatch: string | null = null;
        let bestDistance = Infinity;

        for (const oldColor of oldPalette) {
            if (colorsMatch(cell.color, oldColor, tolerance)) {
                const distance = colorDistance(cell.color, oldColor);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = oldColor.toLowerCase();
                }
            }
        }

        // Apply mapping if found
        if (bestMatch && colorMap.has(bestMatch)) {
            const key = getCellKey(cell.row, cell.col);
            newOverrides.set(key, colorMap.get(bestMatch)!);
        }
    }

    return newOverrides;
}

/**
 * Gets all unique colors currently in the pattern
 * @param settings - Pattern settings
 * @param overrides - Current cell overrides
 * @returns Array of unique hex colors
 */
export function getUniqueColors(
    settings: PatternSettings,
    overrides: Map<string, string>
): string[] {
    const cells = generateCellData(settings, overrides);
    const colors = new Set<string>();

    for (const cell of cells) {
        colors.add(cell.color.toLowerCase());
    }

    return Array.from(colors);
}

/**
 * Counts occurrences of a specific color
 * @param settings - Pattern settings
 * @param overrides - Current cell overrides
 * @param targetColor - Color to count (hex)
 * @param tolerance - Match tolerance (0-100)
 * @returns Number of cells matching the color
 */
export function countColor(
    settings: PatternSettings,
    overrides: Map<string, string>,
    targetColor: string,
    tolerance: number = DEFAULT_TOLERANCE
): number {
    const cells = generateCellData(settings, overrides);
    let count = 0;

    for (const cell of cells) {
        if (colorsMatch(cell.color, targetColor, tolerance)) {
            count++;
        }
    }

    return count;
}

/**
 * Gets color statistics for the pattern
 * @param settings - Pattern settings
 * @param overrides - Current cell overrides
 * @returns Map of color to count
 */
export function getColorStats(
    settings: PatternSettings,
    overrides: Map<string, string>
): Map<string, number> {
    const cells = generateCellData(settings, overrides);
    const stats = new Map<string, number>();

    for (const cell of cells) {
        const color = cell.color.toLowerCase();
        stats.set(color, (stats.get(color) || 0) + 1);
    }

    return stats;
}
