import type { WaveLayer } from './types';

export function computeWaveOffset(x: number, waves: WaveLayer[]): number {
    let offset = 0;

    for (let i = 0; i < waves.length; i++) {
        const wave = waves[i];
        offset += wave.amplitude * Math.sin(wave.frequency * x + wave.phase) * wave.influence;
    }

    return offset;
}
