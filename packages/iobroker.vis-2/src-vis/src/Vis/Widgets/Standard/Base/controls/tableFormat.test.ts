import { describe, expect, it } from 'vitest';

import { filterRows, formatMoment, formatPattern, guessEndKey, guessStartKey, momentOf } from './tableFormat';

/** A moment in the local time of the machine the tests run on, the way a list of appointments writes it */
const local = (day: number, hour: number, minute = 0): number => new Date(2026, 10, day, hour, minute).getTime();
/** The short name of a weekday is what the ICU of the runtime says: `Mi.` in one version, `Mi` in the next */
const shortDay = (ts: number): string => new Date(ts).toLocaleDateString('de', { weekday: 'short' });
const iso = (day: number, hour: number, minute = 0): string =>
    `2026-11-${`${day}`.padStart(2, '0')}T${`${hour}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}:00`;

describe('momentOf', () => {
    it('reads a date written the way machines write it', () => {
        expect(momentOf(iso(11, 6))).toBe(local(11, 6));
    });

    it('reads a unix time in milliseconds and in seconds', () => {
        const ms = local(11, 6);
        expect(momentOf(ms)).toBe(ms);
        expect(momentOf(`${ms}`)).toBe(ms);
        expect(momentOf(ms / 1000)).toBe(ms);
    });

    it('does not take a small number, a word or a flag for a date', () => {
        expect(momentOf(12)).toBeNull();
        expect(momentOf('12')).toBeNull();
        expect(momentOf('Biotonne')).toBeNull();
        expect(momentOf(true)).toBeNull();
        expect(momentOf('')).toBeNull();
        expect(momentOf(null)).toBeNull();
    });
});

describe('formatPattern', () => {
    const ts = new Date(2026, 10, 11, 9, 5, 7).getTime();

    it('writes the letters of a binding', () => {
        expect(formatPattern(ts, 'YYYY-MM-DD hh:mm:ss', 'de')).toBe('2026-11-11 09:05:07');
        expect(formatPattern(ts, 'D.M.YY h:m:s', 'de')).toBe('11.11.26 9:5:7');
    });

    it('writes the weekday, long and short', () => {
        expect(formatPattern(ts, 'WW', 'de')).toBe('Mittwoch');
        expect(formatPattern(ts, 'W DD.MM.', 'de')).toBe(`${shortDay(ts)} 11.11.`);
    });
});

describe('formatMoment', () => {
    const now = local(11, 12);

    it('writes the presets', () => {
        expect(formatMoment(local(11, 14, 30), 'time', { lang: 'de', now })).toBe('14:30');
        expect(formatMoment(local(11, 14, 30), 'dateShort', { lang: 'de', now })).toBe('11.11.');
        expect(formatMoment(local(11, 14, 30), 'datetime', { lang: 'de', now })).toBe('11.11. 14:30');
    });

    it('says today and tomorrow, and the date beyond', () => {
        expect(formatMoment(local(11, 14, 30), 'relative', { lang: 'de', now })).toBe('Heute 14:30');
        expect(formatMoment(local(12, 9), 'relative', { lang: 'de', now })).toBe('Morgen 09:00');
        expect(formatMoment(local(10, 9), 'relative', { lang: 'de', now })).toBe('Gestern 09:00');
        expect(formatMoment(local(14, 9), 'relative', { lang: 'de', now })).toBe(
            `${shortDay(local(14, 9))} 14.11. 09:00`,
        );
    });

    it('takes the letters of its own pattern, and the time without one', () => {
        expect(formatMoment(local(11, 14, 30), 'custom', { lang: 'de', now, pattern: 'hh.mm' })).toBe('14.30');
        expect(formatMoment(local(11, 14, 30), 'custom', { lang: 'de', now })).toBe('14:30');
    });
});

describe('guessStartKey / guessEndKey', () => {
    const rows = [{ title: 'Müll', start: iso(11, 8), end: iso(11, 9), when: iso(12, 7) }];

    it('prefers a shown column that was given a format for a moment', () => {
        expect(guessStartKey(rows, [{ key: 'when', format: 'time' }])).toBe('when');
    });

    it('otherwise takes a name lists of appointments use', () => {
        expect(guessStartKey(rows, [{ key: 'title' }])).toBe('start');
        expect(guessEndKey(rows)).toBe('end');
    });

    it('finds nothing where no column holds a moment', () => {
        expect(guessStartKey([{ title: 'Müll', start: 'bald' }], [])).toBeUndefined();
        expect(guessEndKey([{ title: 'Müll' }])).toBeUndefined();
    });
});

describe('filterRows', () => {
    const now = local(11, 12);
    const rows = [
        { id: 'over', start: iso(11, 8), end: iso(11, 10) },
        { id: 'running', start: iso(11, 11), end: iso(11, 13) },
        { id: 'later', start: iso(11, 15) },
        { id: 'tomorrow', start: iso(12, 9) },
        { id: 'overnight', start: iso(10, 20), end: iso(11, 14) },
        { id: 'timeless', start: 'irgendwann' },
    ];
    const ids = (filter: Parameters<typeof filterRows>[1]): unknown[] =>
        filterRows(rows, filter, 'start', 'end', now).map(row => row.id);

    it('keeps everything without a filter or without a column', () => {
        expect(ids('')).toHaveLength(rows.length);
        expect(filterRows(rows, 'today', undefined, undefined, now)).toHaveLength(rows.length);
    });

    it('keeps what is not over yet', () => {
        expect(ids('upcoming')).toEqual(['running', 'later', 'tomorrow', 'overnight', 'timeless']);
    });

    it('keeps what starts today', () => {
        expect(ids('today')).toEqual(['over', 'running', 'later', 'timeless']);
    });

    it('keeps the rest of the day, with what runs into it from yesterday', () => {
        expect(ids('todayUpcoming')).toEqual(['running', 'later', 'overnight', 'timeless']);
    });

    it('takes a row without an end as over once it started', () => {
        expect(filterRows([{ start: iso(11, 11) }], 'upcoming', 'start', undefined, now)).toHaveLength(0);
    });
});
