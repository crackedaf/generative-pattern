/**
 * Seeded pseudorandom number generator
 * Uses mulberry32 algorithm for deterministic, reproducible random sequences
 */

/**
 * Creates a seeded PRNG using the mulberry32 algorithm
 * @param seed - Integer seed value
 * @returns Function that returns pseudorandom floats in range [0, 1)
 */
export function mulberry32(seed: number): () => number {
    let state = seed >>> 0; // Ensure unsigned 32-bit integer

    return function (): number {
        state |= 0;
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Creates a seeded PRNG and returns the next random value
 * Convenience function for single-use random values
 * @param seed - Integer seed value
 * @returns Random float in range [0, 1)
 */
export function seededRandom(seed: number): number {
    return mulberry32(seed)();
}

/**
 * Generates a random integer in range [min, max] using seeded PRNG
 * @param rng - PRNG function
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer in range
 */
export function randomInt(rng: () => number, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Shuffles an array using Fisher-Yates algorithm with seeded PRNG
 * @param array - Array to shuffle (mutated in place)
 * @param rng - PRNG function
 * @returns The shuffled array
 */
export function shuffleArray<T>(array: T[], rng: () => number): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Parses a seed string into a numeric seed
 * Handles both numeric strings and text (hashes text to number)
 * @param seedStr - Seed string input
 * @returns Numeric seed value
 */
export function parseSeed(seedStr: string): number {
    const trimmed = seedStr.trim();

    // If it's a valid number, use it directly
    const num = parseInt(trimmed, 10);
    if (!isNaN(num)) {
        return Math.abs(num) || 1;
    }

    // Hash the string to create a numeric seed
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash) || 1;
}
