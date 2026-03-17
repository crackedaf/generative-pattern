import { describe, expect, it } from 'vitest';
import { generateCellData } from '../renderer';
import { DEFAULT_SETTINGS } from '../types';

function getCell(cells: ReturnType<typeof generateCellData>, row: number, col: number) {
    const cell = cells.find(c => c.row === row && c.col === col);
    if (!cell) {
        throw new Error(`Missing cell at ${row},${col}`);
    }
    return cell;
}

function getCellColor(cells: ReturnType<typeof generateCellData>, row: number, col: number): string {
    return getCell(cells, row, col).color;
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

describe('generateCellData waveDistortion', () => {
    it('keeps y positions unchanged when disabled', () => {
        const settings = {
            ...DEFAULT_SETTINGS,
            width: 8,
            height: 8,
            cellSize: 2,
            waveDistortion: {
                enabled: false,
                waves: [{ amplitude: 10, frequency: 0.2, phase: 0, influence: 1 }],
            },
        };
        const cells = generateCellData(settings, new Map<string, string>());
        expect(getCell(cells, 1, 2).y).toBe(2);
    });

    it('keeps grid geometry and applies wave to sampled gradient values', () => {
        const baseSettings = {
            ...DEFAULT_SETTINGS,
            width: 8,
            height: 8,
            cellSize: 2,
            colors: ['#000000', '#ffffff'],
            direction: 'top-bottom' as const,
            randomness: 0,
            symmetry: { horizontal: false, vertical: false },
            waveDistortion: {
                enabled: false,
                waves: [{ amplitude: 2, frequency: 1, phase: 0, influence: 1 }],
            },
        };
        const cellsWithoutWave = generateCellData(baseSettings, new Map<string, string>());
        const settings = {
            ...baseSettings,
            waveDistortion: { ...baseSettings.waveDistortion, enabled: true },
        };
        const cellsWithWave = generateCellData(settings, new Map<string, string>());
        const withoutWave = getCell(cellsWithoutWave, 1, 2);
        const withWave = getCell(cellsWithWave, 1, 2);

        expect(withWave.y).toBe(withoutWave.y);
        expect(withWave.color).not.toBe(withoutWave.color);
    });
});
