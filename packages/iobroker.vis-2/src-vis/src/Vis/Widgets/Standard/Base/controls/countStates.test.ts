import { describe, expect, it } from 'vitest';

import { countSentence, countsAsOn, initialsOf } from './countStates';

describe('countsAsOn', () => {
    it('counts the ways a state says yes', () => {
        for (const value of [true, 1, 2, '1', '2', 'on', 'true', 'open', 'tilted']) {
            expect(countsAsOn(value), `${value as string}`).toBe(true);
        }
    });

    it('does not count the ways a state says no, or nothing', () => {
        for (const value of [false, 0, '0', '', 'off', 'false', 'closed', 'OFF', null, undefined, NaN]) {
            expect(countsAsOn(value), `${value as string}`).toBe(false);
        }
    });
});

describe('countSentence', () => {
    it('puts the number where %s stands', () => {
        expect(countSentence(3, '%s Fenster offen', 'Alle zu')).toBe('3 Fenster offen');
    });

    it('says the sentence for none, and the number without one', () => {
        expect(countSentence(0, '%s Fenster offen', 'Alle zu')).toBe('Alle zu');
        expect(countSentence(0, '%s Fenster offen', undefined)).toBe('0 Fenster offen');
        expect(countSentence(0, undefined, undefined)).toBe('0');
    });

    it('puts the number in front of a text without %s', () => {
        expect(countSentence(2, 'offen', undefined)).toBe('2 offen');
        expect(countSentence(2, undefined, undefined)).toBe('2');
    });
});

describe('initialsOf', () => {
    it('takes the first letters of at most two words', () => {
        expect(initialsOf('Laura')).toBe('L');
        expect(initialsOf('Anna Maria Schmidt')).toBe('AM');
        expect(initialsOf('élise dupont')).toBe('ÉD');
    });

    it('has none for no name', () => {
        expect(initialsOf('   ')).toBe('');
        expect(initialsOf(undefined)).toBe('');
    });
});
