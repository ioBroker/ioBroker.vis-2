import type { VisCanWidgetStateValues, VisRxWidgetStateValues } from '@iobroker/types-vis-2';

/**
 * The state values the engine keeps for every subscribed ID - `vis.states` for a vis-1 widget,
 * `context.canStates` for a vis-2 one.
 *
 * For a vis-1 widget this has to be a real `can.Map`: its template reads `states.attr('id.val')` while it
 * renders and can.js re-renders it on its own once that value changes. can.js is only fetched when such a
 * widget really shows up though (see `visLoadLegacy`), while the engine builds the store in its constructor
 * and writes into it from the first subscription on. So until the library is there the same
 * `attr`/`removeAttr` surface is served from a plain object, and `upgradeStateValues` moves everything
 * collected so far into a real `can.Map` the moment can.js arrives - before any vis-1 widget set runs, since
 * the engine registers for the load ahead of everybody else.
 *
 * vis-2 widgets never observe this store - they are told about a change through `linkContext` and
 * `onChangeCallbacks` - so nothing is lost while the plain object stands in.
 */

/** What the store is created with. A vis-1 widget without an `oid` binds against it and reads "no state". */
const NOTHING_SELECTED = 'nothing_selected.val';

/**
 * Build the store the engine hands to the widgets: a `can.Map` if can.js is already loaded, a plain
 * stand-in with the same `attr`/`removeAttr` surface if it is not.
 */
export function createStateValues(): VisCanWidgetStateValues {
    if (window.can) {
        return new window.can.Map({ [NOTHING_SELECTED]: null }) as VisCanWidgetStateValues;
    }

    const values: Record<string, any> = {};
    /** The values under the flat, dotted keys can.js keeps them under, e.g. `javascript.0.state.val` */
    const data: Record<string, any> = {};

    // One deliberate difference to can.Map: `attr('id.val', value)` writes the flat key here, while can.js
    // reads the dot as a path into a nested map and throws if there is none. The engine means the flat key
    // everywhere, so the stand-in is the forgiving one - it never turns a write into an exception.

    // can.Map writes every attribute onto the map itself as well, and the engine reads `canStates['id.val']`
    // directly in `createCanState`, so the stand-in has to mirror them the same way.
    const set = (id: string, value: any): void => {
        data[id] = value;
        values[id] = value;
    };

    values.attr = (id?: string | VisRxWidgetStateValues, ...value: any[]): any => {
        if (id === undefined) {
            // read everything
            return { ...data };
        }
        if (typeof id === 'object') {
            // write many at once
            Object.keys(id).forEach(key => set(key, (id as Record<string, any>)[key]));
            return values;
        }
        if (!value.length) {
            // read one - `attr(id, undefined)` is a write, so the argument count decides, not the value
            return data[id];
        }
        set(id, value[0]);
        return values;
    };

    values.removeAttr = (id: string): void => {
        delete data[id];
        delete values[id];
    };

    set(NOTHING_SELECTED, null);

    return values as unknown as VisCanWidgetStateValues;
}

/**
 * Turn the stand-in into the real `can.Map` once can.js is loaded, carrying the collected values over.
 *
 * Returns the store unchanged if there is nothing to do - can.js still missing, or the engine got a real
 * `can.Map` from `createStateValues` in the first place.
 *
 * @param values the store built by `createStateValues`
 */
export function upgradeStateValues(values: VisCanWidgetStateValues): VisCanWidgetStateValues {
    if (!window.can || values instanceof window.can.Map) {
        return values;
    }

    // `attr()` without arguments hands out everything collected so far, flat, the way can.Map stores it
    const collected = (values.attr as () => Record<string, any>)();
    const map = new window.can.Map({ [NOTHING_SELECTED]: null }) as VisCanWidgetStateValues;
    map.attr(collected);

    return map;
}
