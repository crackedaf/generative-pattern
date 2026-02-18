/**
 * Gradient engine for color interpolation and sampling
 */

import type { RGB, GradientDirection, ColorStop } from './types';

/**
 * Parses a hex color string to RGB values
 * Supports #RGB, #RRGGBB formats
 * @param hex - Hex color string
 * @returns RGB object or null if invalid
 */
export function hexToRgb(hex: string): RGB | null {
    // Remove # prefix if present
    const clean = hex.replace(/^#/, '');

    let r: number, g: number, b: number;

    if (clean.length === 3) {
        // Short form #RGB -> #RRGGBB
        r = parseInt(clean[0] + clean[0], 16);
        g = parseInt(clean[1] + clean[1], 16);
        b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
        // Full form #RRGGBB
        r = parseInt(clean.substring(0, 2), 16);
        g = parseInt(clean.substring(2, 4), 16);
        b = parseInt(clean.substring(4, 6), 16);
    } else {
        return null;
    }

    // Validate parsed values
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return null;
    }

    return { r, g, b };
}

/**
 * Converts RGB values to hex color string
 * @param rgb - RGB object
 * @returns Hex color string with # prefix
 */
export function rgbToHex(rgb: RGB): string {
    const toHex = (n: number): string => {
        const clamped = Math.max(0, Math.min(255, Math.round(n)));
        return clamped.toString(16).padStart(2, '0');
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Linear interpolation between two values
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Clamps a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Interpolates between two RGB colors
 * @param c1 - Start color
 * @param c2 - End color
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated RGB color
 */
export function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
    return {
        r: lerp(c1.r, c2.r, t),
        g: lerp(c1.g, c2.g, t),
        b: lerp(c1.b, c2.b, t),
    };
}

/**
 * Creates evenly-spaced color stops from an array of colors
 * @param colors - Array of hex colors
 * @returns Array of ColorStop objects
 */
export function createEvenStops(colors: string[]): ColorStop[] {
    if (colors.length === 0) return [];
    if (colors.length === 1) return [{ color: colors[0], position: 0.5 }];

    return colors.map((color, i) => ({
        color,
        position: i / (colors.length - 1),
    }));
}

/**
 * Samples a color from gradient stops at a given position
 * @param stops - Array of color stops (sorted by position)
 * @param t - Position to sample (0-1)
 * @returns Hex color string
 */
export function sampleGradient(stops: ColorStop[], t: number): string {
    if (stops.length === 0) return '#000000';
    if (stops.length === 1) return stops[0].color;

    const clamped = clamp(t, 0, 1);

    // Find surrounding stops
    let lower = stops[0];
    let upper = stops[stops.length - 1];

    for (let i = 0; i < stops.length - 1; i++) {
        if (clamped >= stops[i].position && clamped <= stops[i + 1].position) {
            lower = stops[i];
            upper = stops[i + 1];
            break;
        }
    }

    // Calculate local interpolation factor
    const range = upper.position - lower.position;
    const localT = range > 0 ? (clamped - lower.position) / range : 0;

    // Parse colors
    const lowerRgb = hexToRgb(lower.color);
    const upperRgb = hexToRgb(upper.color);

    if (!lowerRgb || !upperRgb) {
        return lower.color;
    }

    // Interpolate and return
    const result = lerpColor(lowerRgb, upperRgb, localT);
    return rgbToHex(result);
}

/**
 * Calculates normalized position based on coordinates and direction
 * @param x - Normalized x coordinate (0-1)
 * @param y - Normalized y coordinate (0-1)
 * @param direction - Gradient direction
 * @returns Position along gradient (0-1)
 */
export function getGradientPosition(
    x: number,
    y: number,
    direction: GradientDirection
): number {
    switch (direction) {
        case 'top-bottom':
            return y;
        case 'bottom-top':
            return 1 - y;
        case 'left-right':
            return x;
        case 'right-left':
            return 1 - x;
        default:
            return y;
    }
}

/**
 * Creates a gradient sampler function for the given colors and direction
 * @param colors - Array of hex colors
 * @param direction - Gradient direction
 * @returns Function that samples color at (x, y) normalized coordinates
 */
export function createGradientSampler(
    colors: string[],
    direction: GradientDirection
): (x: number, y: number) => string {
    const stops = createEvenStops(colors);

    return (x: number, y: number): string => {
        const t = getGradientPosition(x, y, direction);
        return sampleGradient(stops, t);
    };
}

/**
 * Validates a hex color string
 * @param hex - Color string to validate
 * @returns True if valid hex color
 */
export function isValidHex(hex: string): boolean {
    return hexToRgb(hex) !== null;
}

/**
 * Returns a fallback color if the provided color is invalid
 * @param hex - Color to validate
 * @param fallback - Fallback color
 * @returns Valid hex color
 */
export function safeColor(hex: string, fallback: string = '#808080'): string {
    return isValidHex(hex) ? hex : fallback;
}

/**
 * Calculates color distance (Euclidean in RGB space)
 * @param c1 - First color (hex)
 * @param c2 - Second color (hex)
 * @returns Distance value (0-441.67 for RGB)
 */
export function colorDistance(c1: string, c2: string): number {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);

    if (!rgb1 || !rgb2) return Infinity;

    const dr = rgb1.r - rgb2.r;
    const dg = rgb1.g - rgb2.g;
    const db = rgb1.b - rgb2.b;

    return Math.sqrt(dr * dr + dg * dg + db * db);
}
