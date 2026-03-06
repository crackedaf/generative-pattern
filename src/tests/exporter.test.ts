/**
 * Unit tests for exporter module
 */

import { describe, it, expect } from 'vitest';
import { generateFilename, checkCanvasSize, generateSVGString } from '../exporter';
import { DEFAULT_SETTINGS } from '../types';

describe('generateFilename', () => {
    it('should generate PNG filename with timestamp and seed', () => {
        const filename = generateFilename(DEFAULT_SETTINGS, 'png');

        expect(filename).toMatch(/^pattern-\d{8}-\d{4}-seed42-3colors\.png$/);
    });

    it('should generate SVG filename', () => {
        const filename = generateFilename(DEFAULT_SETTINGS, 'svg');

        expect(filename).toMatch(/^pattern-\d{8}-\d{4}-seed42-3colors\.svg$/);
    });

    it('should include correct color count', () => {
        const settings = {
            ...DEFAULT_SETTINGS,
            colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'],
            seed: 123,
        };

        const filename = generateFilename(settings, 'png');
        expect(filename).toContain('seed123');
        expect(filename).toContain('5colors');
    });
});

describe('checkCanvasSize', () => {
    it('should return null for valid sizes', () => {
        expect(checkCanvasSize(512, 512)).toBeNull();
        expect(checkCanvasSize(1024, 1024)).toBeNull();
        expect(checkCanvasSize(100, 100)).toBeNull();
    });

    it('should return warning for oversized canvas', () => {
        const warning = checkCanvasSize(2048, 2048);
        expect(warning).not.toBeNull();
        expect(warning).toContain('exceeds maximum');
    });

    it('should handle edge case at limit', () => {
        // 1024 * 1024 = 1,048,576 which is exactly the limit
        expect(checkCanvasSize(1024, 1024)).toBeNull();
        expect(checkCanvasSize(1025, 1024)).not.toBeNull();
    });
});

describe('generateSVGString', () => {
    const testSettings = {
        ...DEFAULT_SETTINGS,
        width: 100,
        height: 100,
        cellSize: 50,
        colors: ['#ff0000', '#0000ff'],
    };

    it('should generate valid SVG structure', () => {
        const svg = generateSVGString(testSettings, new Map());

        expect(svg).toContain('<?xml version="1.0"');
        expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
        expect(svg).toContain('viewBox="0 0 100 100"');
        expect(svg).toContain('</svg>');
    });

    it('should include metadata attributes', () => {
        const svg = generateSVGString(testSettings, new Map());

        expect(svg).toContain('data-seed="42"');
        expect(svg).toContain('data-cell-size="50"');
        expect(svg).toContain('data-direction="top-bottom"');
        expect(svg).toContain('data-gradient-blend-factor="1"');
        expect(svg).toContain('data-generator-app="generative-pattern"');
    });

    it('should contain rect elements', () => {
        const svg = generateSVGString(testSettings, new Map());

        // Should have 4 cells (2x2 grid at 50px cells on 100x100 canvas)
        const rectCount = (svg.match(/<rect /g) || []).length;
        expect(rectCount).toBe(4);
    });

    it('should have integer coordinates', () => {
        const svg = generateSVGString(testSettings, new Map());

        // All x, y, width, height should be integers
        const rectMatches = svg.match(/<rect [^>]+>/g) || [];
        rectMatches.forEach((rect) => {
            const x = rect.match(/x="(\d+)"/);
            const y = rect.match(/y="(\d+)"/);
            const w = rect.match(/width="(\d+)"/);
            const h = rect.match(/height="(\d+)"/);

            expect(x).not.toBeNull();
            expect(y).not.toBeNull();
            expect(w).not.toBeNull();
            expect(h).not.toBeNull();
        });
    });

    it('should group rects by color', () => {
        const svg = generateSVGString(testSettings, new Map());

        // Should have group elements with fill attributes
        expect(svg).toMatch(/<g fill="#[0-9a-f]{6}">/i);
    });

    it('should apply overrides', () => {
        const overrides = new Map<string, string>();
        overrides.set('0,0', '#00ff00');

        const svg = generateSVGString(testSettings, overrides);

        expect(svg).toContain('#00ff00');
    });
});
