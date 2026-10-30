import { describe, expect, it } from 'vitest';

import { applyStatesFromObject, parseCommonStates } from './statesList';

describe('parseCommonStates', () => {
    it('reads the three forms of common.states', () => {
        expect(parseCommonStates({ 0: 'Off', 1: 'On' })).toEqual([
            { value: '0', text: 'Off' },
            { value: '1', text: 'On' },
        ]);
        expect(parseCommonStates(['Off', 'On'])).toEqual([
            { value: '0', text: 'Off' },
            { value: '1', text: 'On' },
        ]);
        expect(parseCommonStates('0:Off; 1:On;2:Auto: night')).toEqual([
            { value: '0', text: 'Off' },
            { value: '1', text: 'On' },
            { value: '2', text: 'Auto: night' },
        ]);
    });

    it('gives a value without a text the value as text', () => {
        expect(parseCommonStates({ a: null })).toEqual([{ value: 'a', text: 'a' }]);
        expect(parseCommonStates('a;;b:')).toEqual([
            { value: 'a', text: 'a' },
            { value: 'b', text: '' },
        ]);
    });

    it('finds no list where there is none', () => {
        expect(parseCommonStates(undefined)).toEqual([]);
        expect(parseCommonStates(null)).toEqual([]);
        expect(parseCommonStates('')).toEqual([]);
        expect(parseCommonStates({})).toEqual([]);
        expect(parseCommonStates([])).toEqual([]);
        expect(parseCommonStates(5)).toEqual([]);
    });
});

describe('applyStatesFromObject', () => {
    const widget = {
        count: 2,
        oid: 'x',
        value1: 'old',
        text1: 'Old entry',
        icon1: 'old.svg',
        value2: 'b',
        text2: 'Generated B',
        icon2: 'b.svg',
        color2: 'red',
        tooltip2: 'tip',
        test2: true,
    };

    it('takes values and texts from the object and keeps the look of an entry with the same value', () => {
        expect(applyStatesFromObject(widget, { a: 'A', b: 'B' })).toEqual({
            count: 2,
            oid: 'x',
            value1: 'a',
            text1: 'A',
            value2: 'b',
            text2: 'B',
            icon2: 'b.svg',
            color2: 'red',
            tooltip2: 'tip',
            test2: true,
            image2: undefined,
            activeColor2: undefined,
            onlyIcon2: undefined,
        });
    });

    it('drops the entries of the widget that are beyond the list of the object', () => {
        const result = applyStatesFromObject({ ...widget, count: 3, value3: 'c', text3: 'C' }, { b: 'B' }) as Record<
            string,
            unknown
        >;
        expect(result.count).toBe(1);
        expect(result.value1).toBe('b');
        expect(result.icon1).toBe('b.svg');
        expect(result.value2).toBeUndefined();
        expect(result.text3).toBeUndefined();
        expect(result.icon2).toBeUndefined();
    });

    it('fills a widget that has no entries yet', () => {
        const result = applyStatesFromObject({ count: 0 }, ['Off', 'On']) as Record<string, unknown>;
        expect(result).toMatchObject({ count: 2, value1: '0', text1: 'Off', value2: '1', text2: 'On' });
    });

    it('leaves the data as it is when the object has no list', () => {
        expect(applyStatesFromObject(widget, undefined)).toBe(widget);
        expect(applyStatesFromObject(widget, {})).toBe(widget);
        expect(applyStatesFromObject({ count: NaN }, null)).toEqual({ count: NaN });
    });

    it('does not change the data of the widget', () => {
        const copy = JSON.parse(JSON.stringify(widget));
        applyStatesFromObject(widget, { a: 'A' });
        expect(widget).toEqual(copy);
    });
});
