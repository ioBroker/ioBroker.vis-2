import type { VisStateCondition } from '@iobroker/types-vis-2';

import { STATE_CONDITIONS } from '@/Vis/visConditions';

/**
 * What the value of a condition on a state can be, read from the object of the state: the editor offers the
 * conditions and the input that fit it - true and false for a boolean, the list of a state with `common.states`,
 * a number with its unit and limits, or a text.
 */

export interface ConditionValueKind {
    kind: 'boolean' | 'states' | 'number' | 'string' | 'unknown';
    /** The values a state with `common.states` can have, with their names */
    states?: { value: string | number | boolean; label: string }[];
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
}

function toFiniteNumber(value: unknown): number | undefined {
    const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    return typeof number === 'number' && Number.isFinite(number) ? number : undefined;
}

/** A value of `common.states` in the type of the state: the keys of an object are always strings */
function typedValue(value: string, type: string | undefined): string | number | boolean {
    if (type === 'number') {
        const number = Number(value);
        return Number.isFinite(number) ? number : value;
    }
    if (type === 'boolean') {
        return value === 'true' || value === '1';
    }
    return value;
}

/** The entries of `common.states` - an object, an array, or the old text `0:off;1:on` */
function readStates(
    states: unknown,
    type: string | undefined,
): { value: string | number | boolean; label: string }[] | undefined {
    let entries: [string, unknown][] = [];
    if (typeof states === 'string') {
        entries = states
            .split(';')
            .map(part => part.split(':'))
            .filter(part => part.length >= 2)
            .map(([value, ...label]) => [value.trim(), label.join(':').trim()]);
    } else if (Array.isArray(states)) {
        entries = states.map((label, index) => [index.toString(), label]);
    } else if (states && typeof states === 'object') {
        entries = Object.entries(states as Record<string, unknown>);
    }
    const result = entries
        .filter(([, label]) => label !== null && label !== undefined && label !== '')
        .map(([value, label]) => ({
            value: typedValue(value, type),
            label: typeof label === 'object' ? JSON.stringify(label) : String(label as string | number | boolean),
        }));
    return result.length ? result : undefined;
}

/** What kind of value the state of this object has */
export function getConditionValueKind(object: ioBroker.Object | null | undefined): ConditionValueKind {
    if (!object || object.type !== 'state' || !object.common) {
        return { kind: 'unknown' };
    }
    const common = object.common as ioBroker.StateCommon;
    const type = common.type as string | undefined;
    const states = readStates(common.states, type);
    if (states && type !== 'boolean') {
        return { kind: 'states', states };
    }
    if (type === 'boolean') {
        return { kind: 'boolean' };
    }
    if (type === 'number') {
        return {
            kind: 'number',
            min: toFiniteNumber(common.min),
            max: toFiniteNumber(common.max),
            step: toFiniteNumber(common.step),
            unit: typeof common.unit === 'string' && common.unit ? common.unit : undefined,
        };
    }
    return { kind: 'string' };
}

/** The conditions that make sense for a kind of value */
export function getAllowedConditions(kind: ConditionValueKind['kind']): readonly VisStateCondition[] {
    switch (kind) {
        case 'boolean':
        case 'states':
            return ['==', '!='];
        case 'number':
            return ['==', '!=', '<', '<=', '>', '>=', 'exist', 'not exist'];
        case 'string':
            return ['==', '!=', 'consist', 'not consist', 'exist', 'not exist'];
        default:
            return STATE_CONDITIONS;
    }
}

/**
 * The conditions the editor offers: the ones that fit, and the stored one as well if it does not fit - it is what
 * the runtime uses, so the editor must not pretend it were another.
 */
export function getOfferedConditions(
    kind: ConditionValueKind['kind'],
    stored: VisStateCondition | null | undefined,
): VisStateCondition[] {
    const allowed = [...getAllowedConditions(kind)];
    if (stored && !allowed.includes(stored) && STATE_CONDITIONS.includes(stored)) {
        allowed.push(stored);
    }
    return allowed;
}

/**
 * What a typed input becomes as the value of the condition: a number for a number, and nothing for an empty
 * input, so that the section falls back to having no value to compare with
 */
export function parseConditionValue(input: string, kind: ConditionValueKind['kind']): string | number | null {
    if (input.trim() === '') {
        return null;
    }
    if (kind === 'number') {
        const number = Number(input);
        return Number.isFinite(number) ? number : input;
    }
    return input;
}
