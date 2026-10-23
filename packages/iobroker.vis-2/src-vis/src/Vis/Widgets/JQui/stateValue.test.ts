import { describe, expect, it } from 'vitest';

import { toStateType } from './stateValue';

describe('toStateType', () => {
    // #439: "Write state" wrote the value of its attribute as text into a number state
    it('writes a number into a number state', () => {
        expect(toStateType('5', 'number')).toBe(5);
        expect(toStateType('-2.5', 'number')).toBe(-2.5);
        expect(toStateType(7, 'number')).toBe(7);
    });

    it('leaves a text that is no number as it is', () => {
        expect(toStateType('abc', 'number')).toBe('abc');
        expect(toStateType('', 'number')).toBe('');
        expect(toStateType(' ', 'number')).toBe(' ');
    });

    it('writes a boolean into a boolean state', () => {
        expect(toStateType('true', 'boolean')).toBe(true);
        expect(toStateType('1', 'boolean')).toBe(true);
        expect(toStateType('false', 'boolean')).toBe(false);
        expect(toStateType('0', 'boolean')).toBe(false);
        expect(toStateType('on', 'boolean')).toBe('on');
    });

    it('writes the value as it is into a string, mixed or unknown state', () => {
        expect(toStateType('5', 'string')).toBe('5');
        expect(toStateType('5', 'mixed')).toBe('5');
        expect(toStateType('5', null)).toBe('5');
        expect(toStateType('true', undefined)).toBe('true');
    });
});
