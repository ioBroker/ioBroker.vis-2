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
 * A value or a text as text: numbers and booleans as they are written, anything else as JSON
 *
 * @param value the value
 */
function asText(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return value.toString();
    }
    return JSON.stringify(value);
}

/**
 * A text of `common.states` in one language: a plain text, or a text per language
 *
 * @param text the text as the object has it
 * @param language the language of vis
 */
function getText(text: unknown, language: ioBroker.Languages): string | undefined {
    if (text == null) {
        return undefined;
    }
    if (typeof text === 'object' && !Array.isArray(text)) {
        const translated = text as Partial<Record<ioBroker.Languages, unknown>>;
        const value = translated[language] ?? translated.en ?? Object.values(translated)[0];
        return value == null ? undefined : asText(value);
    }
    return asText(text);
}

/**
 * The text of a value in the value list of an object, as the binding operation `states` shows it:
 * `{hm-rpc.0.ABC.STATE;states}` shows "Open" instead of 1.
 *
 * `common.states` comes as an object `{ value: text }`, as an array whose index is the value, or in the old form as
 * text `"value:text;value:text"`. Values are compared as texts, so the number 1, the text "1" and the key "1" are the
 * same value, and so are `true` and "true".
 *
 * @param states `common.states` of the object
 * @param value the value of the state
 * @param language the language of vis, for a text in several languages
 * @returns the text, or undefined if the list does not have the value
 */
export function getCommonStateText(states: unknown, value: unknown, language: ioBroker.Languages): string | undefined {
    if (value == null || states == null) {
        return undefined;
    }
    const key = asText(value);

    if (typeof states === 'string') {
        for (const pair of states.split(';')) {
            const pos = pair.indexOf(':');
            if (pos !== -1 && pair.substring(0, pos).trim() === key) {
                return pair.substring(pos + 1).trim();
            }
        }
        return undefined;
    }

    if (Array.isArray(states)) {
        // the index is the value: only a whole number in the list
        return /^\d+$/.test(key) ? getText(states[parseInt(key, 10)], language) : undefined;
    }

    if (typeof states === 'object') {
        const list = states as Record<string, unknown>;
        return Object.prototype.hasOwnProperty.call(list, key) ? getText(list[key], language) : undefined;
    }

    return undefined;
}
