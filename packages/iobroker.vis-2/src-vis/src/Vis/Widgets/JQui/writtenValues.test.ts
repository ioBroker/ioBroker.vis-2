import { describe, expect, it } from 'vitest';

import { WrittenValues } from './writtenValues';

describe('WrittenValues', () => {
    it('takes the echoes of the writes in their order', () => {
        // "0845" typed into a time writes 00:30, 08:30, 08:40 and 08:45
        const written = new WrittenValues();
        ['00:30', '08:30', '08:40', '08:45'].forEach(value => written.write(value));

        expect(written.isEcho('00:30')).toBe(true);
        expect(written.isEcho('08:30')).toBe(true);
        expect(written.isEcho('08:40')).toBe(true);
        expect(written.isEcho('08:45')).toBe(true);
        // all echoes are in, the next value comes from outside
        expect(written.isEcho('08:45')).toBe(false);
    });

    it('lets a lost echo pass: a later echo settles the writes before it', () => {
        const written = new WrittenValues();
        written.write('08:30');
        written.write('08:45');

        expect(written.isEcho('08:45')).toBe(true);
        expect(written.isEcho('08:30')).toBe(false);
    });

    it('takes a value from outside and forgets the writes', () => {
        const written = new WrittenValues();
        written.write('08:30');

        expect(written.isEcho('12:00')).toBe(false);
        expect(written.isEcho('08:30')).toBe(false);
    });

    it('takes no value at all as the echo of clearing the field', () => {
        const written = new WrittenValues();
        written.write('');

        expect(written.isEcho(null)).toBe(true);
        written.write('');
        expect(written.isEcho(undefined)).toBe(true);
    });

    it('compares a number with the text that was written', () => {
        const written = new WrittenValues();
        written.write('1792675171923');

        expect(written.isEcho(1792675171923)).toBe(true);
    });

    it('takes the first value of the state as one from outside', () => {
        expect(new WrittenValues().isEcho('14:30')).toBe(false);
        expect(new WrittenValues().isEcho(undefined)).toBe(false);
    });
});
