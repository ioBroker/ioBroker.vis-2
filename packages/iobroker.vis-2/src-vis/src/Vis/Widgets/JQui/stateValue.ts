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
 * A value in the type of the state it is written to.
 *
 * The attributes of a widget are text, so a widget that writes the value of an attribute wrote "5" into a number
 * state and "true" into a boolean one (#439). A value that is not a number or a boolean in that sense stays as it is.
 *
 * @param value - the value to write
 * @param type - `common.type` of the state (`ioBroker.CommonType`), or null if it is not known
 * @returns the value to write
 */
export function toStateType(
    value: string | number | boolean | null,
    type: string | null | undefined,
): string | number | boolean | null {
    if (typeof value !== 'string') {
        return value;
    }
    if (type === 'number') {
        const num = value.trim() === '' ? NaN : Number(value);
        return Number.isNaN(num) ? value : num;
    }
    if (type === 'boolean') {
        if (value === 'true' || value === '1') {
            return true;
        }
        if (value === 'false' || value === '0') {
            return false;
        }
    }
    return value;
}
