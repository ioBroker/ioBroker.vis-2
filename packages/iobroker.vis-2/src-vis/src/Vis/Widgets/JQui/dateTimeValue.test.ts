import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';

import { DEFAULT_DATE_TIME_FORMAT, formatDateTime, parseDateTime } from './dateTimeValue';

describe('parseDateTime', () => {
    it('reads a text in the default format', () => {
        const moment = parseDateTime('2026-10-22 14:30', false, '');
        expect(moment?.format(DEFAULT_DATE_TIME_FORMAT)).toBe('2026-10-22 14:30');
    });

    it('reads a text in a format of its own', () => {
        expect(parseDateTime('22.10.2026 07:05', false, 'DD.MM.YYYY HH:mm')?.format('YYYY-MM-DD HH:mm')).toBe(
            '2026-10-22 07:05',
        );
    });

    it('reads a date and a timestamp', () => {
        const date = new Date(2026, 9, 22, 14, 30);
        expect(parseDateTime(date.toString(), true, '')?.valueOf()).toBe(date.getTime());
        expect(parseDateTime(date.getTime(), true, '')?.valueOf()).toBe(date.getTime());
    });

    it('takes an empty or unreadable value as none', () => {
        expect(parseDateTime(undefined, false, '')).toBeNull();
        expect(parseDateTime(null, true, '')).toBeNull();
        expect(parseDateTime('', false, '')).toBeNull();
        expect(parseDateTime(true, true, '')).toBeNull();
        expect(parseDateTime('not a date', true, '')).toBeNull();
        // a time alone is not a date and time
        expect(parseDateTime('14:30', false, '')).toBeNull();
        expect(parseDateTime('2026-13-45 25:61', false, '')).toBeNull();
    });
});

describe('formatDateTime', () => {
    const moment = dayjs(new Date(2026, 0, 2, 3, 4, 59, 999));

    it('writes the default format without seconds', () => {
        expect(formatDateTime(moment, false, '')).toBe('2026-01-02 03:04');
    });

    it('writes a format of its own', () => {
        expect(formatDateTime(moment, false, 'DD.MM.YYYY HH:mm')).toBe('02.01.2026 03:04');
    });

    it('writes a date without seconds', () => {
        expect(formatDateTime(moment, true, '')).toBe(new Date(2026, 0, 2, 3, 4).toString());
    });

    it('reads back what it writes', () => {
        const format = 'YYYY-MM-DD HH:mm';
        expect(parseDateTime(formatDateTime(moment, false, format), false, format)?.format(format)).toBe(
            '2026-01-02 03:04',
        );
    });
});
