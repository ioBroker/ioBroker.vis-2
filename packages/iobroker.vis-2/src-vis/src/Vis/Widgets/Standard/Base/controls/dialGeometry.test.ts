import { describe, expect, it } from 'vitest';

import { CENTRE, FULL_VIEW, THERMOSTAT_VIEW, pointerInView, valueAt } from './dialGeometry';

/**
 * A drawing that keeps its proportions stands in the middle of a box of other proportions. The pointer has to be
 * read against the drawing, not against the box - or the knob does not follow the finger.
 */
describe('pointerInView', () => {
    it('reads the pointer against a box of the same proportions', () => {
        const rect = { left: 10, top: 20, width: 176, height: 128 };
        expect(pointerInView({ clientX: 10, clientY: 20 }, rect, THERMOSTAT_VIEW)).toEqual({ x: 12, y: 8 });
    });

    it('leaves out the empty strips of a box that is wider than the drawing', () => {
        // twice as wide: the drawing is 176 wide and stands 88 px from the left edge
        const rect = { left: 0, top: 0, width: 352, height: 128 };
        expect(pointerInView({ clientX: 88, clientY: 0 }, rect, THERMOSTAT_VIEW)).toEqual({ x: 12, y: 8 });
        expect(pointerInView({ clientX: 176, clientY: 64 }, rect, THERMOSTAT_VIEW)).toEqual({ x: 100, y: 72 });
    });

    it('scales with the box', () => {
        const rect = { left: 0, top: 0, width: 400, height: 300 };
        expect(pointerInView({ clientX: 200, clientY: 150 }, rect, FULL_VIEW)).toEqual({ x: 100, y: 75 });
    });
});

describe('valueAt', () => {
    it('gives the middle of the scale straight above the centre, wherever the drawing stands in its box', () => {
        const above = { x: CENTRE.x, y: CENTRE.y - 50 };
        const narrow = { left: 0, top: 0, width: 176, height: 128 };
        const wide = { left: 0, top: 0, width: 352, height: 128 };
        const inNarrow = { clientX: above.x - THERMOSTAT_VIEW.x, clientY: above.y - THERMOSTAT_VIEW.y };
        const inWide = { clientX: inNarrow.clientX + 88, clientY: inNarrow.clientY };

        expect(valueAt(inNarrow, narrow, 5, 35, THERMOSTAT_VIEW)).toBeCloseTo(20);
        expect(valueAt(inWide, wide, 5, 35, THERMOSTAT_VIEW)).toBeCloseTo(20);
    });

    it('stops at the ends of the scale', () => {
        const rect = { left: 0, top: 0, width: 200, height: 150 };
        // far below on the left and on the right: past both ends of the arc
        expect(valueAt({ clientX: 0, clientY: 150 }, rect, 5, 35)).toBeCloseTo(5);
        expect(valueAt({ clientX: 200, clientY: 150 }, rect, 5, 35)).toBeCloseTo(35);
    });
});
