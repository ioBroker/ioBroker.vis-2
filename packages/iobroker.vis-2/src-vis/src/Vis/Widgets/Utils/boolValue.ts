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
 * Is this value "off"?
 *
 * The React side of `vis.binds.basic.isFalse`, which every `basic` widget that shows a state as on or off asked.
 * Kept to the letter, because which values count as off decides what a widget shows in existing projects:
 * `min`/`max` name the two values a state uses when they are not `false`/`true`, and without them everything
 * empty, zero or spelled "off" is off.
 *
 * @param value - the value of the state
 * @param min - the value that counts as off, if the state does not use `false`
 * @param max - the value that counts as on, if the state does not use `true`
 * @returns true if the value is to be shown as off
 */
export function isFalse(value: unknown, min?: string | number, max?: string | number): boolean {
    if (min !== undefined && min !== null && min !== '') {
        let val: unknown = value;
        if (val === 'true') {
            val = true;
        } else if (val === 'false') {
            val = false;
        }
        if (max !== undefined && max !== null && max !== '') {
            let maxValue: unknown = max;
            if (maxValue === 'false') {
                maxValue = false;
            } else if (maxValue === 'true') {
                maxValue = true;
            }

            return val != maxValue;
        }
        let minValue: unknown = min;
        if (minValue === 'false') {
            minValue = false;
        } else if (minValue === 'true') {
            minValue = true;
        }

        return val == minValue;
    }

    if (
        value === undefined ||
        value === null ||
        value === false ||
        value === 'false' ||
        value === 'FALSE' ||
        value === 'False' ||
        value === 'OFF' ||
        value === 'Off' ||
        value === 'off' ||
        value === ''
    ) {
        return true;
    }
    if (value === '0' || value === 0) {
        return true;
    }
    const f = parseFloat(value as string);
    if (f.toString() !== 'NaN') {
        return !f;
    }
    return false;
}
