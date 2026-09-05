import { describe, expect, it } from 'vitest';

import VisFormatUtils from './visFormatUtils';

/**
 * `formatValue` is what turns a number into the text a widget shows: it rounds, puts the decimal separator
 * where the format asks for it and groups the thousands. The `format` is two characters - the first is the
 * thousands separator, the second the decimal one.
 */
describe('VisFormatUtils.formatValue', () => {
    it('rounds to the number of places it is given', () => {
        expect(VisFormatUtils.formatValue(3.14159, 2)).toBe('3,14');
        expect(VisFormatUtils.formatValue(3.14159, 0)).toBe('3');
        expect(VisFormatUtils.formatValue(2.5, 0)).toBe('3');
    });

    it('uses the german way round by default: point for thousands, comma for decimals', () => {
        expect(VisFormatUtils.formatValue(1234.5, 1)).toBe('1.234,5');
    });

    it('follows the format it is given', () => {
        expect(VisFormatUtils.formatValue(1234.5, 1, ',.')).toBe('1,234.5');
        expect(VisFormatUtils.formatValue(1234567.89, 2, ',.')).toBe('1,234,567.89');
    });

    it('groups every three digits', () => {
        expect(VisFormatUtils.formatValue(1000000, 0)).toBe('1.000.000');
        expect(VisFormatUtils.formatValue(100, 0)).toBe('100');
        expect(VisFormatUtils.formatValue(1000, 0)).toBe('1.000');
    });

    it('reads a number that arrives as text', () => {
        expect(VisFormatUtils.formatValue('1234.5', 1)).toBe('1.234,5');
    });

    it('gives an empty text for what is not a number', () => {
        expect(VisFormatUtils.formatValue('abc', 2)).toBe('');
        expect(VisFormatUtils.formatValue('', 2)).toBe('');
    });

    it('keeps the sign', () => {
        expect(VisFormatUtils.formatValue(-1234.5, 1)).toBe('-1.234,5');
    });

    it('falls back to two places when no number of places is given', () => {
        expect(VisFormatUtils.formatValue(3.14159)).toBe('3,14');
        expect(VisFormatUtils.formatValue(1234.5)).toBe('1.234,50');
    });

    /**
     * The signature invites putting the format where the number of places goes, and the function is built to
     * take it: it moves the argument over and defaults the places to two. It used to set the places first and
     * then read the format out of the variable it had just overwritten, so `formatValue(1234.5)` returned
     * "1undefined234.50" - the thousands separator was read off the number 2.
     */
    it('takes a format that was passed where the number of places goes', () => {
        expect(VisFormatUtils.formatValue(1234.5, ',.')).toBe('1,234.50');
    });
});
