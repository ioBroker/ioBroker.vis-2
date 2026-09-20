import type { VisStateCondition } from '@iobroker/types-vis-2';

/**
 * The conditions on the value of a state that show or hide something: the visibility of a widget since vis-1,
 * and the visibility and the opening of a section of the grid layout. Both use this one implementation, so that a
 * condition means the same everywhere.
 */

/** The conditions a value can be compared with; the two that need no value to compare with come last */
export const STATE_CONDITIONS: readonly VisStateCondition[] = [
    '==',
    '!=',
    '<=',
    '>=',
    '<',
    '>',
    'consist',
    'not consist',
    'exist',
    'not exist',
];

/** These compare nothing - they only ask whether the state has a value */
export function conditionNeedsValue(condition: VisStateCondition | null | undefined): boolean {
    return condition !== 'exist' && condition !== 'not exist';
}

/**
 * Whether something that is shown only under a condition is hidden. Take care: true means hidden!
 * This is the logic of `VisBaseWidget.isWidgetHidden()`, moved here unchanged.
 *
 * @param states the values of the states, by `<id>.val`
 * @param oid the state; without one nothing is hidden, except by `not exist`
 * @param condition how the value is compared
 * @param compareWith what the value of the state is compared with
 * @param id who asks, only for the log
 */
export function isHiddenByCondition(
    states: Record<string, any>,
    oid: string | null | undefined,
    condition: string | null | undefined,
    compareWith: any,
    id: string,
): boolean {
    if (oid) {
        if (!Object.keys(states).includes(`${oid}.val`)) {
            // if we don't have state information yet - hide to prevent shortly showing widget during render
            return true;
        }

        let val = states[`${oid}.val`];
        let value = compareWith;

        if (val == null) {
            // the user compares explicitly against null => use the "null" placeholder in the comparison below.
            // 'exist'/'not exist' must not depend on the comparison value, so they keep the early return.
            if (value !== 'null' || condition === 'exist' || condition === 'not exist') {
                return condition === 'not exist';
            }
            val = 'null';
        }

        if (!condition || value == null) {
            return condition === 'not exist';
        }

        if (val === 'null' && condition !== 'exist' && condition !== 'not exist' && value !== 'null') {
            return false;
        }

        const t = typeof val;
        if (t === 'boolean' || val === 'false' || val === 'true') {
            value = value === 'true' || value === true || value === 1 || value === '1';
        } else if (t === 'number') {
            value = parseFloat(value);
        } else if (t === 'object') {
            val = JSON.stringify(val);
        }

        // Take care: return true if the widget is hidden!
        switch (condition) {
            case '==':
                value = value.toString();
                val = val.toString();
                if (val === '1') {
                    val = 'true';
                }
                if (value === '1') {
                    value = 'true';
                }
                if (val === '0') {
                    val = 'false';
                }
                if (value === '0') {
                    value = 'false';
                }
                return value !== val;
            case '!=':
                value = value.toString();
                val = val.toString();
                if (val === '1') {
                    val = 'true';
                }
                if (value === '1') {
                    value = 'true';
                }
                if (val === '0') {
                    val = 'false';
                }
                if (value === '0') {
                    value = 'false';
                }
                return value === val;
            case '>=':
                return val < value;
            case '<=':
                return val > value;
            case '>':
                return val <= value;
            case '<':
                return val >= value;
            case 'consist':
                value = value.toString();
                val = val.toString();
                return !val.toString().includes(value);
            case 'not consist':
                value = value.toString();
                val = val.toString();
                return val.toString().includes(value);
            case 'exist':
                return val === 'null';
            case 'not exist':
                return val !== 'null';
            default:
                console.log(`[${id}] Unknown visibility condition: ${condition}`);
                return false;
        }
    }

    return !!condition && condition === 'not exist';
}

/**
 * Whether the condition is fulfilled - the opposite of isHiddenByCondition(), for what is shown or opened by it.
 * Without a state there is no condition, and it counts as fulfilled.
 */
export function isConditionMet(
    states: Record<string, any>,
    oid: string | null | undefined,
    condition: string | null | undefined,
    compareWith: any,
    id: string,
): boolean {
    return !isHiddenByCondition(states, oid, condition, compareWith, id);
}
