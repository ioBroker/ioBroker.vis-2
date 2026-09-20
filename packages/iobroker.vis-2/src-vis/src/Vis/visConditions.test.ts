import { describe, expect, it } from 'vitest';

import { conditionNeedsValue, isConditionMet, isHiddenByCondition } from './visConditions';

describe('isHiddenByCondition', () => {
    const states = (val: unknown): Record<string, unknown> => ({ 'a.0.x.val': val });

    it('hides nothing without a state, except by "not exist"', () => {
        expect(isHiddenByCondition({}, '', '==', 1, 'w1')).toBe(false);
        expect(isHiddenByCondition({}, null, 'not exist', 1, 'w1')).toBe(true);
    });

    it('hides while the value of the state is not known yet, so nothing flashes up', () => {
        expect(isHiddenByCondition({}, 'a.0.x', '==', 1, 'w1')).toBe(true);
    });

    it('compares a boolean with true and false, however they are written', () => {
        expect(isHiddenByCondition(states(true), 'a.0.x', '==', true, 'w1')).toBe(false);
        expect(isHiddenByCondition(states(true), 'a.0.x', '==', 'true', 'w1')).toBe(false);
        expect(isHiddenByCondition(states(false), 'a.0.x', '==', 'true', 'w1')).toBe(true);
        expect(isHiddenByCondition(states(false), 'a.0.x', '!=', true, 'w1')).toBe(false);
        expect(isHiddenByCondition(states('true'), 'a.0.x', '==', true, 'w1')).toBe(false);
        expect(isHiddenByCondition(states(1), 'a.0.x', '==', '1', 'w1')).toBe(false);
    });

    it('compares numbers as numbers', () => {
        expect(isHiddenByCondition(states(21.5), 'a.0.x', '>', '20', 'w1')).toBe(false);
        expect(isHiddenByCondition(states(9), 'a.0.x', '>', '20', 'w1')).toBe(true);
        expect(isHiddenByCondition(states(20), 'a.0.x', '>=', 20, 'w1')).toBe(false);
        expect(isHiddenByCondition(states(20), 'a.0.x', '<', 20, 'w1')).toBe(true);
    });

    it('looks for a part of a text', () => {
        expect(isHiddenByCondition(states('window open'), 'a.0.x', 'consist', 'open', 'w1')).toBe(false);
        expect(isHiddenByCondition(states('window open'), 'a.0.x', 'not consist', 'open', 'w1')).toBe(true);
    });

    it('asks for a value only with "exist" and "not exist"', () => {
        expect(isHiddenByCondition(states(null), 'a.0.x', 'exist', undefined, 'w1')).toBe(false);
        expect(isHiddenByCondition(states(null), 'a.0.x', 'not exist', undefined, 'w1')).toBe(true);
        expect(isHiddenByCondition(states(5), 'a.0.x', 'exist', undefined, 'w1')).toBe(false);
    });
});

describe('isConditionMet', () => {
    it('is the opposite of being hidden', () => {
        expect(isConditionMet({ 'a.0.x.val': 'on' }, 'a.0.x', '==', 'on', 's1')).toBe(true);
        expect(isConditionMet({ 'a.0.x.val': 'off' }, 'a.0.x', '==', 'on', 's1')).toBe(false);
    });
});

describe('conditionNeedsValue', () => {
    it('needs a value to compare with, except to ask for existence', () => {
        expect(conditionNeedsValue('==')).toBe(true);
        expect(conditionNeedsValue('consist')).toBe(true);
        expect(conditionNeedsValue('exist')).toBe(false);
        expect(conditionNeedsValue('not exist')).toBe(false);
    });
});
