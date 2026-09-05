/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { AnyWidgetId } from '@iobroker/types-vis-2';

/**
 * What a gesture in the editor works out, without touching the DOM or the store.
 *
 * `visView` listens to the mouse, reads the rectangles and writes the result; the decisions it makes on the
 * way are here. That split is what makes them checkable: every function takes numbers and gives numbers back,
 * so a case can be written down instead of being reproduced with a mouse.
 */

/** A rectangle as `getBoundingClientRect()` hands it over - only the parts these functions read */
export interface Box {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** How far apart two edges may be and still snap together, in pixels */
export const SNAP_TOLERANCE = 10;

/** How far apart two edges may be and still be called aligned, in pixels */
export const RULER_TOLERANCE = 0.3;

/**
 * Move a gesture onto the grid.
 *
 * The grid is measured from the corner of the view, not from where the widget happens to sit, so what is
 * corrected is the position the widget would land on.
 *
 * @param movement - how far the mouse has come
 * @param start - where the widget started, in client coordinates
 * @param view - the rectangle of the view, to measure the grid from
 * @param gridSize - the spacing of the grid; anything falsy means 10
 * @returns the movement, moved onto the grid
 */
export function snapToGrid(
    movement: { x: number; y: number },
    start: { left: number; top: number },
    view: { left: number; top: number },
    gridSize: number,
): { x: number; y: number } {
    const size = gridSize || 10;
    return {
        x: movement.x - Math.ceil((start.left - view.left + movement.x) % size),
        y: movement.y - Math.ceil((start.top - view.top + movement.y) % size),
    };
}

/**
 * Move a gesture onto the edge of another widget.
 *
 * The first widget that is near enough wins and ends the search, and only one axis is corrected - the edges
 * are checked bottom, top, right, left in that order. Two widgets only snap when they also overlap on the
 * other axis, so a widget far off to the side does not pull.
 *
 * @param movement - how far the mouse has come
 * @param start - the rectangle the widget started from, in client coordinates
 * @param others - the widgets to snap to; the dragged ones are not among them
 * @param tolerance - how close the edges have to be
 * @returns the movement, moved onto the nearest edge
 */
export function snapToWidgets(
    movement: { x: number; y: number },
    start: Box,
    others: Box[],
    tolerance: number = SNAP_TOLERANCE,
): { x: number; y: number } {
    const left = start.left + movement.x;
    const right = start.right + movement.x;
    const top = start.top + movement.y;
    const bottom = start.bottom + movement.y;

    for (const other of others) {
        const overlapsHorizontally = left <= other.right && right >= other.left;
        const overlapsVertically = top <= other.bottom && bottom >= other.top;

        if (Math.abs(other.top - bottom) <= tolerance && overlapsHorizontally) {
            return { x: movement.x, y: movement.y + Math.round(other.top - bottom) };
        }
        if (Math.abs(other.bottom - top) <= tolerance && overlapsHorizontally) {
            return { x: movement.x, y: movement.y + Math.round(other.bottom - top) };
        }
        if (Math.abs(other.left - right) <= tolerance && overlapsVertically) {
            return { x: movement.x + Math.round(other.left - right), y: movement.y };
        }
        if (Math.abs(other.right - left) <= tolerance && overlapsVertically) {
            return { x: movement.x + Math.round(other.right - left), y: movement.y };
        }
    }

    return movement;
}

/**
 * The lines that show which edges of the dragged widgets line up with which edges of the others.
 *
 * @param others - the widgets that are not being dragged
 * @param selected - the widgets that are
 * @param view - the rectangle of the view; the lines are given relative to it
 * @param tolerance - how close two edges have to be to count as aligned
 * @returns one entry per pair of edges that line up
 */
export function computeRulers(
    others: Box[],
    selected: Box[],
    view: { left: number; top: number },
    tolerance: number = RULER_TOLERANCE,
): { type: 'horizontal' | 'vertical'; value: number }[] {
    const rulers: { type: 'horizontal' | 'vertical'; value: number }[] = [];

    const edgesOf = (boxes: Box[]): { horizontal: number[]; vertical: number[] } => ({
        horizontal: boxes.flatMap(box => [Math.round(box.top), Math.round(box.bottom)]),
        vertical: boxes.flatMap(box => [Math.round(box.left), Math.round(box.right)]),
    });

    const fixed = edgesOf(others);
    const moving = edgesOf(selected);

    for (const horizontal of fixed.horizontal) {
        for (const selectedHorizontal of moving.horizontal) {
            if (Math.abs(horizontal - selectedHorizontal) <= tolerance) {
                rulers.push({ type: 'horizontal', value: horizontal - view.top });
            }
        }
    }
    for (const vertical of fixed.vertical) {
        for (const selectedVertical of moving.vertical) {
            if (Math.abs(vertical - selectedVertical) <= tolerance) {
                rulers.push({ type: 'vertical', value: vertical - view.left });
            }
        }
    }

    return rulers;
}

/**
 * Where a relative widget lands while it is dragged over the others.
 *
 * The widgets are stacked, so the vertical half of the widget under the cursor decides whether the dragged one
 * goes before or after it. The cursor being over nothing leaves the order as it is.
 *
 * @param order - the order the gesture started from
 * @param dragged - the widget under the cursor
 * @param boxes - the rectangle of each widget of the order, by id
 * @param x - the cursor, in client coordinates
 * @param y - the cursor, in client coordinates
 * @returns the new order, or the old one when the cursor is over no widget
 */
export function computeRelativeOrder(
    order: AnyWidgetId[],
    dragged: AnyWidgetId,
    boxes: Partial<Record<AnyWidgetId, Box>>,
    x: number,
    y: number,
): AnyWidgetId[] {
    let target: AnyWidgetId | null = null;
    let after = false;

    for (const wid of order) {
        if (wid === dragged) {
            continue;
        }
        const box = boxes[wid];
        if (box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
            target = wid;
            after = y > box.top + (box.bottom - box.top) / 2;
            break;
        }
    }

    if (!target) {
        return order;
    }

    const next = [...order];
    next.splice(next.indexOf(dragged), 1);
    const targetPosition = next.indexOf(target);
    next.splice(after ? targetPosition + 1 : targetPosition, 0, dragged);

    return next;
}

/**
 * The rectangle of the selection frame, from a corner and a size that may be negative.
 *
 * Dragging up or to the left gives a negative width or height; CSS wants a positive size and a moved corner.
 *
 * @param movement - the corner the drag started at and how far it has come
 * @returns left, top, width and height, all of them positive
 */
export function selectionRect(movement: { x: number; y: number; w: number; h: number }): {
    left: number;
    top: number;
    width: number;
    height: number;
} {
    return {
        left: movement.w >= 0 ? movement.x : movement.x + movement.w,
        top: movement.h >= 0 ? movement.y : movement.y + movement.h,
        width: Math.abs(movement.w),
        height: Math.abs(movement.h),
    };
}
