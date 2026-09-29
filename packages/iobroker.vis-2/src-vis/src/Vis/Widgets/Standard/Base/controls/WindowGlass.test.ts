import { describe, expect, it } from 'vitest';

import { leafBox, leafCorners, type WindowHandle, type WindowKind } from './WindowGlass';

/**
 * The browser moves from one shape to the next corner by corner. A leaf that lists its corners in a different
 * order per state therefore does not swing open - it slides its edges across the frame, which is what a window
 * looked like that was caught in the middle of the third of a second it takes.
 */
describe('leafCorners', () => {
    const sides: WindowHandle[] = ['right', 'left'];
    const kinds: WindowKind[] = ['window', 'door'];

    it('always gives four corners', () => {
        for (const kind of kinds) {
            for (const handle of sides) {
                for (const state of ['closed', 'tilted', 'open'] as const) {
                    expect(leafCorners(state, kind, handle)).toHaveLength(4);
                }
            }
        }
    });

    it('leaves the hinge where it is when the leaf opens', () => {
        for (const kind of kinds) {
            for (const handle of sides) {
                const closed = leafCorners('closed', kind, handle);
                const open = leafCorners('open', kind, handle);
                // the first and the last corner are the hinge, top and bottom
                expect(open[0]).toEqual(closed[0]);
                expect(open[3]).toEqual(closed[3]);
            }
        }
    });

    it('moves the free edge towards the hinge, and no further than halfway', () => {
        for (const kind of kinds) {
            const { leaf } = leafBox(kind);
            const width = leaf.right - leaf.left;

            // the handle on the right means the hinge on the left, so the free edge travels left
            const right = leafCorners('open', kind, 'right');
            expect(right[1].x).toBeLessThan(leaf.right);
            expect(right[1].x - leaf.left).toBeGreaterThan(width / 2);

            const left = leafCorners('open', kind, 'left');
            expect(left[1].x).toBeGreaterThan(leaf.left);
            expect(leaf.right - left[1].x).toBeGreaterThan(width / 2);
        }
    });

    it('draws the free edge taller than the hinge, because it is nearer', () => {
        for (const kind of kinds) {
            for (const handle of sides) {
                const open = leafCorners('open', kind, handle);
                expect(open[1].y).toBeLessThan(open[0].y);
                expect(open[2].y).toBeGreaterThan(open[3].y);
            }
        }
    });

    it('keeps the handle on its own side of the frame', () => {
        const { leaf } = leafBox('window');
        const middle = (leaf.left + leaf.right) / 2;

        // the free edge is corner 1 and 2; with the handle on the right it never crosses to the left half
        for (const state of ['closed', 'tilted', 'open'] as const) {
            expect(leafCorners(state, 'window', 'right')[1].x).toBeGreaterThan(middle);
            expect(leafCorners(state, 'window', 'left')[1].x).toBeLessThan(middle);
        }
    });

    it('turns a tilted leaf on its bottom edge', () => {
        const closed = leafCorners('closed', 'window', 'right');
        const tilted = leafCorners('tilted', 'window', 'right');
        // the two bottom corners stay on the sill, the two top ones come down and out
        expect(tilted[2].y).toBe(closed[2].y);
        expect(tilted[3].y).toBe(closed[3].y);
        expect(tilted[0].y).toBeGreaterThan(closed[0].y);
        expect(tilted[1].x).toBeGreaterThan(closed[1].x);
    });

    it('draws a door that reports a tilt as open, because a door does not tilt', () => {
        expect(leafCorners('tilted', 'door', 'right')).toEqual(leafCorners('open', 'door', 'right'));
    });
});
