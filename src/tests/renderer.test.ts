import { describe, expect, it } from 'vitest';
import { generateCellData } from '../renderer';
import { DEFAULT_SETTINGS } from '../types';

function getCellColor(cells: ReturnType<typeof generateCellData>, row: number, col: number): string {
    const cell = cells.find(c => c.row === row && c.col === col);
    if (!cell) {
        throw new Error(`Missing cell at ${row},${col}`);
    }
    return cell.color;
}

function makeSettings(gradientBlendFactor: number) {
    return {
        ...DEFAULT_SETTINGS,
        width: 3,
        height: 3,
        cellSize: 1,
        colors: ['#000000', '#ffffff'],
        direction: 'top-bottom' as const,
        randomness: 0,
        symmetry: { horizontal: false, vertical: false },
        cellColorMode: 'gradient' as const,
        gradientBlendFactor,
    };
}

describe('generateCellData gradientBlendFactor', () => {
    it('uses 0 as no blending and 1 as full blending', () => {
        const noBlendCells = generateCellData(makeSettings(0), new Map<string, string>());
        const halfBlendCells = generateCellData(makeSettings(0.5), new Map<string, string>());
        const fullBlendCells = generateCellData(makeSettings(1), new Map<string, string>());

        expect(getCellColor(noBlendCells, 0, 0)).toBe('#2b2b2b');
        expect(getCellColor(halfBlendCells, 0, 0)).toBe('#393939');
        expect(getCellColor(fullBlendCells, 0, 0)).toBe('#474747');

        expect(getCellColor(noBlendCells, 1, 1)).toBe('#808080');
        expect(getCellColor(halfBlendCells, 1, 1)).toBe('#808080');
        expect(getCellColor(fullBlendCells, 1, 1)).toBe('#808080');
    });

    it('does not apply blend factor in solid mode', () => {
        const settings = {
            ...makeSettings(1),
            cellColorMode: 'solid' as const,
        };
        const cells = generateCellData(settings, new Map<string, string>());
        expect(getCellColor(cells, 0, 0)).toBe('#2b2b2b');
    });
});
