import { describe, expect, it } from 'vitest';

import {
    getAllowedConditions,
    getConditionValueKind,
    getOfferedConditions,
    parseConditionValue,
} from './conditionValue';

const state = (common: Record<string, unknown>): ioBroker.Object =>
    ({ _id: 'a.0.x', type: 'state', common, native: {} }) as unknown as ioBroker.Object;

describe('getConditionValueKind', () => {
    it('knows nothing without the object of a state', () => {
        expect(getConditionValueKind(null).kind).toBe('unknown');
        expect(getConditionValueKind({ type: 'channel', common: {} } as unknown as ioBroker.Object).kind).toBe(
            'unknown',
        );
    });

    it('takes a boolean as true or false', () => {
        expect(getConditionValueKind(state({ type: 'boolean', states: { true: 'on', false: 'off' } }))).toEqual({
            kind: 'boolean',
        });
    });

    it('offers the values of common.states in the type of the state, however they are written', () => {
        expect(getConditionValueKind(state({ type: 'number', states: { 0: 'off', 1: 'on' } }))).toEqual({
            kind: 'states',
            states: [
                { value: 0, label: 'off' },
                { value: 1, label: 'on' },
            ],
        });
        expect(getConditionValueKind(state({ type: 'string', states: 'a:Auto;m:Manual' })).states).toEqual([
            { value: 'a', label: 'Auto' },
            { value: 'm', label: 'Manual' },
        ]);
        expect(getConditionValueKind(state({ type: 'number', states: ['off', 'on'] })).states?.[1]).toEqual({
            value: 1,
            label: 'on',
        });
    });

    it('takes the limits and the unit of a number', () => {
        expect(getConditionValueKind(state({ type: 'number', min: 0, max: '100', unit: '%' }))).toEqual({
            kind: 'number',
            min: 0,
            max: 100,
            step: undefined,
            unit: '%',
        });
    });

    it('takes everything else as a text', () => {
        expect(getConditionValueKind(state({ type: 'mixed' })).kind).toBe('string');
    });
});

describe('getAllowedConditions', () => {
    it('compares a boolean and a list only for equality', () => {
        expect(getAllowedConditions('boolean')).toEqual(['==', '!=']);
        expect(getAllowedConditions('states')).toEqual(['==', '!=']);
    });

    it('compares numbers by size and texts by their parts', () => {
        expect(getAllowedConditions('number')).toContain('>=');
        expect(getAllowedConditions('number')).not.toContain('consist');
        expect(getAllowedConditions('string')).toContain('consist');
        expect(getAllowedConditions('string')).not.toContain('<');
    });
});

describe('getOfferedConditions', () => {
    it('keeps a stored condition that does not fit, as the runtime uses it', () => {
        expect(getOfferedConditions('boolean', '>')).toEqual(['==', '!=', '>']);
        expect(getOfferedConditions('boolean', '==')).toEqual(['==', '!=']);
    });
});

describe('parseConditionValue', () => {
    it('makes a number of a number and nothing of an empty input', () => {
        expect(parseConditionValue('21.5', 'number')).toBe(21.5);
        expect(parseConditionValue('  ', 'number')).toBeNull();
        expect(parseConditionValue('42', 'string')).toBe('42');
    });
});
