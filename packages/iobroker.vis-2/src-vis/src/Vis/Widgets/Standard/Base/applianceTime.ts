import { asNumber, asText } from './controls/stateValue';

/** What the number of a remaining time counts in */
export type RemainingUnit = 'minutes' | 'seconds' | 'hours' | 'clock';

/**
 * A moment out of whatever the state holds.
 *
 * Machines write the end of a programme in every way there is: as a unix time in seconds or in milliseconds,
 * as something a browser can parse, or as the time of day it will be done at. The last one is the reason this
 * is not one line - `14:35` says nothing about the day, and a programme that ends after midnight ends
 * tomorrow.
 *
 * @param value - what the state holds
 * @param now - what counts as now, which the time of day is read against
 */
export function asTime(value: unknown, now = Date.now()): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const text = asText(value);
    if (typeof value === 'number' || /^\d+$/.test(text)) {
        const number = Number(value);
        // thirteen digits are milliseconds, ten are seconds, and anything shorter is not a moment at all
        return number > 1e11 ? number : number > 1e9 ? number * 1000 : null;
    }

    const clock = /^(\d{1,2}):(\d{2})/.exec(text);
    if (clock) {
        const when = new Date(now);
        when.setHours(Number(clock[1]), Number(clock[2]), 0, 0);
        // it is already past, so it is the time of tomorrow: a wash that ends at half one ends tonight
        if (when.getTime() < now - 3_600_000) {
            when.setDate(when.getDate() + 1);
        }
        return when.getTime();
    }

    const parsed = Date.parse(text);
    return isNaN(parsed) ? null : parsed;
}

/**
 * How long is left, in milliseconds, out of the state and the unit it was said to count in.
 *
 * @param value - what the state holds
 * @param unit - what its number counts, out of the settings of the widget
 */
export function asDuration(value: unknown, unit?: RemainingUnit): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (unit === 'clock') {
        const clock = /^(\d{1,2}):(\d{2})/.exec(asText(value));
        return clock ? (Number(clock[1]) * 60 + Number(clock[2])) * 60_000 : null;
    }
    const number = asNumber(value);
    if (number === null) {
        return null;
    }
    const factor = unit === 'seconds' ? 1_000 : unit === 'hours' ? 3_600_000 : 60_000;

    return number * factor;
}

/**
 * How long that is, as a house reads it: `1:24` in hours, or the minutes on their own.
 *
 * @param ms - how much time is left
 */
export function asClock(ms: number): { text: string; unit: 'h' | 'min' } {
    const minutes = Math.max(0, Math.round(ms / 60_000));
    if (minutes < 60) {
        return { text: `${minutes}`, unit: 'min' };
    }

    return { text: `${Math.floor(minutes / 60)}:${`${minutes % 60}`.padStart(2, '0')}`, unit: 'h' };
}

/**
 * The time of day of a moment, in the language of the browser.
 *
 * @param ts - the moment
 */
export function asClockTime(ts: number): string {
    return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
