/**
 * Unit tests for RNG module
 */

import { describe, it, expect } from 'vitest';
import { mulberry32, seededRandom, randomInt, shuffleArray, parseSeed } from '../rng';

describe('mulberry32', () => {
    it('should produce deterministic output from same seed', () => {
        const rng1 = mulberry32(12345);
        const rng2 = mulberry32(12345);

        for (let i = 0; i < 10; i++) {
            expect(rng1()).toBe(rng2());
        }
    });

    it('should produce different output from different seeds', () => {
        const rng1 = mulberry32(12345);
        const rng2 = mulberry32(54321);

        const values1: number[] = [];
        const values2: number[] = [];

        for (let i = 0; i < 10; i++) {
            values1.push(rng1());
            values2.push(rng2());
        }

        // At least some values should differ
        const allSame = values1.every((v, i) => v === values2[i]);
        expect(allSame).toBe(false);
    });

    it('should produce values in range [0, 1)', () => {
        const rng = mulberry32(42);

        for (let i = 0; i < 1000; i++) {
            const value = rng();
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });

    it('should produce varied distribution', () => {
        const rng = mulberry32(999);
        const buckets = [0, 0, 0, 0, 0];

        for (let i = 0; i < 1000; i++) {
            const bucket = Math.floor(rng() * 5);
            buckets[bucket]++;
        }

        // Each bucket should have some values (rough uniformity check)
        buckets.forEach((count) => {
            expect(count).toBeGreaterThan(100);
            expect(count).toBeLessThan(300);
        });
    });
});

describe('seededRandom', () => {
    it('should return consistent value for same seed', () => {
        expect(seededRandom(42)).toBe(seededRandom(42));
        expect(seededRandom(100)).toBe(seededRandom(100));
    });

    it('should return different values for different seeds', () => {
        expect(seededRandom(42)).not.toBe(seededRandom(43));
    });
});

describe('randomInt', () => {
    it('should produce integers within range', () => {
        const rng = mulberry32(12345);

        for (let i = 0; i < 100; i++) {
            const value = randomInt(rng, 0, 10);
            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(10);
        }
    });

    it('should produce range edge values', () => {
        const rng = mulberry32(1);
        const values = new Set<number>();

        for (let i = 0; i < 1000; i++) {
            values.add(randomInt(rng, 0, 3));
        }

        expect(values.has(0)).toBe(true);
        expect(values.has(3)).toBe(true);
    });
});

describe('shuffleArray', () => {
    it('should shuffle array deterministically with same seed', () => {
        const arr1 = [1, 2, 3, 4, 5];
        const arr2 = [1, 2, 3, 4, 5];

        shuffleArray(arr1, mulberry32(42));
        shuffleArray(arr2, mulberry32(42));

        expect(arr1).toEqual(arr2);
    });

    it('should contain all original elements', () => {
        const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const original = [...arr];

        shuffleArray(arr, mulberry32(123));

        expect(arr.sort()).toEqual(original.sort());
    });

    it('should produce different order with different seeds', () => {
        const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        shuffleArray(arr1, mulberry32(42));
        shuffleArray(arr2, mulberry32(99));

        // Very unlikely to be the same
        const allSame = arr1.every((v, i) => v === arr2[i]);
        expect(allSame).toBe(false);
    });
});

describe('parseSeed', () => {
    it('should parse numeric strings', () => {
        expect(parseSeed('42')).toBe(42);
        expect(parseSeed('12345')).toBe(12345);
        expect(parseSeed('0')).toBe(1); // 0 becomes 1
    });

    it('should parse negative numbers as positive', () => {
        expect(parseSeed('-42')).toBe(42);
    });

    it('should hash non-numeric strings', () => {
        const seed1 = parseSeed('hello');
        const seed2 = parseSeed('hello');
        const seed3 = parseSeed('world');

        expect(seed1).toBe(seed2);
        expect(seed1).not.toBe(seed3);
        expect(typeof seed1).toBe('number');
        expect(seed1).toBeGreaterThan(0);
    });

    it('should handle whitespace', () => {
        expect(parseSeed('  42  ')).toBe(42);
        expect(parseSeed('  hello  ')).toBeGreaterThan(0);
    });
});
