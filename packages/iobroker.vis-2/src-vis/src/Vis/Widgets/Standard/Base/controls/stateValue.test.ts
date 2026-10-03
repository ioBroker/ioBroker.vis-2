import { describe, expect, it } from 'vitest';

import { asNumber, statesOf, typedValue } from './stateValue';

describe('asNumber', () => {
    it('takes a number as it is', () => {
        expect(asNumber(0)).toBe(0);
        expect(asNumber(42)).toBe(42);
        expect(asNumber(-0.5)).toBe(-0.5);
    });

    it('reads a number out of a text, with a comma as well', () => {
        expect(asNumber('42')).toBe(42);
        expect(asNumber(' 42.5 ')).toBe(42.5);
        expect(asNumber('42,5')).toBe(42.5);
    });

    it('says no to everything a slider would die on', () => {
        // a boolean in a state whose object says `number` is what took the whole editor down
        expect(asNumber(true)).toBeNull();
        expect(asNumber(false)).toBeNull();
        expect(asNumber(null)).toBeNull();
        expect(asNumber(undefined)).toBeNull();
        expect(asNumber('')).toBeNull();
        expect(asNumber('   ')).toBeNull();
        expect(asNumber('on')).toBeNull();
        expect(asNumber(NaN)).toBeNull();
        expect(asNumber(Infinity)).toBeNull();
        expect(asNumber({})).toBeNull();
        expect(asNumber([1, 2])).toBeNull();
    });
});

describe('statesOf', () => {
    it('reads the map an object usually carries', () => {
        expect(statesOf({ states: { 0: 'Aus', 1: 'An' } } as any)).toEqual([
            { value: '0', label: 'Aus' },
            { value: '1', label: 'An' },
        ]);
    });

    it('reads a list, where the position is the value', () => {
        expect(statesOf({ states: ['Aus', 'An'] } as any)).toEqual([
            { value: '0', label: 'Aus' },
            { value: '1', label: 'An' },
        ]);
    });

    it('reads the old way of writing them down', () => {
        expect(statesOf({ states: '0:off;1:on' } as any)).toEqual([
            { value: '0', label: 'off' },
            { value: '1', label: 'on' },
        ]);
        // whatever is not a pair is not a state
        expect(statesOf({ states: '0:off;nonsense;1:on' } as any)).toHaveLength(2);
    });

    it('says nothing where the object names nothing', () => {
        expect(statesOf(undefined)).toEqual([]);
        expect(statesOf({ type: 'number' } as any)).toEqual([]);
    });
});

describe('typedValue', () => {
    it('writes a number into a state that says it is a number', () => {
        expect(typedValue('2', { type: 'number' } as any)).toBe(2);
        expect(typedValue('21,5', { type: 'number' } as any)).toBe(21.5);
        // a field that was cleared must not write NaN into the state
        expect(typedValue('', { type: 'number' } as any)).toBe(0);
    });

    it('writes a boolean into a state that says it is one', () => {
        expect(typedValue('true', { type: 'boolean' } as any)).toBe(true);
        expect(typedValue('1', { type: 'boolean' } as any)).toBe(true);
        expect(typedValue('false', { type: 'boolean' } as any)).toBe(false);
        expect(typedValue('0', { type: 'boolean' } as any)).toBe(false);
    });

    it('leaves everything else as the text it is', () => {
        expect(typedValue('eco', { type: 'string' } as any)).toBe('eco');
        expect(typedValue('2', undefined)).toBe('2');
    });
});
