import { describe, expect, it } from 'vitest';

import { cellLook, cellRuleHolds, cellRules, type CellRule } from './cellLook';

const TEMPERATURE: CellRule[] = [
    { op: '>', value: '25', color: '#e05c5c' },
    { op: '>', value: '20', color: '#e0a23c' },
    { op: '*', color: '#5ecf7a' },
];

describe('cellRules', () => {
    it('reads what the dialog wrote', () => {
        expect(cellRules(JSON.stringify(TEMPERATURE))).toEqual(TEMPERATURE);
    });

    it('gives no rules rather than an error for anything else', () => {
        // a field cleared by hand, or a project saved by a version that had no rules yet
        for (const nothing of ['', 'not json', '{"a":1}', null, undefined, 42]) {
            expect(cellRules(nothing)).toEqual([]);
        }
    });
});

describe('cellRuleHolds', () => {
    it('compares two numbers as numbers', () => {
        expect(cellRuleHolds(26, { op: '>', value: '25' })).toBe(true);
        expect(cellRuleHolds(25, { op: '>', value: '25' })).toBe(false);
        expect(cellRuleHolds(25, { op: '>=', value: '25' })).toBe(true);
        expect(cellRuleHolds(3, { op: '<', value: '25' })).toBe(true);
        // a number that arrives as text, with a comma, is still a number
        expect(cellRuleHolds('21,5', { op: '>', value: '20' })).toBe(true);
    });

    it('compares everything else as text, whatever the case', () => {
        expect(cellRuleHolds('OK', { op: '=', value: 'ok' })).toBe(true);
        expect(cellRuleHolds('Fehler', { op: '=', value: 'OK' })).toBe(false);
        expect(cellRuleHolds('Fehler', { op: '!=', value: 'OK' })).toBe(true);
        expect(cellRuleHolds(true, { op: '=', value: 'true' })).toBe(true);
        expect(cellRuleHolds(false, { op: '=', value: 'true' })).toBe(false);
    });

    it('says no where a greater-than has no two numbers to compare', () => {
        expect(cellRuleHolds('abc', { op: '>', value: '5' })).toBe(false);
        expect(cellRuleHolds(5, { op: '>', value: 'abc' })).toBe(false);
    });

    it('lets the rest through', () => {
        expect(cellRuleHolds('anything', { op: '*' })).toBe(true);
        expect(cellRuleHolds(null, { op: '*' })).toBe(true);
    });
});

describe('cellLook', () => {
    it('takes the first rule that holds, not the last', () => {
        // "over 25 red, over 20 yellow, the rest green" is how the list is read aloud
        expect(cellLook(26.1, TEMPERATURE).color).toBe('#e05c5c');
        expect(cellLook(22.4, TEMPERATURE).color).toBe('#e0a23c');
        expect(cellLook(19.8, TEMPERATURE).color).toBe('#5ecf7a');
    });

    it('gives nothing where no rule holds', () => {
        expect(cellLook(10, [{ op: '>', value: '25', color: '#f00' }])).toEqual({});
        expect(cellLook(10, [])).toEqual({});
    });

    it('carries a background as well, and leaves out what was not set', () => {
        expect(cellLook('Fehler', [{ op: '=', value: 'Fehler', background: '#400' }])).toEqual({
            color: undefined,
            background: '#400',
        });
    });
});
