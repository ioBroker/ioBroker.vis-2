import type { TableRow } from './tableRows';

/**
 * How a column writes a moment.
 *
 * An adapter hands over a time the way a machine reads it - `2026-11-11T06:00:00`, `1794373200000` - and a list
 * of the next appointments that shows that is a list nobody reads. The presets cover what a card says about a
 * moment; `custom` takes the letters a binding takes, `{id;date(DD.MM. hh:mm)}`.
 */
export type CellFormat = '' | 'time' | 'date' | 'dateShort' | 'datetime' | 'weekdayTime' | 'relative' | 'custom';

/** Which rows a table shows, by the moment they are at */
export type RowFilter = '' | 'upcoming' | 'today' | 'todayUpcoming';

/** The keys a list of appointments usually keeps its start under, in the order they are believed */
const START_KEYS = ['time', 'start', 'begin', 'date', '_date', 'datetime', 'from', 'ts', 'timestamp'];

/** The keys it keeps the end under */
const END_KEYS = ['endTime', 'end', '_end', 'to', 'until', 'stop'];

/**
 * A moment out of a cell, or null if the cell holds none.
 *
 * A number is a unix time - in milliseconds with thirteen digits, in seconds with ten - and anything shorter is a
 * number and not a moment. A text is a moment if the browser can read it as a date, and only if it looks like
 * one: `12` and `Biotonne` are no dates, however generous `Date.parse` is about them.
 *
 * @param value - what the row holds under the column
 */
export function momentOf(value: unknown): number | null {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
        return null;
    }
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
        const number = Number(value);
        return number > 1e11 ? number : number > 1e9 ? number * 1000 : null;
    }
    if (typeof value !== 'string') {
        return null;
    }
    const text = value.trim();
    // a date has a year in it, written with dashes or slashes the way machines write it
    if (!/^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{4}/.test(text)) {
        return null;
    }
    const parsed = Date.parse(text);
    return isNaN(parsed) ? null : parsed;
}

/** Midnight at the start of the day a moment is on */
function startOfDay(ts: number): number {
    const day = new Date(ts);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
}

/**
 * A moment written with the letters of a binding: `YYYY`, `MM`, `DD`, `hh`, `mm`, `ss`, and their short forms.
 *
 * `WW` and `W` give the name of the weekday, long and short, which a binding cannot say and a list of the week
 * needs most.
 *
 * @param ts - the moment
 * @param pattern - what to write, like `DD.MM. hh:mm`
 * @param lang - the language of the names of the days
 */
export function formatPattern(ts: number, pattern: string, lang: string): string {
    const date = new Date(ts);
    const two = (value: number): string => `${value}`.padStart(2, '0');

    return pattern.replace(/YYYY|YY|MM|M|DD|D|hh|h|mm|m|ss|s|WW|W/g, token => {
        switch (token) {
            case 'YYYY':
                return `${date.getFullYear()}`;
            case 'YY':
                return two(date.getFullYear() % 100);
            case 'MM':
                return two(date.getMonth() + 1);
            case 'M':
                return `${date.getMonth() + 1}`;
            case 'DD':
                return two(date.getDate());
            case 'D':
                return `${date.getDate()}`;
            case 'hh':
                return two(date.getHours());
            case 'h':
                return `${date.getHours()}`;
            case 'mm':
                return two(date.getMinutes());
            case 'm':
                return `${date.getMinutes()}`;
            case 'ss':
                return two(date.getSeconds());
            case 's':
                return `${date.getSeconds()}`;
            case 'WW':
                return date.toLocaleDateString(lang, { weekday: 'long' });
            default:
                return date.toLocaleDateString(lang, { weekday: 'short' });
        }
    });
}

/**
 * A moment as a column was told to write it.
 *
 * `relative` says `today 14:30`, `tomorrow 09:00` and otherwise the weekday and the date - which is how a list
 * of the next appointments is read. The words for today and tomorrow come from the browser in the language of
 * the system, so they need no translation of their own.
 *
 * @param ts - the moment
 * @param format - how the column writes it
 * @param options - what else it takes
 * @param options.lang - the language of the system
 * @param options.now - what counts as now, for `relative`
 * @param options.pattern - the letters of `custom`
 */
export function formatMoment(
    ts: number,
    format: CellFormat,
    options: { lang: string; now: number; pattern?: string },
): string {
    const { lang } = options;
    const date = new Date(ts);
    const time = (): string => date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    const shortDate = (): string => date.toLocaleDateString(lang, { day: '2-digit', month: '2-digit' });

    switch (format) {
        case 'time':
            return time();
        case 'date':
            return date.toLocaleDateString(lang, { day: '2-digit', month: '2-digit', year: 'numeric' });
        case 'dateShort':
            return shortDate();
        case 'datetime':
            return `${shortDate()} ${time()}`;
        case 'weekdayTime':
            return `${date.toLocaleDateString(lang, { weekday: 'short' })} ${time()}`;
        case 'relative': {
            const days = Math.round((startOfDay(ts) - startOfDay(options.now)) / 86_400_000);
            if (days >= -1 && days <= 1) {
                const word = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(days, 'day');
                return `${word.charAt(0).toLocaleUpperCase(lang)}${word.slice(1)} ${time()}`;
            }
            return `${date.toLocaleDateString(lang, { weekday: 'short' })} ${shortDate()} ${time()}`;
        }
        case 'custom':
            return options.pattern ? formatPattern(ts, options.pattern, lang) : time();
        default:
            return '';
    }
}

/**
 * The column a list keeps the start of its rows under, where nobody said which.
 *
 * Asked of the columns the table shows first - a column that was given a format for a moment is the one that
 * was meant - and then of the names lists of appointments use, as long as the column holds moments.
 *
 * @param rows - the rows of the table
 * @param shown - the columns the table shows, with the format each was given
 */
export function guessStartKey(rows: TableRow[], shown: { key: string; format?: CellFormat }[]): string | undefined {
    const holdsMoments = (key: string): boolean => rows.some(row => momentOf(row[key]) !== null);

    return (
        shown.find(column => column.format && holdsMoments(column.key))?.key ||
        START_KEYS.find(key => holdsMoments(key))
    );
}

/**
 * The column a list keeps the end of its rows under, where nobody said which.
 *
 * @param rows - the rows of the table
 */
export function guessEndKey(rows: TableRow[]): string | undefined {
    return END_KEYS.find(key => rows.some(row => momentOf(row[key]) !== null));
}

/**
 * The rows that pass the filter of the table.
 *
 * `upcoming` keeps what has not ended yet - an appointment that is running is still on the list until it is
 * over, and one without an end is over when it starts. `today` keeps what starts today, and `todayUpcoming` what
 * starts today and is not over yet: the list of the rest of the day. A row without a moment in that column is
 * kept: the filter is about time, and a row that says nothing about time is not the filter's business.
 *
 * @param rows - the rows of the table
 * @param filter - which rows to keep
 * @param startKey - the column of the start
 * @param endKey - the column of the end, if there is one
 * @param now - what counts as now
 */
export function filterRows(
    rows: TableRow[],
    filter: RowFilter,
    startKey: string | undefined,
    endKey: string | undefined,
    now: number,
): TableRow[] {
    if (!filter || !startKey) {
        return rows;
    }
    const today = startOfDay(now);
    const tomorrow = today + 86_400_000;

    return rows.filter(row => {
        const start = momentOf(row[startKey]);
        if (start === null) {
            return true;
        }
        const end = (endKey ? momentOf(row[endKey]) : null) ?? start;
        const notOver = end >= now;
        const startsToday = start >= today && start < tomorrow;

        switch (filter) {
            case 'upcoming':
                return notOver;
            case 'today':
                return startsToday;
            default:
                // still running from yesterday into today counts as today as well
                return notOver && (startsToday || (start < today && end >= today));
        }
    });
}
