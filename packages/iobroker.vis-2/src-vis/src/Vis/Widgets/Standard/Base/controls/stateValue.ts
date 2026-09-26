/**
 * The value of a state as a number, or null if it is none.
 *
 * `common.type` may say number while the adapter writes a string or a boolean into the state. The slider of MUI
 * calls `slice()` on whatever it is handed, so anything but a number kills the widget - and with it the whole
 * editor - with "valueDerived.slice is not a function". A string that reads as a number is taken, with a comma
 * as the decimal mark as well; everything else is no number.
 *
 * @param value - what the state holds at the moment
 */
export function asNumber(value: unknown): number | null {
    if (typeof value === 'number') {
        return isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = parseFloat(value.replace(',', '.'));
        return isFinite(parsed) ? parsed : null;
    }
    return null;
}

/**
 * The value of a state as text, for comparing it with what `common.states` says or for writing it out.
 *
 * A state holds a number, a string or a boolean. Anything else is an object, and an object put into a
 * template literal becomes `[object Object]` - which is never what anyone wanted and is what the rule
 * `no-base-to-string` is there to catch.
 *
 * @param value - what the state holds at the moment
 * @returns the value as text, or an empty string where there is nothing to write
 */
export function asText(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return isFinite(value) ? `${value}` : '';
    }
    if (typeof value === 'boolean') {
        return `${value}`;
    }
    return '';
}
