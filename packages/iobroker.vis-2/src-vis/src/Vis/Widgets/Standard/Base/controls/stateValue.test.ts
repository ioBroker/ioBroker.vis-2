import { describe, expect, it } from 'vitest';

import { asNumber } from './stateValue';

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
