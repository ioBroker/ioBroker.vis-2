import { describe, expect, it } from 'vitest';
import type { Collision, CollisionDetection } from '@dnd-kit/core';

import { canAutoScrollDuringDrop, pointerInViewPane } from './viewDrop';

type DetectionArgs = Parameters<CollisionDetection>[0];

const PANE = { left: 292, right: 1140, top: 122, bottom: 783 } as DOMRect;

function detect(
    pointerCoordinates: { x: number; y: number } | null,
    data: unknown = { getPaneRect: () => PANE },
): Collision[] {
    return pointerInViewPane({
        pointerCoordinates,
        droppableContainers: [{ id: 'view', data: { current: data } }],
    } as unknown as DetectionArgs);
}

describe('pointerInViewPane', () => {
    it('finds the view while the pointer is in the pane', () => {
        expect(detect({ x: 820, y: 480 })).toEqual([{ id: 'view' }]);
    });

    it('does not ask for the rectangle of the droppable, which scrolls away with a tall view', () => {
        // the droppable of a view scrolled by 700 pixels: it ends above the point the widget is dropped on
        const scrolledAway = { left: 292, right: 1140, top: -599, bottom: 70 };
        const collisions = pointerInViewPane({
            pointerCoordinates: { x: 820, y: 480 },
            collisionRect: { ...scrolledAway, width: 848, height: 669 },
            droppableRects: new Map([['view', { ...scrolledAway, width: 848, height: 669 }]]),
            droppableContainers: [{ id: 'view', data: { current: { getPaneRect: () => PANE } } }],
        } as unknown as DetectionArgs);

        expect(collisions).toEqual([{ id: 'view' }]);
    });

    it('finds nothing while the pointer is outside the pane', () => {
        expect(detect({ x: 100, y: 480 })).toEqual([]);
        expect(detect({ x: 820, y: 50 })).toEqual([]);
    });

    it('finds nothing without a pointer or without a pane', () => {
        expect(detect(null)).toEqual([]);
        expect(detect({ x: 820, y: 480 }, { getPaneRect: () => undefined })).toEqual([]);
        expect(detect({ x: 820, y: 480 }, null)).toEqual([]);
    });
});

describe('canAutoScrollDuringDrop', () => {
    const element = (holdsView: boolean): Element =>
        ({
            querySelector: (selector: string) => (holdsView && selector === '#vis-react-container' ? {} : null),
        }) as Element;

    it('lets the pane of the view scroll, but not the palette', () => {
        expect(canAutoScrollDuringDrop(element(true))).toBe(true);
        expect(canAutoScrollDuringDrop(element(false))).toBe(false);
    });
});
