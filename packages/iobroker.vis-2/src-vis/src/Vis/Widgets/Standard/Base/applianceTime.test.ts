import { describe, expect, it } from 'vitest';

import { asClock, asDuration, asTime } from './applianceTime';

/**
 * A washing machine says when it will be done in whatever way its adapter felt like, and the widget has to
 * read all of them. The time of day is the one that needs thinking about: `14:35` says nothing about the day.
 */
describe('asTime', () => {
    // a Tuesday at noon
    const now = new Date('2026-03-10T12:00:00').getTime();

    it('takes a unix time in milliseconds as it is', () => {
        expect(asTime(1_772_000_000_000, now)).toBe(1_772_000_000_000);
    });

    it('takes a unix time in seconds and makes milliseconds of it', () => {
        expect(asTime(1_772_000_000, now)).toBe(1_772_000_000_000);
    });

    it('takes the same thing written as a word', () => {
        expect(asTime('1772000000', now)).toBe(1_772_000_000_000);
    });

    it('reads a date the browser knows', () => {
        expect(asTime('2026-03-10T14:35:00', now)).toBe(new Date('2026-03-10T14:35:00').getTime());
    });

    it('reads the time of day as today, as long as it is still to come', () => {
        expect(asTime('14:35', now)).toBe(new Date('2026-03-10T14:35:00').getTime());
    });

    it('reads a time of day that is long past as tomorrow, because that is when the wash ends', () => {
        expect(asTime('01:30', now)).toBe(new Date('2026-03-11T01:30:00').getTime());
    });

    it('stays within the hour that has just gone, where a machine is a minute late', () => {
        expect(asTime('11:30', now)).toBe(new Date('2026-03-10T11:30:00').getTime());
    });

    it('gives nothing for nothing, and for a number that is no moment at all', () => {
        expect(asTime(undefined, now)).toBe(null);
        expect(asTime('', now)).toBe(null);
        expect(asTime(84, now)).toBe(null);
        expect(asTime('running', now)).toBe(null);
    });
});

describe('asDuration', () => {
    it('counts in minutes where nothing else was said', () => {
        expect(asDuration(84)).toBe(84 * 60_000);
        expect(asDuration(84, 'minutes')).toBe(84 * 60_000);
    });

    it('counts in seconds and in hours where that was said', () => {
        expect(asDuration(90, 'seconds')).toBe(90_000);
        expect(asDuration(1.5, 'hours')).toBe(5_400_000);
    });

    it('reads `1:24` as an hour and twenty-four minutes', () => {
        expect(asDuration('1:24', 'clock')).toBe(84 * 60_000);
    });

    it('gives nothing for nothing', () => {
        expect(asDuration(undefined)).toBe(null);
        expect(asDuration('', 'clock')).toBe(null);
        expect(asDuration('soon')).toBe(null);
    });
});

describe('asClock', () => {
    it('writes less than an hour as the minutes alone', () => {
        expect(asClock(24 * 60_000)).toEqual({ text: '24', unit: 'min' });
    });

    it('writes more than an hour the way a machine shows it', () => {
        expect(asClock(84 * 60_000)).toEqual({ text: '1:24', unit: 'h' });
        expect(asClock(125 * 60_000)).toEqual({ text: '2:05', unit: 'h' });
    });

    it('never counts backwards, however late the machine is', () => {
        expect(asClock(-60_000)).toEqual({ text: '0', unit: 'min' });
    });
});
