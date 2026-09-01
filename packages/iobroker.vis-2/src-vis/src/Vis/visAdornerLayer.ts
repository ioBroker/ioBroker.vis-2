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
