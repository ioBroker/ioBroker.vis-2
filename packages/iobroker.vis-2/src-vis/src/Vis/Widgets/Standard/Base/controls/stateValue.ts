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

/**
 * What a state says it may be: every value it names, and the word for it.
 *
 * `common.states` comes in three shapes - a map, a list, and the old string `0:off;1:on` - and a widget that
 * knows only the first one shows a number where the adapter gave a word. All three are read here, so a
 * dropdown and a reading of the same state always say the same thing.
 *
 * @param common - what the object says about the state
 */
export function statesOf(common: ioBroker.StateCommon | null | undefined): { value: string; label: string }[] {
    const states = common?.states;
    if (!states) {
        return [];
    }
    if (Array.isArray(states)) {
        return states.map((label, index) => ({ value: `${index}`, label: `${label}` }));
    }
    if (typeof states === 'string') {
        return `${states}`
            .split(';')
            .map(pair => pair.split(':'))
            .filter(pair => pair.length === 2)
            .map(([value, label]) => ({ value: value.trim(), label: label.trim() }));
    }

    return Object.entries(states).map(([value, label]) => ({ value, label: `${label}` }));
}

/**
 * The value a state is written with, out of the text a dropdown or an input field hands back.
 *
 * A field gives back a string, and a state that says it is a number wants a number - `'1'` written into a
 * boolean state is a string that happens to look like one, and adapters tell the difference.
 *
 * @param value - what was chosen or typed
 * @param common - what the object says about the state
 */
export function typedValue(value: string, common: ioBroker.StateCommon | null | undefined): string | number | boolean {
    if (common?.type === 'number') {
        return asNumber(value) ?? 0;
    }
    if (common?.type === 'boolean') {
        return value === 'true' || value === '1' || value === 'on';
    }

    return value;
}
