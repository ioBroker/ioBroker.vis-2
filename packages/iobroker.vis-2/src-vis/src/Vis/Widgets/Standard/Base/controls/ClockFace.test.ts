import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ClockFace, { estimateTextWidth, fitText } from './ClockFace';

/**
 * The date under the digits is as long as the language makes it, and an SVG does not wrap: a line that is too
 * long is drawn past the edge of the drawing, and the card cuts off its first and last letters.
 */
describe('estimateTextWidth', () => {
    it('counts a Chinese character as wide as it is high, a comma narrower than a letter', () => {
        expect(estimateTextWidth('星期三')).toBe(3);
        expect(estimateTextWidth(',')).toBeLessThan(estimateTextWidth('a'));
        expect(estimateTextWidth('M')).toBeGreaterThan(estimateTextWidth('i'));
    });
});

describe('fitText', () => {
    it('keeps the size of a line that fits', () => {
        expect(fitText('Mo, 3. Mai', 110, 12)).toEqual({ size: 12, squeeze: false });
    });

    it('makes a long line smaller and squeezes it into its width', () => {
        const fitted = fitText('Mittwoch, 11. November', 110, 12);
        expect(fitted.squeeze).toBe(true);
        expect(fitted.size).toBeLessThan(12);
        expect(estimateTextWidth('Mittwoch, 11. November') * fitted.size).toBeCloseTo(110);
    });
});

describe('ClockFace', () => {
    const draw = (dateText: string): string =>
        renderToStaticMarkup(
            createElement(ClockFace, {
                mode: 'digital',
                now: new Date(2026, 10, 11, 13, 33),
                dateText,
                language: 'de',
                ink: '#fff',
                quiet: '#888',
                accent: '#f00',
            }),
        );

    it('gives a long date the width of the drawing, so it cannot run past its edge', () => {
        const svg = draw('Mittwoch, 11. November');
        expect(svg).toMatch(/textLength="110\.4"/);
        expect(svg).toMatch(/lengthAdjust="spacingAndGlyphs"/);
    });

    it('leaves a short date as it is', () => {
        const svg = draw('11. Nov.');
        expect(svg).not.toMatch(/textLength/);
        expect(svg).toMatch(/font-size="12"/);
    });
});
