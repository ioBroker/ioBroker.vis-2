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
 * The widget types that were placed last, so the palette can offer them again at the top.
 *
 * One builds a page out of a handful of types and reaches for the same ones over and over, while the palette
 * holds several hundred spread over a dozen sets. The list is kept in the local storage of the browser: it
 * says something about how this person works, not about the project, so it must not travel with the project
 * to another browser or another user.
 */

const STORAGE_KEY = 'paletteRecent';

/** How many are kept - three rows of the icon view */
const MAX_ENTRIES = 9;

const listeners: (() => void)[] = [];

/** The names of the widget types, the one used last in front */
export function getRecentWidgets(): string[] {
    try {
        const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(stored) ? stored.filter(name => typeof name === 'string').slice(0, MAX_ENTRIES) : [];
    } catch {
        // whatever is in there is not a list of ours
        return [];
    }
}

/**
 * Note that a widget of this type was placed.
 *
 * @param widgetType - the `tpl` of the widget, e.g. `tplBulbOnOffCtrl`
 */
export function rememberWidget(widgetType: string): void {
    // a group is not something one picks from the palette
    if (!widgetType || widgetType === '_tplGroup') {
        return;
    }

    const recent = [widgetType, ...getRecentWidgets().filter(name => name !== widgetType)].slice(0, MAX_ENTRIES);

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch {
        // a browser that does not let us store it just does not offer the list
        return;
    }

    listeners.forEach(listener => listener());
}

/**
 * Be told when the list changes - the palette is not the one that adds the widgets, so it cannot see it
 * coming.
 *
 * @param listener - what to call when the list has changed
 * @returns how to stop listening again
 */
export function onRecentWidgetsChanged(listener: () => void): () => void {
    listeners.push(listener);

    return () => {
        const pos = listeners.indexOf(listener);
        if (pos !== -1) {
            listeners.splice(pos, 1);
        }
    };
}
