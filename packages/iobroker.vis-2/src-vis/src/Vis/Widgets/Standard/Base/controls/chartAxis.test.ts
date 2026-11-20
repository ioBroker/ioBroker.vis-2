import { describe, expect, it } from 'vitest';

import { axisMargin, estimateTextWidth } from './chartAxis';

describe('estimateTextWidth', () => {
    it('gives a point less room than a digit, and an m more', () => {
        expect(estimateTextWidth('.', 10)).toBeLessThan(estimateTextWidth('5', 10));
        expect(estimateTextWidth('m', 10)).toBeGreaterThan(estimateTextWidth('5', 10));
        expect(estimateTextWidth('', 10)).toBe(0);
    });

    it('grows with the font', () => {
        expect(estimateTextWidth('35,0', 22)).toBeCloseTo(estimateTextWidth('35,0', 11) * 2);
    });
});

describe('axisMargin', () => {
    it('keeps the room it always had for short labels', () => {
        expect(axisMargin(['10,0', '20,0', '30,0 °C'], 11, 52, 200)).toBe(52);
    });

    it('makes room for the unit of the top label, so its first digits are not cut off', () => {
        const labels = ['0,0', '10,0', '20,0', '35,0 km/h'];
        const margin = axisMargin(labels, 11, 52, 200);
        expect(margin).toBeGreaterThan(52);
        // the label ends 6 px left of the plot and must start right of the edge of the card
        expect(margin - 6 - estimateTextWidth('35,0 km/h', 11)).toBeGreaterThanOrEqual(0);
    });

    it('never takes more than it may', () => {
        expect(axisMargin(['Ein sehr langes Wort eines Zustands'], 11, 52, 90)).toBe(90);
        // and never less than it takes anyway, even if the chart is tiny
        expect(axisMargin(['35,0 km/h'], 11, 52, 30)).toBe(52);
    });
});
