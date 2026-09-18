/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { WidgetData } from '@iobroker/types-vis-2';

/**
 * A widget can be shown only from a width of the view on, or only up to one - the same widget in two sizes, one
 * for the phone and one for the wall panel, or a detail that only fits on a wide screen. The widths are data
 * attributes of the widget, in the group of its visibility.
 */

/** The attribute: the widget is shown only if the view is at least this wide, in px */
export const VISIBILITY_MIN_WIDTH = 'visibility-min-width';

/** The attribute: the widget is shown only if the view is at most this wide, in px */
export const VISIBILITY_MAX_WIDTH = 'visibility-max-width';

/** A width in px as the attribute editor stores it - a number or a string of one - or null for none */
function toWidth(value: unknown): number | null {
    if (value === '' || value === null || value === undefined || typeof value === 'boolean') {
        return null;
    }
    const width = typeof value === 'number' ? value : parseFloat(value as string);
    return isFinite(width) && width > 0 ? width : null;
}

/**
 * Whether a widget is shown only at some widths of its view, so that the view has to know its width for it.
 *
 * @param data - the data of the widget
 */
export function hasWidthVisibility(data: WidgetData | undefined | null): boolean {
    return (
        !!data &&
        (toWidth((data as Record<string, unknown>)[VISIBILITY_MIN_WIDTH]) !== null ||
            toWidth((data as Record<string, unknown>)[VISIBILITY_MAX_WIDTH]) !== null)
    );
}

/**
 * Whether a widget is shown at this width of its view.
 *
 * A width that is not known yet - the view has not been measured - shows every widget, so nothing flickers away
 * before the first measurement.
 *
 * @param data - the data of the widget
 * @param width - the width of the view, in px
 */
export function isShownAtWidth(data: WidgetData | undefined | null, width: number): boolean {
    if (!data || !(width > 0)) {
        return true;
    }
    const min = toWidth((data as Record<string, unknown>)[VISIBILITY_MIN_WIDTH]);
    const max = toWidth((data as Record<string, unknown>)[VISIBILITY_MAX_WIDTH]);
    return (min === null || width >= min) && (max === null || width <= max);
}
