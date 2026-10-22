// The value of the input "Input Time" with date: what the state holds and what the picker writes into it (#577)

import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

/** The format vis-1 users know from the widget "jqui Input Datetime" */
export const DEFAULT_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';

/**
 * The moment the value of the state stands for, or null if it holds none
 *
 * @param value the value of the state
 * @param asDate the state holds a date, not a text in `format`
 * @param format the dayjs format of the text
 */
export function parseDateTime(value: ioBroker.StateValue | undefined, asDate: boolean, format: string): Dayjs | null {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
        return null;
    }
    const parsed = asDate ? dayjs(value) : dayjs(String(value), format || DEFAULT_DATE_TIME_FORMAT, true);
    return parsed.isValid() ? parsed : null;
}

/**
 * What the picker writes into the state, without seconds
 *
 * @param value the chosen moment
 * @param asDate write a date, not a text in `format`
 * @param format the dayjs format of the text
 */
export function formatDateTime(value: Dayjs, asDate: boolean, format: string): string {
    const moment = value.second(0).millisecond(0);
    return asDate ? moment.toDate().toString() : moment.format(format || DEFAULT_DATE_TIME_FORMAT);
}
