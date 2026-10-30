/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

/** The attributes of one entry of the value list of "States control", besides its value and text */
const ENTRY_ATTRIBUTES = ['icon', 'image', 'color', 'activeColor', 'tooltip', 'onlyIcon'];

/** A value of the list as text; numbers and booleans come as they are, anything else as JSON */
function asText(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return value.toString();
    }
    return JSON.stringify(value);
}

/**
 * The value list of an object, `common.states`, as pairs of value and text in their order.
 *
 * `common.states` comes as an object `{ value: text }`, as an array whose index is the value, or in the old form as
 * text `"value:text;value:text"`.
 *
 * @param states - `common.states` of the object
 * @returns the pairs, empty if the object has no value list
 */
export function parseCommonStates(states: unknown): { value: string; text: string }[] {
    if (typeof states === 'string') {
        return states
            .split(';')
            .filter(pair => pair.trim())
            .map(pair => {
                const pos = pair.indexOf(':');
                return pos === -1
                    ? { value: pair.trim(), text: pair.trim() }
                    : { value: pair.substring(0, pos).trim(), text: pair.substring(pos + 1).trim() };
            });
    }
    if (Array.isArray(states)) {
        return states.map((text, index) => ({
            value: index.toString(),
            text: text == null ? index.toString() : asText(text),
        }));
    }
    if (states && typeof states === 'object') {
        return Object.entries(states as Record<string, unknown>).map(([value, text]) => ({
            value,
            text: text == null ? value : asText(text),
        }));
    }
    return [];
}

/**
 * The data of "States control" with its value list taken from the object of its ID (#482).
 *
 * The values and texts come from `common.states`, so the list follows the object without being generated again in
 * the editor. An entry that is defined in the widget with the same value keeps its icon, colors and tooltip.
 *
 * @param rxData - the data of the widget
 * @param states - `common.states` of the object of the widget
 * @returns the data to render with; the same object if the object has no value list
 */
export function applyStatesFromObject<T extends { count: number }>(rxData: T, states: unknown): T {
    const pairs = parseCommonStates(states);
    if (!pairs.length) {
        return rxData;
    }
    const data = rxData as unknown as Record<string, unknown>;
    const defined = new Map<string, number>();
    for (let i = 1; i <= (Number(rxData.count) || 0); i++) {
        const value = data[`value${i}`];
        if (value != null && !defined.has(asText(value))) {
            defined.set(asText(value), i);
        }
    }

    const result: Record<string, unknown> = { ...data };
    // the entries of the widget are replaced as a whole, so nothing of an entry at the same index stays behind
    for (let i = 1; i <= Math.max(Number(rxData.count) || 0, pairs.length); i++) {
        delete result[`value${i}`];
        delete result[`text${i}`];
        delete result[`test${i}`];
        ENTRY_ATTRIBUTES.forEach(attr => delete result[`${attr}${i}`]);
    }
    pairs.forEach(({ value, text }, index) => {
        const i = index + 1;
        const from = defined.get(value);
        result[`value${i}`] = value;
        result[`text${i}`] = text;
        if (from) {
            result[`test${i}`] = data[`test${from}`];
            ENTRY_ATTRIBUTES.forEach(attr => (result[`${attr}${i}`] = data[`${attr}${from}`]));
        }
    });
    result.count = pairs.length;
    return result as unknown as T;
}
