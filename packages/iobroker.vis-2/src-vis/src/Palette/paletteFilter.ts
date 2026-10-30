/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { WidgetType } from '@/Vis/visWidgetsCatalog';

/** Where the palette keeps "Hide vis-1 widgets", per browser like the other palette settings */
export const ONLY_VIS2_KEY = 'paletteOnlyVis2';

/**
 * Whether the palette leaves a widget type out: one that hides itself, and with "Hide vis-1 widgets" every
 * vis-1 widget - those are kept for old projects and drawn by can.js, and a user without such projects only looks
 * past them (#504). Widgets already placed are shown and edited as before.
 *
 * @param type - the widget type
 * @param onlyVis2 - whether "Hide vis-1 widgets" is on
 */
export function isHiddenInPalette(type: Pick<WidgetType, 'hidden' | 'rx'>, onlyVis2: boolean): boolean {
    return !!type.hidden || (onlyVis2 && !type.rx);
}
