import { describe, expect, it } from 'vitest';

import type { AnyWidgetId } from '@iobroker/types-vis-2';

import {
    type Box,
    AUTO_SCROLL_MAX_SPEED,
    autoScrollSpeed,
    computeRelativeOrder,
    computeRulers,
    droppedOrderIsDone,
    editorViewMinSize,
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
        expect(computeRelativeOrder(order, 'w3', boxes, 50, 60)).toEqual(['w1', 'w3', 'w2']);
    });

    it('puts it after the one it is dropped on the lower half of', () => {
        expect(computeRelativeOrder(order, 'w1', boxes, 50, 90)).toEqual(['w2', 'w1', 'w3']);
    });

    it('leaves the order alone when the cursor is over nothing', () => {
        expect(computeRelativeOrder(order, 'w1', boxes, 500, 500)).toEqual(order);
    });

    it('does not let a widget be dropped on itself', () => {
        // the cursor is over w1, which is the one being dragged, so nothing else is under it
        expect(computeRelativeOrder(order, 'w1', boxes, 50, 20)).toEqual(order);
    });

    it('leaves the order alone when a widget has no rectangle', () => {
        expect(computeRelativeOrder(order, 'w1', {}, 50, 60)).toEqual(order);
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

describe('droppedOrderIsDone', () => {
    const ids = (...names: string[]): AnyWidgetId[] => names as AnyWidgetId[];

    it('holds on while the project still has the widget where it started', () => {
        // dropped w3 from the end to the front; the project is still the old order
        expect(droppedOrderIsDone(ids('w1', 'w2', 'w3'), ids('w3', 'w1', 'w2'), 'w3')).toBe(false);
    });

    it('lets go once the dragged widget arrived where it was dropped', () => {
        expect(droppedOrderIsDone(ids('w3', 'w1', 'w2'), ids('w3', 'w1', 'w2'), 'w3')).toBe(true);
    });

    it('lets go even when the saved order differs in something the drag never touched', () => {
        // w3 landed in front as dropped; that w1 and w2 swapped meanwhile is not this gesture's business,
        // and holding on for an exact match would freeze the view on the dropped order for good
        expect(droppedOrderIsDone(ids('w3', 'w2', 'w1'), ids('w3', 'w1', 'w2'), 'w3')).toBe(true);
    });

    it('lets go when a widget was added meanwhile, which the dropped order does not know', () => {
        // rendering from an order without w4 would leave w4 out of the view entirely
        expect(droppedOrderIsDone(ids('w1', 'w2', 'w3', 'w4'), ids('w3', 'w1', 'w2'), 'w3')).toBe(true);
    });

    it('lets go when a widget was removed meanwhile', () => {
        expect(droppedOrderIsDone(ids('w1', 'w3'), ids('w3', 'w1', 'w2'), 'w3')).toBe(true);
    });

    it('lets go when the dragged widget itself is gone', () => {
        expect(droppedOrderIsDone(ids('w1', 'w2'), ids('w3', 'w1', 'w2'), 'w3')).toBe(true);
    });
});

describe('autoScrollSpeed', () => {
    // a pane of 800 x 600 at (100, 100); its zones are 40px wide
    const pane = box(100, 100, 900, 700);
    const max = AUTO_SCROLL_MAX_SPEED;

    it('does not scroll in the middle of the pane', () => {
        expect(autoScrollSpeed({ x: 500, y: 400 }, pane)).toEqual({ x: 0, y: 0 });
        expect(autoScrollSpeed({ x: 500, y: 140 }, pane)).toEqual({ x: 0, y: 0 });
    });

    it('scrolls up near the upper edge, the faster the closer', () => {
        const near = autoScrollSpeed({ x: 500, y: 130 }, pane).y;
        const closer = autoScrollSpeed({ x: 500, y: 110 }, pane).y;
        expect(near).toBeLessThan(0);
        expect(closer).toBeLessThan(near);
        expect(autoScrollSpeed({ x: 500, y: 100 }, pane).y).toBe(-max);
    });

    it('scrolls at full speed with the cursor beyond the edge, over the toolbar above the pane', () => {
        expect(autoScrollSpeed({ x: 500, y: 20 }, pane)).toEqual({ x: 0, y: -max });
    });

    it('scrolls down near the lower edge and sideways near the sides', () => {
        expect(autoScrollSpeed({ x: 500, y: 690 }, pane).y).toBeGreaterThan(0);
        expect(autoScrollSpeed({ x: 890, y: 400 }, pane).x).toBeGreaterThan(0);
        expect(autoScrollSpeed({ x: 105, y: 400 }, pane).x).toBeLessThan(0);
    });

    it('scrolls at least one pixel as soon as the cursor is in the zone', () => {
        expect(autoScrollSpeed({ x: 500, y: 139.9 }, pane).y).toBe(-1);
    });

    it('gives a small pane a smaller zone, so that its middle stays calm', () => {
        // a quarter of 100px is 25px instead of 40px
        const small = box(0, 0, 100, 100);
        expect(autoScrollSpeed({ x: 50, y: 50 }, small)).toEqual({ x: 0, y: 0 });
        expect(autoScrollSpeed({ x: 50, y: 30 }, small).y).toBe(0);
        expect(autoScrollSpeed({ x: 50, y: 10 }, small).y).toBeLessThan(0);
    });

    it('does not scroll a pane without size', () => {
        expect(autoScrollSpeed({ x: 0, y: 0 }, box(0, 0, 0, 0))).toEqual({ x: 0, y: 0 });
    });
});

// #560: the view in the editor is at least as big as its screen, so its background covers what is scrolled to
describe('editorViewMinSize', () => {
    it('takes the screen size, but never less than the pane', () => {
        expect(editorViewMinSize(2400, 1600)).toEqual({
            minWidth: 'max(100%, 2400px)',
            minHeight: 'max(100%, 1600px)',
        });
    });

    it('reads the size as the attributes store it', () => {
        expect(editorViewMinSize('1440', '900')).toEqual({
            minWidth: 'max(100%, 1440px)',
            minHeight: 'max(100%, 900px)',
        });
        expect(editorViewMinSize('1440.5', undefined)).toEqual({ minWidth: 'max(100%, 1440.5px)' });
    });

    it('sets nothing for a size that is not set or not a size', () => {
        expect(editorViewMinSize(undefined, undefined)).toEqual({});
        expect(editorViewMinSize('', null)).toEqual({});
        expect(editorViewMinSize(0, 0)).toEqual({});
        expect(editorViewMinSize(-100, 'abc')).toEqual({});
        expect(editorViewMinSize(Infinity, NaN)).toEqual({});
    });
});
