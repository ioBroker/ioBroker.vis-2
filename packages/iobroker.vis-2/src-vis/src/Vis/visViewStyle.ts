/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { CSSProperties } from 'react';

import type { ViewSettings } from '@iobroker/types-vis-2';

import { getBindingStateIds } from './visSections';

/** The CSS of a view, as it is set in "CSS background" and the other CSS groups of the view */
type ViewStyle = ViewSettings['style'];

/** The attributes of the CSS of a view that carry a binding, like `{a:javascript.0.alarm;a ? 'red' : 'green'}` */
function bindingEntries(style: ViewStyle): [string, string][] {
    return Object.entries(style || {}).filter(([, value]) => typeof value === 'string' && value.includes('{')) as [
        string,
        string,
    ][];
}

/** The states the CSS of a view has to listen to (#19) */
export function getViewStyleStateIds(style: ViewStyle): string[] {
    const ids: string[] = [];
    bindingEntries(style).forEach(([, value]) =>
        getBindingStateIds(value).forEach(id => !ids.includes(id) && ids.push(id)),
    );
    return ids;
}

/**
 * The CSS of a view with its bindings applied: every attribute that carries one is replaced by what it says at
 * this moment, so `background-color` can follow a state (#19). Without a binding, the style is returned as it is.
 *
 * @param style - the CSS of the view as it is stored
 * @param format - evaluates one text, see VisView.formatViewText()
 */
export function applyViewStyleBindings(style: ViewStyle, format: (text: string) => string): ViewStyle {
    const entries = bindingEntries(style);
    if (!entries.length) {
        return style;
    }
    const result: Record<string, unknown> = { ...style };
    entries.forEach(([attr, value]) => (result[attr] = format(value)));
    return result;
}

/**
 * The background color a view gets when it sets no background itself: the one of the widget that shows the view,
 * else the one of the theme. A view with a background class gets none - an inline color covers the color of the
 * class, and the transparent parts of "Carbon fibre" turned white in a light theme (#511).
 *
 * @param style - the CSS of the view, with camelCase names
 * @param backgroundClass - the background class of the view, as it is applied
 * @param customSettings - the colors of the widget that shows the view, if any
 * @param themeMode - the mode of the theme the view is shown in
 * @returns the color, or null if the view brings its own background
 */
export function defaultViewBackgroundColor(
    style: Pick<CSSProperties, 'backgroundColor' | 'background'>,
    backgroundClass: string,
    customSettings: { backgroundColor?: string; themeType?: string } | undefined,
    themeMode: 'light' | 'dark',
): string | null {
    if (style.backgroundColor || style.background || backgroundClass.trim()) {
        return null;
    }
    if (customSettings?.backgroundColor) {
        return customSettings.backgroundColor;
    }
    return customSettings?.themeType === 'dark' || themeMode === 'dark' ? '#000' : '#fff';
}
