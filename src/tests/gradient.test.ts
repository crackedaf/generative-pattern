/**
 * Unit tests for gradient module
 */

import { describe, it, expect } from 'vitest';
import {
    hexToRgb,
    rgbToHex,
    lerp,
    lerpColor,
    createEvenStops,
    sampleGradient,
    getGradientPosition,
    createGradientSampler,
    isValidHex,
    safeColor,
    colorDistance,
} from '../gradient';

describe('hexToRgb', () => {
    it('should parse 6-digit hex colors', () => {
        expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
        expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
        expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
        expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
        expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should parse 3-digit hex colors', () => {
        expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
        expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
        expect(hexToRgb('#00f')).toEqual({ r: 0, g: 0, b: 255 });
        expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should handle colors without # prefix', () => {
        expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
        expect(hexToRgb('f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should return null for invalid colors', () => {
        expect(hexToRgb('')).toBeNull();
        expect(hexToRgb('#')).toBeNull();
        expect(hexToRgb('#gg0000')).toBeNull();
        expect(hexToRgb('#ff00')).toBeNull();
        expect(hexToRgb('not a color')).toBeNull();
    });
});

describe('rgbToHex', () => {
    it('should convert RGB to hex', () => {
        expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
        expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe('#00ff00');
        expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe('#0000ff');
        expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
        expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    });

    it('should clamp values', () => {
        expect(rgbToHex({ r: 300, g: -10, b: 128 })).toBe('#ff0080');
    });

    it('should round fractional values', () => {
        expect(rgbToHex({ r: 127.5, g: 127.5, b: 127.5 })).toBe('#808080');
    });
});

describe('lerp', () => {
    it('should interpolate between values', () => {
        expect(lerp(0, 100, 0)).toBe(0);
        expect(lerp(0, 100, 1)).toBe(100);
        expect(lerp(0, 100, 0.5)).toBe(50);
        expect(lerp(0, 100, 0.25)).toBe(25);
    });

    it('should handle negative values', () => {
        expect(lerp(-100, 100, 0.5)).toBe(0);
    });
});

describe('lerpColor', () => {
    it('should interpolate between colors', () => {
        const black = { r: 0, g: 0, b: 0 };
        const white = { r: 255, g: 255, b: 255 };

        expect(lerpColor(black, white, 0)).toEqual(black);
        expect(lerpColor(black, white, 1)).toEqual(white);
        expect(lerpColor(black, white, 0.5)).toEqual({ r: 127.5, g: 127.5, b: 127.5 });
    });

    it('should interpolate red to blue', () => {
        const red = { r: 255, g: 0, b: 0 };
        const blue = { r: 0, g: 0, b: 255 };

        const result = lerpColor(red, blue, 0.5);
        expect(result.r).toBe(127.5);
        expect(result.g).toBe(0);
        expect(result.b).toBe(127.5);
    });
});

describe('createEvenStops', () => {
    it('should create evenly spaced stops', () => {
        const stops = createEvenStops(['#ff0000', '#00ff00', '#0000ff']);
        expect(stops).toHaveLength(3);
        expect(stops[0].position).toBe(0);
        expect(stops[1].position).toBe(0.5);
        expect(stops[2].position).toBe(1);
    });

    it('should handle single color', () => {
        const stops = createEvenStops(['#ff0000']);
        expect(stops).toHaveLength(1);
        expect(stops[0].position).toBe(0.5);
    });

    it('should handle empty array', () => {
        expect(createEvenStops([])).toHaveLength(0);
    });
});

describe('sampleGradient', () => {
    it('should sample at start and end', () => {
        const stops = [
            { color: '#ff0000', position: 0 },
            { color: '#0000ff', position: 1 },
        ];

        expect(sampleGradient(stops, 0)).toBe('#ff0000');
        expect(sampleGradient(stops, 1)).toBe('#0000ff');
    });

    it('should interpolate at midpoint', () => {
        const stops = [
            { color: '#000000', position: 0 },
            { color: '#ffffff', position: 1 },
        ];

        const result = sampleGradient(stops, 0.5);
        expect(result).toBe('#808080');
    });

    it('should handle multiple stops', () => {
        const stops = [
            { color: '#ff0000', position: 0 },
            { color: '#00ff00', position: 0.5 },
            { color: '#0000ff', position: 1 },
        ];

        expect(sampleGradient(stops, 0)).toBe('#ff0000');
        expect(sampleGradient(stops, 0.5)).toBe('#00ff00');
        expect(sampleGradient(stops, 1)).toBe('#0000ff');
    });
});

describe('getGradientPosition', () => {
    it('should calculate position for top-bottom', () => {
        expect(getGradientPosition(0, 0, 'top-bottom')).toBe(0);
        expect(getGradientPosition(0.5, 0.5, 'top-bottom')).toBe(0.5);
        expect(getGradientPosition(1, 1, 'top-bottom')).toBe(1);
    });

    it('should calculate position for bottom-top', () => {
        expect(getGradientPosition(0, 0, 'bottom-top')).toBe(1);
        expect(getGradientPosition(0.5, 0.5, 'bottom-top')).toBe(0.5);
        expect(getGradientPosition(1, 1, 'bottom-top')).toBe(0);
    });

    it('should calculate position for left-right', () => {
        expect(getGradientPosition(0, 0.5, 'left-right')).toBe(0);
        expect(getGradientPosition(1, 0.5, 'left-right')).toBe(1);
    });

    it('should calculate position for right-left', () => {
        expect(getGradientPosition(0, 0.5, 'right-left')).toBe(1);
        expect(getGradientPosition(1, 0.5, 'right-left')).toBe(0);
    });
});

describe('createGradientSampler', () => {
    it('should create a working sampler', () => {
        const sampler = createGradientSampler(['#000000', '#ffffff'], 'left-right');

        expect(sampler(0, 0.5)).toBe('#000000');
        expect(sampler(1, 0.5)).toBe('#ffffff');
        expect(sampler(0.5, 0.5)).toBe('#808080');
    });
});

describe('isValidHex', () => {
    it('should validate correct hex colors', () => {
        expect(isValidHex('#ff0000')).toBe(true);
        expect(isValidHex('#f00')).toBe(true);
        expect(isValidHex('ff0000')).toBe(true);
    });

    it('should reject invalid colors', () => {
        expect(isValidHex('')).toBe(false);
        expect(isValidHex('#gggggg')).toBe(false);
        expect(isValidHex('not a color')).toBe(false);
    });
});

describe('safeColor', () => {
    it('should return valid colors unchanged', () => {
        expect(safeColor('#ff0000')).toBe('#ff0000');
    });

    it('should return fallback for invalid colors', () => {
        expect(safeColor('invalid')).toBe('#808080');
        expect(safeColor('invalid', '#ff0000')).toBe('#ff0000');
    });
});

describe('colorDistance', () => {
    it('should calculate distance between colors', () => {
        expect(colorDistance('#000000', '#000000')).toBe(0);
        expect(colorDistance('#ffffff', '#ffffff')).toBe(0);
    });

    it('should calculate max distance', () => {
        // Black to white is sqrt(255^2 * 3) ≈ 441.67
        const distance = colorDistance('#000000', '#ffffff');
        expect(distance).toBeCloseTo(441.67, 1);
    });

    it('should return Infinity for invalid colors', () => {
        expect(colorDistance('invalid', '#000000')).toBe(Infinity);
    });
});
