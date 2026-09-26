import { describe, expect, it } from 'vitest';

import { parsePresets, presetModes } from './presets';

/**
 * What somebody types into a field is never quite what the parser expects, and the field says
 * `12;18;22;24` while half the world writes a comma for everything.
 */
describe('parsePresets', () => {
    it('reads the values the field asks for', () => {
        expect(parsePresets('12;18;22;24')).toEqual([12, 18, 22, 24]);
    });

    it('takes a comma as a separator, because that is what one types first', () => {
        expect(parsePresets('12,18,22')).toEqual([12, 18, 22]);
    });

    it('takes the spaces somebody put in for readability', () => {
        expect(parsePresets(' 12 ; 18 ; 22 ')).toEqual([12, 18, 22]);
    });

    it('reads a fraction, whichever mark it was written with', () => {
        expect(parsePresets('20.5;21.5')).toEqual([20.5, 21.5]);
    });

    it('leaves out what is not a number at all', () => {
        expect(parsePresets('12;night;22')).toEqual([12, 22]);
    });

    it('gives nothing for nothing', () => {
        expect(parsePresets('')).toEqual([]);
        expect(parsePresets(undefined)).toEqual([]);
        expect(parsePresets(';;')).toEqual([]);
    });
});

describe('presetModes', () => {
    it('writes a whole number without a nought behind the point', () => {
        expect(presetModes([22], '°C', false)[0].label).toBe('22°C');
    });

    it('writes a fraction with one place, and with a comma where the system uses one', () => {
        expect(presetModes([21.5], '°C', false)[0].label).toBe('21.5°C');
        expect(presetModes([21.5], '°C', true)[0].label).toBe('21,5°C');
    });

    it('keeps the value a number, so it can be written into the state as one', () => {
        expect(presetModes([22], '°C', false)[0].value).toBe(22);
    });
});
