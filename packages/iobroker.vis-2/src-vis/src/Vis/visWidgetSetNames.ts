/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

/**
 * The names under which the widgets of a collection in `common.visWidgets` may name their set (`visSet` in
 * `getWidgetInfo()`, stored as `widgetSet` of every widget in the project).
 *
 * That was the name of the adapter only, so an adapter could bring one set: the widgets of a second one were never
 * loaded in the runtime and showed up as unknown (#691). The key and the name of the collection name a set as well
 * now, and the adapter still does, so the sets that rely on it go on working.
 *
 * @param adapter - the adapter that brings the collection, e.g. `vis-2-widgets-material`
 * @param key - the key of the collection in `common.visWidgets`
 * @param name - `name` of the collection, the federation remote
 * @returns the names, without duplicates
 */
export function getCollectionSetNames(adapter: string, key: string, name?: string): string[] {
    const names: string[] = [];
    for (const setName of [adapter, key, name]) {
        if (setName && !names.includes(setName)) {
            names.push(setName);
        }
    }
    return names;
}

/**
 * Whether a collection has to be loaded for the widget sets a project uses.
 *
 * @param names - the names of the collection, see {@link getCollectionSetNames}
 * @param onlyWidgetSets - the sets the project uses, or false to load every set (the editor)
 */
export function isCollectionUsed(names: string[], onlyWidgetSets?: false | string[]): boolean {
    return !onlyWidgetSets || names.some(name => onlyWidgetSets.includes(name));
}
