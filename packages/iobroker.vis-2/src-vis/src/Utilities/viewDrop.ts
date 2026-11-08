import type { CollisionDetection } from '@dnd-kit/core';

/** What `ViewDrop` puts on its droppable, so that the drop handler can work out where the pointer was */
export interface ViewDropData {
    kind: 'view';
    getRect: () => DOMRect | undefined;
    /** The pane the view scrolls in: unlike the droppable it stays where it is on the screen */
    getPaneRect: () => DOMRect | undefined;
}

/**
 * The view is the target while the pointer is in its pane.
 *
 * dnd-kit by default compares the rectangle of the droppable with the dragged preview. The droppable sits inside
 * the pane, one pane high, and scrolls away with the content - in a view taller than the pane nothing could be
 * dropped any more once it was scrolled down by about one pane. The section under the cursor was still marked,
 * as that follows the pointer, and letting go then did nothing.
 */
export const pointerInViewPane: CollisionDetection = ({ droppableContainers, pointerCoordinates }) => {
    if (!pointerCoordinates) {
        return [];
    }
    const { x, y } = pointerCoordinates;
    return droppableContainers
        .filter(container => {
            const pane = (container.data.current as ViewDropData | undefined)?.getPaneRect?.();
            return !!pane && x >= pane.left && x <= pane.right && y >= pane.top && y <= pane.bottom;
        })
        .map(container => ({ id: container.id }));
};

/**
 * While a widget is dragged only what contains the view may scroll by itself. Outside the view dnd-kit would
 * otherwise scroll the palette the widget came from, as soon as the pointer is level with the lower end of it.
 *
 * @param element - the scrollable element dnd-kit asks about
 */
export function canAutoScrollDuringDrop(element: Element): boolean {
    return !!element.querySelector('#vis-react-container');
}
