import { describe, expect, it } from 'vitest';
import { computeWaveOffset } from '../waveDistortion';

describe('computeWaveOffset', () => {
    it('returns 0 for empty wave list', () => {
        expect(computeWaveOffset(100, [])).toBe(0);
    });

    it('computes offset for one wave', () => {
        const offset = computeWaveOffset(50, [
            { amplitude: 20, frequency: 0.05, phase: 0.5, influence: 0.75 },
        ]);
        const expected = 20 * Math.sin(0.05 * 50 + 0.5) * 0.75;
        expect(offset).toBeCloseTo(expected, 12);
    });

    it('sums offsets from multiple waves', () => {
        const waves = [
            { amplitude: 30, frequency: 0.02, phase: 0, influence: 1 },
            { amplitude: 15, frequency: 0.04, phase: 1.5, influence: 0.6 },
        ];
        const offset = computeWaveOffset(120, waves);
        const expected =
            30 * Math.sin(0.02 * 120 + 0) * 1 +
            15 * Math.sin(0.04 * 120 + 1.5) * 0.6;
        expect(offset).toBeCloseTo(expected, 12);
    });
});
