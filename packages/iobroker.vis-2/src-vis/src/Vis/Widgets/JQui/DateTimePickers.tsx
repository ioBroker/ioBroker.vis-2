/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2023-2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

// The pickers of `JQuiInputDate` and `JQuiInputDateTime`. They live in a module of their own, because
// `@mui/x-date-pickers` with dayjs and its locales is about 400 KB, and the widget files are part of the runtime
// bundle - every project would load it before its first view, used or not. The widgets load this module with
// `React.lazy` when one of them is really rendered.

import React from 'react';
import dayjs, { type Dayjs } from 'dayjs';

import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/de';
import 'dayjs/locale/en';
import 'dayjs/locale/ru';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/uk';
import 'dayjs/locale/it';
import 'dayjs/locale/fr';
import 'dayjs/locale/es';
import 'dayjs/locale/pl';
import 'dayjs/locale/pt';
import 'dayjs/locale/nl';

import type { TextFieldVariants } from '@mui/material';

import { WrittenValues } from './writtenValues';

const styles: { textRoot: { [key: string]: React.CSSProperties } } = {
    textRoot: {
        '& .MuiInputBase-root': {
            width: '100%',
            height: '100%',
        },
        // the text takes the color of the widget, not that of the theme, see JQuiInput (#521)
        '& .MuiPickersInputBase-root': {
            color: 'inherit',
        },
    },
};

/** If a user does not want to use full date */
const EASY_DATE_FORMAT = 'DD.MM.YYYY';

interface PickerProps {
    /** The value of the state, as it is */
    value: any;
    lang: string;
    variant: TextFieldVariants;
    autoFocus: boolean;
    clearable: boolean;
    widgetTitle: string;
    /** Writes the new value into the state */
    onChange: (value: string) => void;
}

/**
 * The value a picker shows, and how it changes it. The echoes of its own writes do not replace what it shows,
 * see `WrittenValues`.
 *
 * @param stateValue the value of the state
 * @param fromState what the picker shows for the value of the state
 * @param write writes a value into the state
 * @param parseKey changes when `fromState` reads the value of the state differently
 */
function useTypedValue(
    stateValue: ioBroker.StateValue | undefined,
    fromState: () => Dayjs | null,
    write: (value: string) => void,
    parseKey: string,
): [Dayjs | null, (shown: Dayjs | null, value: string | null) => void] {
    const [shown, setShown] = React.useState<Dayjs | null>(fromState);
    const written = React.useRef(new WrittenValues());

    React.useEffect(() => {
        if (!written.current.isEcho(stateValue)) {
            setShown(fromState());
        }
        // `fromState` is new in every render, `parseKey` says when it reads the value differently
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stateValue, parseKey]);

    return [
        shown,
        (value, text) => {
            setShown(value);
            if (text !== null) {
                written.current.write(text);
                write(text);
            }
        },
    ];
}

export interface VisDatePickerProps extends PickerProps {
    asFullDate: boolean;
    disableFuture: boolean;
    disablePast: boolean;
    displayWeekNumber: boolean;
    wideFormat: boolean;
}

export function VisDatePicker(props: VisDatePickerProps): React.JSX.Element {
    const [value, change] = useTypedValue(
        props.value,
        () => (props.asFullDate ? dayjs(props.value) : dayjs(props.value, EASY_DATE_FORMAT)),
        props.onChange,
        String(props.asFullDate),
    );

    return (
        <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale={props.lang}
        >
            <DatePicker
                value={value}
                label={props.widgetTitle || null}
                autoFocus={props.autoFocus || false}
                onChange={newValue => {
                    // a date that is still being typed is shown, but not written
                    change(
                        newValue,
                        newValue?.isValid()
                            ? props.asFullDate
                                ? newValue.toDate().toString()
                                : newValue.format(EASY_DATE_FORMAT)
                            : null,
                    );
                }}
                formatDensity={props.wideFormat ? 'spacious' : 'dense'}
                slotProps={{
                    textField: {
                        variant: props.variant || 'standard',
                        style: {
                            width: '100%',
                            height: '100%',
                        },
                        sx: styles.textRoot,
                    },
                    field: {
                        clearable: props.clearable,
                        onClear: () => change(null, ''),
                    },
                }}
                disableFuture={props.disableFuture || false}
                disablePast={props.disablePast || false}
                displayWeekNumber={props.displayWeekNumber || false}
            />
        </LocalizationProvider>
    );
}

export interface VisTimePickerProps extends PickerProps {
    ampm: boolean;
    asDate: boolean;
    stepMinute: number;
}

export function VisTimePicker(props: VisTimePickerProps): React.JSX.Element {
    const val = props.value;
    const asDate = props.asDate;
    const [value, change] = useTypedValue(
        val,
        () => (val && !asDate ? dayjs(val, 'HH:mm') : dayjs(val)),
        props.onChange,
        String(asDate),
    );

    return (
        <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale={props.lang}
        >
            <TimePicker
                value={value}
                ampm={props.ampm || false}
                minutesStep={parseInt(props.stepMinute as unknown as string, 10) || 1}
                label={props.widgetTitle || null}
                formatDensity="dense"
                format="HH:mm"
                autoFocus={props.autoFocus || false}
                onChange={newValue => {
                    // a time that is still being typed is shown, but not written
                    change(
                        newValue,
                        newValue?.isValid()
                            ? !asDate
                                ? newValue.format('HH:mm')
                                : newValue.second(0).millisecond(0).toDate().toString()
                            : null,
                    );
                }}
                slotProps={{
                    textField: {
                        variant: props.variant || 'standard',
                        style: {
                            width: '100%',
                            height: '100%',
                        },
                        sx: styles.textRoot,
                    },
                    field: {
                        clearable: props.clearable,
                        onClear: () => change(null, ''),
                    },
                }}
            />
        </LocalizationProvider>
    );
}
