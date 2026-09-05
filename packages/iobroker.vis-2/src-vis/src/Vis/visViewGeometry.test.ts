import { describe, expect, it } from 'vitest';

import type { AnyWidgetId } from '@iobroker/types-vis-2';

import {
    type Box,
    computeRelativeOrder,
    computeRulers,
    selectionRect,
    snapToGrid,
    snapToWidgets,
} from './visViewGeometry';

const box = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom });

describe('snapToGrid', () => {
    const view = { left: 0, top: 0 };

    it('puts a widget that started on the grid back onto it', () => {
        // started at 100, moved 7 → 107 is 7 past the grid, so 7 is taken off again
        expect(snapToGrid({ x: 7, y: 0 }, { left: 100, top: 0 }, view, 10)).toEqual({ x: 0, y: 0 });
    });

    it('keeps a movement that lands on the grid', () => {
        expect(snapToGrid({ x: 20, y: 30 }, { left: 100, top: 100 }, view, 10)).toEqual({ x: 20, y: 30 });
    });

    it('measures the grid from the corner of the view, not from the widget', () => {
        // the widget starts at 103, which is 3 off the grid of the view - the movement takes that off too
        expect(snapToGrid({ x: 10, y: 0 }, { left: 103, top: 0 }, view, 10)).toEqual({ x: 7, y: 0 });
    });

    it('measures from a view that does not start at zero', () => {
        expect(snapToGrid({ x: 7, y: 0 }, { left: 150, top: 0 }, { left: 50, top: 0 }, 10)).toEqual({ x: 0, y: 0 });
    });

    it('takes ten as the spacing when none is set', () => {
        expect(snapToGrid({ x: 7, y: 7 }, { left: 0, top: 0 }, view, 0)).toEqual({ x: 0, y: 0 });
    });

    it('works on both axes at once', () => {
        expect(snapToGrid({ x: 13, y: 26 }, { left: 0, top: 0 }, view, 10)).toEqual({ x: 10, y: 20 });
    });
});

describe('snapToWidgets', () => {
    const start = box(100, 100, 200, 150);

    it('snaps the bottom edge onto the top edge of a widget below', () => {
        // the other widget starts at 158; moving 5 down puts the bottom at 155, three short
        const others = [box(100, 158, 200, 200)];
        expect(snapToWidgets({ x: 0, y: 5 }, start, others)).toEqual({ x: 0, y: 8 });
    });

    it('snaps the top edge onto the bottom edge of a widget above', () => {
        const others = [box(100, 40, 200, 94)];
        expect(snapToWidgets({ x: 0, y: -4 }, start, others)).toEqual({ x: 0, y: -6 });
    });

    it('snaps the right edge onto the left edge of a widget beside it', () => {
        const others = [box(207, 100, 300, 150)];
        expect(snapToWidgets({ x: 3, y: 0 }, start, others)).toEqual({ x: 7, y: 0 });
    });

    it('does not snap to a widget that is too far away', () => {
        const others = [box(100, 400, 200, 500)];
        expect(snapToWidgets({ x: 0, y: 5 }, start, others)).toEqual({ x: 0, y: 5 });
    });

    it('does not snap to a widget that does not overlap on the other axis', () => {
        // near enough vertically, but far off to the side, so it must not pull
        const others = [box(900, 158, 1000, 200)];
        expect(snapToWidgets({ x: 0, y: 5 }, start, others)).toEqual({ x: 0, y: 5 });
    });

    it('takes the first widget that is near enough and stops there', () => {
        const first = box(100, 158, 200, 200);
        const second = box(207, 100, 300, 150);
        const snapped = snapToWidgets({ x: 3, y: 5 }, start, [first, second]);
        // only the vertical axis is corrected, because the first match ends the search
        expect(snapped).toEqual({ x: 3, y: 8 });
    });

    it('keeps the movement when there is nothing to snap to', () => {
        expect(snapToWidgets({ x: 4, y: 9 }, start, [])).toEqual({ x: 4, y: 9 });
    });
});

describe('computeRulers', () => {
    const view = { left: 0, top: 0 };

    it('finds a line where two tops meet', () => {
        const rulers = computeRulers([box(0, 50, 100, 80)], [box(200, 50, 300, 90)], view);
        expect(rulers).toContainEqual({ type: 'horizontal', value: 50 });
    });

    it('finds a line where two left edges meet', () => {
        const rulers = computeRulers([box(40, 0, 100, 30)], [box(40, 200, 90, 260)], view);
        expect(rulers).toContainEqual({ type: 'vertical', value: 40 });
    });

    it('gives the lines relative to the view', () => {
        const rulers = computeRulers([box(0, 150, 100, 180)], [box(200, 150, 300, 190)], { left: 20, top: 100 });
        expect(rulers).toContainEqual({ type: 'horizontal', value: 50 });
    });

    it('finds nothing when no edges meet', () => {
        expect(computeRulers([box(0, 50, 100, 80)], [box(200, 300, 300, 340)], view)).toEqual([]);
    });

    it('finds nothing when nothing is selected', () => {
        expect(computeRulers([box(0, 50, 100, 80)], [], view)).toEqual([]);
    });

    it('also matches a bottom edge against a top edge', () => {
        // the bottom of the fixed widget is at 80, the top of the moving one too
        const rulers = computeRulers([box(0, 50, 100, 80)], [box(200, 80, 300, 120)], view);
        expect(rulers).toContainEqual({ type: 'horizontal', value: 80 });
    });
});

describe('computeRelativeOrder', () => {
    const order = ['w1', 'w2', 'w3'] as AnyWidgetId[];
    const boxes: Partial<Record<AnyWidgetId, Box>> = {
        w1: box(0, 0, 100, 50),
        w2: box(0, 50, 100, 100),
        w3: box(0, 100, 100, 150),
    };

    it('puts the widget before the one it is dropped on the upper half of', () => {
        expect(computeRelativeOrder(order, 'w3' as AnyWidgetId, boxes, 50, 60)).toEqual(['w1', 'w3', 'w2']);
    });

    it('puts it after the one it is dropped on the lower half of', () => {
        expect(computeRelativeOrder(order, 'w1' as AnyWidgetId, boxes, 50, 90)).toEqual(['w2', 'w1', 'w3']);
    });

    it('leaves the order alone when the cursor is over nothing', () => {
        expect(computeRelativeOrder(order, 'w1' as AnyWidgetId, boxes, 500, 500)).toEqual(order);
    });

    it('does not let a widget be dropped on itself', () => {
        // the cursor is over w1, which is the one being dragged, so nothing else is under it
        expect(computeRelativeOrder(order, 'w1' as AnyWidgetId, boxes, 50, 20)).toEqual(order);
    });

    it('leaves the order alone when a widget has no rectangle', () => {
        expect(computeRelativeOrder(order, 'w1' as AnyWidgetId, {}, 50, 60)).toEqual(order);
    });
});

describe('selectionRect', () => {
    it('takes a frame dragged to the right and down as it is', () => {
        expect(selectionRect({ x: 10, y: 20, w: 100, h: 50 })).toEqual({
            left: 10,
            top: 20,
            width: 100,
            height: 50,
        });
    });

    it('moves the corner when the frame is dragged up and to the left', () => {
        expect(selectionRect({ x: 100, y: 100, w: -40, h: -30 })).toEqual({
            left: 60,
            top: 70,
            width: 40,
            height: 30,
        });
    });

    it('copes with a frame that was not dragged at all', () => {
        expect(selectionRect({ x: 5, y: 5, w: 0, h: 0 })).toEqual({ left: 5, top: 5, width: 0, height: 0 });
    });
});
