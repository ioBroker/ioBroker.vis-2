import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ThermostatDial, { type ThermostatDialProps } from './ThermostatDial';

/**
 * The dial is drawn, not laid out: one SVG with a `viewBox` and every part of it worked out from two numbers.
 * That makes it the one piece of these widget sets that can be checked without a browser - where the knob ends
 * up is arithmetic, and arithmetic is what goes wrong silently.
 */
const BASE: ThermostatDialProps = {
    actual: 21.5,
    target: 22,
    min: 5,
    max: 35,
    unit: '°C',
    setWord: 'Soll',
    cold: '#00f',
    warm: '#f00',
    track: '#888',
    ink: '#fff',
    quiet: '#aaa',
    isFloatComma: false,
};

/** The middle of the knob, out of the drawing */
function knob(markup: string): { x: number; y: number } {
    const match = markup.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="10"/);
    if (!match) {
        throw new Error(`No knob in ${markup}`);
    }
    return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

describe('ThermostatDial', () => {
    it('writes what the room is and what it should be', () => {
        const markup = renderToStaticMarkup(createElement(ThermostatDial, BASE));

        expect(markup).toContain('21.5');
        expect(markup).toContain('Soll 22.0°C');
    });

    it('writes a comma where the system writes one', () => {
        const markup = renderToStaticMarkup(createElement(ThermostatDial, { ...BASE, isFloatComma: true }));

        expect(markup).toContain('21,5');
        expect(markup).toContain('Soll 22,0°C');
    });

    it('says nothing about a room nobody has measured', () => {
        const markup = renderToStaticMarkup(createElement(ThermostatDial, { ...BASE, actual: null }));

        expect(markup).toContain('--');
    });

    it('puts the knob at the left end for the lowest temperature and at the right end for the highest', () => {
        const low = knob(renderToStaticMarkup(createElement(ThermostatDial, { ...BASE, target: 5 })));
        const high = knob(renderToStaticMarkup(createElement(ThermostatDial, { ...BASE, target: 35 })));

        // the scale reaches the same distance to either side of twelve o'clock
        expect(low.x).toBeLessThan(50);
        expect(high.x).toBeGreaterThan(150);
        expect(low.y).toBeCloseTo(high.y, 1);
    });

    it('puts the knob at the top for the middle of the scale', () => {
        const middle = knob(renderToStaticMarkup(createElement(ThermostatDial, { ...BASE, target: 20 })));

        expect(middle.x).toBeCloseTo(100, 1);
        expect(middle.y).toBeCloseTo(20, 1);
    });

    it('keeps the knob on the scale for a value outside it', () => {
        const below = knob(renderToStaticMarkup(createElement(ThermostatDial, { ...BASE, target: -40 })));
        const low = knob(renderToStaticMarkup(createElement(ThermostatDial, { ...BASE, target: 5 })));

        expect(below).toEqual(low);
    });
});
