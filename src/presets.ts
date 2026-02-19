/**
 * Preset configurations for quick start
 */

import type { Preset } from './types';

/**
 * Built-in preset patterns
 */
export const PRESETS: Preset[] = [
    {
        name: 'Neon Grid',
        colors: ['#0ff', '#f0f', '#ff0'],
        seed: 1337,
        cellSize: 24,
        direction: 'left-right',
        randomness: 0.1,
    },
    {
        name: 'Dusky Blocks',
        colors: ['#0b1021', '#3b2f5b', '#b26b6b'],
        seed: 420,
        cellSize: 32,
        direction: 'top-bottom',
        randomness: 0.05,
    },
    {
        name: 'Sunset Gradient',
        colors: ['#ff6b35', '#ff9f1c', '#ffbf69', '#cbf3f0', '#2ec4b6'],
        seed: 2024,
        cellSize: 16,
        direction: 'top-bottom',
        randomness: 0.15,
    },
    {
        name: 'Monochrome Noise',
        colors: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
        seed: 8080,
        cellSize: 8,
        direction: 'bottom-top',
        randomness: 0.3,
    },
    {
        name: 'Forest Dream',
        colors: ['#2d5a27', '#5b8c5a', '#8fc93a', '#e7f59e', '#f9f9f9'],
        seed: 777,
        cellSize: 20,
        direction: 'bottom-top',
        randomness: 0.2,
    },
    {
        name: 'Ocean Depths',
        colors: ['#03045e', '#023e8a', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'],
        seed: 1234,
        cellSize: 12,
        direction: 'top-bottom',
        randomness: 0.1,
    },
    {
        name: 'Retro Pixel',
        colors: ['#000000', '#ff004d', '#ffa300', '#fff024', '#00e756', '#29adff', '#83769c'],
        seed: 1986,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.4,
    },
    {
        name: 'Pastel Soft',
        colors: ['#ffecd2', '#fcb69f', '#ff9a9e', '#fecfef', '#a18cd1', '#84fab0'],
        seed: 999,
        cellSize: 24,
        direction: 'right-left',
        randomness: 0.15,
    },
    {
        name: 'Geometric Flow',
        colors: ['#00d2ff', '#3a7bd5', '#002a67'],
        seed: 101,
        cellSize: 22,
        direction: 'left-right',
        randomness: 0.12,
    },
    {
        name: 'Warm Earth',
        colors: ['#f4a261', '#e76f51', '#2a9d8f', '#264653'],
        seed: 202,
        cellSize: 18,
        direction: 'top-bottom',
        randomness: 0.18,
    },
    {
        name: 'Cool Mint',
        colors: ['#a8dadc', '#457b9d', '#1d3557', '#f1faee'],
        seed: 303,
        cellSize: 24,
        direction: 'right-left',
        randomness: 0.09,
    },
    {
        name: 'Vibrant Pop',
        colors: ['#ff0055', '#ff5e62', '#ff9f1c', '#fcf6bd'],
        seed: 404,
        cellSize: 16,
        direction: 'bottom-top',
        randomness: 0.35,
    },
    {
        name: 'Deep Space',
        colors: ['#0a0e27', '#1a1a40', '#3a506b', '#586f7c'],
        seed: 505,
        cellSize: 28,
        direction: 'left-right',
        randomness: 0.05,
    },
    {
        name: 'Soft Clouds',
        colors: ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784'],
        seed: 808,
        cellSize: 30,
        direction: 'top-bottom',
        randomness: 0.14,
    },
    {
        name: 'Golden Hour',
        colors: ['#f7b267', '#f79d65', '#f4845f', '#f27059'],
        seed: 1010,
        cellSize: 22,
        direction: 'bottom-top',
        randomness: 0.16,
    },
    {
        name: 'Monochrome Lines',
        colors: ['#000000', '#4a4a4a', '#969696', '#ffffff'],
        seed: 1111,
        cellSize: 12,
        direction: 'left-right',
        randomness: 0.03,
    },
    {
        name: 'Pastel Blocks',
        colors: ['#fce4ec', '#f8bbd0', '#f48fb1', '#f06292'],
        seed: 1212,
        cellSize: 26,
        direction: 'top-bottom',
        randomness: 0.07,
    },
    {
        name: 'Deep Ocean',
        colors: ['#003b46', '#07575b', '#66a5ad', '#c4dfe6'],
        seed: 1414,
        cellSize: 24,
        direction: 'top-bottom',
        randomness: 0.11,
    },
    {
        name: 'Sunset Gradient',
        colors: ['#ff6b35', '#ff9f1c', '#ffbf69', '#cbf3f0', '#2ec4b6'],
        seed: 1515,
        cellSize: 16,
        direction: 'top-bottom',
        randomness: 0.15,
    },
    {
        name: 'Forest Dream',
        colors: ['#2d5a27', '#5b8c5a', '#8fc93a', '#e7f59e', '#f9f9f9'],
        seed: 1717,
        cellSize: 20,
        direction: 'bottom-top',
        randomness: 0.2,
    },
    {
        name: 'Ocean Depths',
        colors: ['#03045e', '#023e8a', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'],
        seed: 1818,
        cellSize: 12,
        direction: 'top-bottom',
        randomness: 0.1,
    },
    {
        name: 'Retro Pixel',
        colors: ['#000000', '#ff004d', '#ffa300', '#fff024', '#00e756', '#29adff', '#83769c'],
        seed: 1919,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.4,
    },
    {
        name: 'Pastel Soft',
        colors: ['#ffecd2', '#fcb69f', '#ff9a9e', '#fecfef', '#a18cd1', '#84fab0'],
        seed: 2020,
        cellSize: 24,
        direction: 'right-left',
        randomness: 0.15,
    },
    {
        name: 'Synthwave Sunset',
        colors: ['#ff006e', '#ffbe0b', '#8338ec', '#3a86ff'],
        seed: 2121,
        cellSize: 20,
        direction: 'left-right',
        randomness: 0.25,
    },
    {
        name: 'Glassmorphism Blur',
        colors: ['#e0c3fc', '#8ec5fc', '#f9f9f9'],
        seed: 2222,
        cellSize: 26,
        direction: 'top-bottom',
        randomness: 0.08,
    },
    {
        name: 'Vibrant Blocks',
        colors: ['#F4C20D', '#E86A4A', '#4FAF98', '#9C6ADE', '#5C7CC4'],
        seed: 3210,
        cellSize: 24,
        direction: 'left-right',
        randomness: 0.2,
    },
    {
        name: 'Modern Poster',
        colors: ['#F2B705', '#E4572E', '#3AA17E', '#A066D3', '#4C6EDB'],
        seed: 4123,
        cellSize: 22,
        direction: 'top-bottom',
        randomness: 0.18,
    },
    {
        name: 'Soft Punch Grid',
        colors: ['#FFD23F', '#EE6C4D', '#2A9D8F', '#B388EB', '#577590'],
        seed: 7788,
        cellSize: 26,
        direction: 'bottom-top',
        randomness: 0.15,
    },
    {
        name: 'High Contrast Mosaic',
        colors: ['#FFBE0B', '#FB5607', '#2EC4B6', '#8338EC', '#3A86FF'],
        seed: 9091,
        cellSize: 18,
        direction: 'right-left',
        randomness: 0.28,
    },
    {
        name: 'Muted UI Blocks',
        colors: ['#E9C46A', '#E76F51', '#43AA8B', '#9B5DE5', '#4361EE'],
        seed: 5555,
        cellSize: 30,
        direction: 'top-bottom',
        randomness: 0.1,
    },
    {
        name: 'Adamyaa',
        colors: ['#91FFE4', '#C4BBE5', '#ABF0FF'],
        seed: 4101,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.22,
    },
    {
        name: 'Palak',
        colors: ['#C4F4C7', '#E8E1EF', '#D9FFF8'],
        seed: 4102,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.20,
    },
    {
        name: 'Unnati',
        colors: ['#2B303A', '#BACBA9', '#468189'],
        seed: 4103,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.28,
    },
    {
        name: 'Raunak',
        colors: ['#DFF6FF', '#E5E8FF', '#EEF2F5'],
        seed: 4104,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.18,
    },
    {
        name: 'Bhargav',
        colors: ['#E6E6FA', '#FFE5D4', '#DFFFE2'],
        seed: 4105,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.23,
    },
    {
        name: 'Samriddhi',
        colors: ['#A0CCDA', '#B6EFD4', '#9CFFD9'],
        seed: 4106,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.24,
    },
    {
        name: 'Krish',
        colors: ['#A7AFEB', '#C59DF2', '#D3E3A8'],
        seed: 4107,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.27,
    },
    {
        name: 'Prince',
        colors: ['#C1E1C1', '#F4A460', '#FAF9F6'],
        seed: 4108,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.26,
    },
    {
        name: 'Aditya',
        colors: ['#DF9F82', '#E6BB84', '#BAE1FF'],
        seed: 4109,
        cellSize: 16,
        direction: 'left-right',
        randomness: 0.29,
    },
    // ── Brick pattern presets ─────────────────────────────────────────────
    {
        name: 'Classic Brick',
        generator: 'brick' as const,
        colors: ['#8b2500', '#c44b1e'],
        seed: 1337,
        cellSize: 16,
        direction: 'top-bottom',
        randomness: 0,
        brickSettings: {
            brickStyle: 'RedBrick' as const,
            brickWidth: 80,
            brickHeight: 40,
            mortarThickness: 4,
            mossDensity: 0,
            brickBaseColor: '#8b2500',
            mortarColor: '#c8b89a',
            brickVariation: 0.3,
            showCracks: false,
            optimizeSVG: false,
        },
    },
    {
        name: 'Mossy Ruins',
        generator: 'brick' as const,
        colors: ['#6b2200', '#b84117'],
        seed: 2048,
        cellSize: 16,
        direction: 'top-bottom',
        randomness: 0,
        brickSettings: {
            brickStyle: 'MossyBrick' as const,
            brickWidth: 90,
            brickHeight: 45,
            mortarThickness: 5,
            mossDensity: 0.55,
            brickBaseColor: '#6b2200',
            mortarColor: '#a89070',
            brickVariation: 0.25,
            showCracks: true,
            optimizeSVG: false,
        },
    },
];

/**
 * Default fallback palette when colors are invalid
 */
export const FALLBACK_PALETTE: string[] = [
    '#808080', // Gray
    '#c0c0c0', // Silver
    '#404040', // Dark gray
];

/**
 * Gets a preset by name
 */
export function getPresetByName(name: string): Preset | undefined {
    return PRESETS.find(p => p.name.toLowerCase() === name.toLowerCase());
}

/**
 * Gets all preset names
 */
export function getPresetNames(): string[] {
    return PRESETS.map(p => p.name);
}
