/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

/**
 * Where the editor draws the marks of a widget.
 *
 * The name plate sits above a widget and the eight resize handles are drawn a tenth of an em outside it, so all
 * of them leave the box of the widget they belong to. Drawn as children of the widget they depend on everything
 * that box does: `overflow` cuts them off, and because a positioned widget opens its own stacking context, their
 * `z-index` only counts INSIDE it - a neighbour that comes later in the document covers them, and a click meant
 * for a handle selects that neighbour instead.
 *
 * So they are drawn in one layer per view instead, above every widget, which is what a design tool does with its
 * selection marks. `VisView` renders the layer and registers it here; `VisBaseWidget` looks it up by view name
 * and renders its marks into it through a portal. A module of the host holds the map on purpose: a widget set
 * brings its own props, but it extends the `VisRxWidget` OF VIS-2, so this module is the same object for
 * everyone and no new entry in the published `@iobroker/types-vis-2` contract is needed.
 */
const layers: Record<string, HTMLDivElement> = {};

/**
 * Announce the layer of a view, or take it back when the view unmounts.
 *
 * @param view - name of the view
 * @param element - the layer, or null when the view goes away
 */
export function registerAdornerLayer(view: string, element: HTMLDivElement | null): void {
    if (element) {
        layers[view] = element;
    } else {
        delete layers[view];
    }
}

/**
 * The layer a widget of this view has to draw its marks into.
 *
 * @param view - name of the view
 * @returns the layer, or null while the view has not rendered yet
 */
export function getAdornerLayer(view: string): HTMLDivElement | null {
    return layers[view] || null;
}

/** The box of a widget in the coordinates of the layer of its view */
export interface MarksRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** A widget that draws marks into a layer */
export interface MarksClient {
    /** Name of the view this widget belongs to */
    marksView(): string;
    /** Read the DOM: where the marks of this widget have to sit, or null if it has none right now */
    measureMarks(layerBox: DOMRect): MarksRect | null;
    /** Write the result to the DOM */
    applyMarks(rect: MarksRect | null): void;
}

const pending = new Set<MarksClient>();
let flushScheduled = false;

/**
 * Put the marks of a widget onto it, together with those of every other widget that asked in the same turn.
 *
 * Reading the position of an element after the DOM was written forces the browser to lay the page out again.
 * Doing that per widget - measure one, write one, measure the next - makes it lay out once PER WIDGET, which is
 * what made dragging a relative widget stutter: such a drag moves the whole flow, so nearly every widget of the
 * view has new marks at the same moment.
 *
 * So the work is collected and split in two: first every measurement, then every write. The browser then lays
 * out once for the whole view instead of once per widget. The flush runs as a microtask, which is still before
 * the browser paints, so the marks are on the widget in the same frame and nothing lags behind.
 */
export function scheduleMarksUpdate(client: MarksClient): void {
    pending.add(client);
    if (flushScheduled) {
        return;
    }
    flushScheduled = true;
    queueMicrotask(flushMarks);
}

/** A widget that goes away must not be measured any more */
export function cancelMarksUpdate(client: MarksClient): void {
    pending.delete(client);
}

function flushMarks(): void {
    flushScheduled = false;
    const clients = [...pending];
    pending.clear();

    // read everything ...
    const layerBoxes: Record<string, DOMRect | null> = {};
    const rects = clients.map(client => {
        const view = client.marksView();
        if (!(view in layerBoxes)) {
            const layer = layers[view];
            layerBoxes[view] = layer ? layer.getBoundingClientRect() : null;
        }
        const layerBox = layerBoxes[view];
        return layerBox ? client.measureMarks(layerBox) : null;
    });

    // ... and only then write, so that no write can invalidate the next measurement
    clients.forEach((client, index) => client.applyMarks(rects[index]));
}
