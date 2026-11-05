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
import { isWebComponentType } from '@/Vis/WebComponents/webComponentSettings';

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

/**
 * The web components the palette leaves out because their adapter brings a vis-2 widget of the same name - like
 * the "Flow diagram" of flow, which is both. The native widget wins: it is made for vis-2. Widgets of the component
 * already placed are shown and edited as before.
 *
 * The same adapter means the same widget set, the same name is the name the palette shows, in the language of
 * the editor and without regard to case.
 *
 * @param types - the widget types the palette would show, each with the name it shows it under
 * @returns the names of the widget types of the web components to leave out
 */
export function getWebComponentsWithNativeWidget(
    types: readonly { name: string; set?: string; title: string }[],
): Set<string> {
    const key = (set: string | undefined, title: string): string => `${set || ''}
${title.trim().toLowerCase()}`;
    const native = new Set(
        types.filter(type => !isWebComponentType(type.name) && type.title.trim()).map(t => key(t.set, t.title)),
    );
    return new Set(
        types
            .filter(type => isWebComponentType(type.name) && native.has(key(type.set, type.title)))
            .map(type => type.name),
    );
}
