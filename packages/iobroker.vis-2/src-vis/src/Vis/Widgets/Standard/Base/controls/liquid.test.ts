import { describe, it, expect } from 'vitest';

import { liquidPath } from './liquid';

/** The y of the surface at the left edge, which the path starts at */
function surfaceAt(path: string): number {
    const start = /^M0 ([\d.]+)/.exec(path);
    return Number(start?.[1]);
}

/** How far the first control point lifts the wave off its line */
function swing(path: string): number {
    const y = surfaceAt(path);
    // `M0 y C x1 y1 x2 y2 x3 y3 ...`, so the first control point is the fourth number
    const numbers = path.match(/-?[\d.]+/g)!.map(Number);
    return Math.abs(numbers[3] - y);
}

describe('liquidPath', () => {
    it('draws nothing where there is nothing in it', () => {
        expect(liquidPath({ share: 0 })).toBe('');
        expect(liquidPath({ share: -5 })).toBe('');
    });

    it('stands as high as it is full, measured from the bottom', () => {
        expect(surfaceAt(liquidPath({ share: 25 }))).toBe(75);
        expect(surfaceAt(liquidPath({ share: 60 }))).toBe(40);
    });

    it('hangs as deep as it covers, measured from the top', () => {
        expect(surfaceAt(liquidPath({ share: 25, from: 'top' }))).toBe(25);
    });

    it('closes around the end it stands against', () => {
        expect(liquidPath({ share: 50 })).toMatch(/L100 100 L0 100 Z$/);
        expect(liquidPath({ share: 50, from: 'top' })).toMatch(/L100 0 L0 0 Z$/);
    });

    it('has a straight surface unless a wave was asked for', () => {
        expect(swing(liquidPath({ share: 50 }))).toBe(0);
        expect(swing(liquidPath({ share: 50, wave: true }))).toBeGreaterThan(2);
    });

    it('lies flat where the wave would bite into the ends', () => {
        // a full tank with notches in its top and an empty one with a wriggling floor are both wrong
        expect(swing(liquidPath({ share: 99, wave: true }))).toBeLessThan(0.5);
        expect(swing(liquidPath({ share: 1, wave: true }))).toBeLessThan(0.5);
        expect(swing(liquidPath({ share: 50, wave: true }))).toBeGreaterThan(
            swing(liquidPath({ share: 3, wave: true })),
        );
    });

    it('never leaves its box, however full it is told it is', () => {
        for (const share of [1, 50, 99, 100, 140]) {
            const numbers = liquidPath({ share, wave: true })
                .match(/-?[\d.]+/g)!
                .map(Number);
            expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
            expect(Math.max(...numbers)).toBeLessThanOrEqual(100);
        }
    });
});
