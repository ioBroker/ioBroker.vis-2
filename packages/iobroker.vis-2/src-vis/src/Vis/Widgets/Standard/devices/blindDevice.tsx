import React from 'react';

import { Blinds as BlindIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';
import { I18n, type Connection } from '@iobroker/gui-components';

import type { RxWidgetInfoAttributesField, WidgetData } from '@iobroker/types-vis-2';

import { adoptObject } from '../Base/adoptObject';

import BlindButtons from '../Base/controls/BlindButtons';
import BlindWindow from '../Base/controls/BlindWindow';
import FatSlider from '../Base/controls/FatSlider';
import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';
import { limitsOf } from '../Base/limits';

interface BlindRxData extends StandardRxData {
    /** Where the blind stands, when that is not the state it is set by */
    oidActual?: string;
    /** The button that sends the blind all the way up */
    oidUp?: string;
    /** The button that sends it all the way down */
    oidDown?: string;
    /** The button that stops it where it is */
    oidStop?: string;
    /** `auto`, `level` or `buttons`; see the comment on the widget */
    mode?: 'auto' | 'level' | 'buttons';
    min?: number | string;
    max?: number | string;
    step?: number | string;
    /** The largest value is closed, not open */
    inverted?: boolean | 'true';
}

/**
 * How far the blind lets the light in, in hundredths, whatever the object counts in.
 *
 * This is the number ioBroker has always spoken in for a blind: 100 is 100 % light, 0 is none, and it is what
 * the state itself carries. The widget therefore says the same number the object says, and only the drawing
 * turns it around - what a person sees is the covered part of the window.
 *
 * `inverted` is for the few devices that count the other way round, where the largest value is the closed one.
 *
 * @param context - the widget, its states and its settings
 */
function openPercent(context: DeviceContext<BlindRxData>): number | null {
    const value = asNumber(context.data.oidActual ? context.valueOf('oidActual') : context.valueOf('oid'));
    if (value === null) {
        return null;
    }
    const { min, max } = limitsOf(context, context.data.oidActual ? 'oidActual' : 'oid');
    const span = max - min || 100;
    const percent = ((value - min) / span) * 100;
    const inverted = context.data.inverted === true || context.data.inverted === 'true';

    return Math.max(0, Math.min(100, inverted ? 100 - percent : percent));
}

/**
 * The blind: the window it hangs in, filled from the top as far as the blind is down.
 *
 * Not every blind can be sent to a position. Many only know up, down and stop, and report where they ended up;
 * `mode` says which of the two this one is, and `auto` - the normal case - reads it off the states: a blind
 * that was given something to set gets the slider and can be pulled in its window, one that was not gets the
 * buttons and a window that only shows.
 *
 * What the state counts in is the object's business - `min` and `max` say it, `inverted` says which end is
 * closed - and the card shows the number the state carries, which in ioBroker is how much light comes in: 100
 * is open, 0 is closed. Only the drawing turns it around, because a covered window is what a person sees.
 */
const blindDevice = defineDeviceWidget<BlindRxData>({
    name: 'Blind',
    label: 'widget_blind',
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="3" y="3" width="26" height="26" rx="2" stroke="currentColor" stroke-width="2"/>' +
        '<rect x="5" y="5" width="22" height="11" fill="currentColor" opacity="0.6"/></svg>',
    help: 'help_blind',
    picture: {
        glyph:
            '<rect x="4" y="4" width="16" height="16" rx="2" stroke-width="2"/>' +
            '<path d="M6.5 7.5h11M6.5 10.5h11M6.5 13.5h11" stroke-width="1.6" opacity="0.7"/>',
        value: '75 %',
        window: true,
        slider: true,
    },
    deviceTypes: [Types.blind, Types.blindButtons, Types.gate],
    fields: [
        {
            name: 'mode',
            type: 'select',
            label: 'mode',
            default: 'auto',
            options: [
                { value: 'auto', label: 'mode_auto' },
                { value: 'level', label: 'mode_level' },
                { value: 'buttons', label: 'mode_buttons' },
            ],
        },
        { name: 'oid', type: 'id', label: 'oid', hidden: "data.mode === 'buttons'" },
        {
            name: 'oidActual',
            type: 'id',
            label: 'oid_actual',
            // a blind that is only read out of its feedback has its limits on that state, not on `oid`
            onChange: async (
                _field: RxWidgetInfoAttributesField,
                data: WidgetData,
                changeData: (newData: WidgetData) => void,
                socket: Connection,
            ): Promise<void> => {
                if (await adoptObject(data, socket, I18n.getLanguage(), 'oidActual')) {
                    changeData(data);
                }
            },
        },
        { name: 'oidUp', type: 'id', label: 'oid_up' },
        { name: 'oidStop', type: 'id', label: 'oid_stop' },
        { name: 'oidDown', type: 'id', label: 'oid_down' },
        { name: 'min', type: 'number', label: 'min' },
        { name: 'max', type: 'number', label: 'max' },
        { name: 'step', type: 'number', label: 'step', hidden: "data.mode === 'buttons'" },
        { name: 'inverted', type: 'checkbox', label: 'inverted', tooltip: 'inverted_tooltip' },
    ],
    tile: { columns: 6, rows: 4, minColumns: 4, minRows: 3 },
    markerShape: 'value',
    // a blind is pulled, stopped and sent to a position - none of that fits on a coin, so a marker of it
    // opens this very card
    popup: true,
    render: context => {
        const { data, theme, accents, t } = context;
        const open = openPercent(context);
        const known = open !== null;
        // the window is drawn as what it covers; everything the card says is the light the state speaks of
        const closed = open === null ? 0 : 100 - open;
        // what is written goes to `oid` and therefore in its scale, whatever the feedback state counts in
        const { min, max, step } = limitsOf(context, 'oid');
        const accent = known && closed > 0 ? accents.blue : accents.off;
        const inverted = data.inverted === true || data.inverted === 'true';

        /**
         * Show a position at once, and write it when the gesture is over.
         *
         * The window is drawn from `oidActual` where there is one, so that is what has to be shown as well -
         * otherwise the drawing waits for the blind to report back while the hand has long moved on.
         *
         * @param value - the position, in what the state counts in
         * @param holding - the gesture is still running, so nothing is written yet
         */
        const show = (value: number, holding: boolean): void => {
            context.preview('oid', value, holding);
            if (data.oidActual) {
                context.preview('oidActual', value, holding);
            }
            if (!holding && data.oid) {
                context.setValue(data.oid, value);
            }
        };

        // a blind that was given nothing to set can only be sent to its two ends
        const byLevel = data.mode === 'level' || (data.mode !== 'buttons' && !!data.oid);
        const openValue = inverted ? min : max;
        const closeValue = inverted ? max : min;

        /**
         * Turn "this much of the window is covered" back into what the state counts in.
         *
         * While the pointer is down the value is only shown - the window has to follow the hand, not wait for
         * the blind to report back - and it is written when the pointer is let go.
         *
         * @param percent - how far the window should be covered, from 0 to 100
         * @param done - the pointer was let go
         */
        const setClosed = (percent: number, done: boolean): void => {
            const share = inverted ? percent / 100 : 1 - percent / 100;
            show(Math.round(min + share * (max - min)), !done);
        };

        /** Up and down press their own button where there is one, and otherwise send the level to its end */
        const goTo = (button: string | undefined, end: number) => (): void => {
            if (button) {
                context.setValue(button, true);
            } else if (data.oid) {
                context.setValue(data.oid, end);
            }
        };

        const canMove = !!data.oidUp || !!data.oidDown || !!data.oid;

        return {
            accent,
            // A blind that is down is not "loud" the way a lamp that is on is: it fills nothing and keeps the
            // ring, the number and the drawn window to say where it stands. That is the quieter style, and on
            // a floor plan - where these markers live - it is also the one that stays readable.
            active: false,
            icon: <BlindIcon style={{ width: '100%', height: '100%' }} />,
            body: (
                <BlindWindow
                    closed={closed}
                    accent={accent}
                    background={theme.palette.background.default}
                    outline={theme.palette.text.disabled}
                    // only a blind that can be sent to a position may be pulled, and in the editor the pointer
                    // belongs to the editor: a drag there moves the widget
                    onDrag={context.editMode || !byLevel || !data.oid ? undefined : setClosed}
                />
            ),
            aside: canMove ? (
                <BlindButtons
                    theme={theme}
                    onUp={goTo(data.oidUp, openValue)}
                    onStop={data.oidStop ? () => context.setValue(data.oidStop as string, true) : undefined}
                    onDown={goTo(data.oidDown, closeValue)}
                />
            ) : null,
            label: t('open'),
            value: known ? (
                <span>
                    {Math.round(open)}
                    <span style={{ fontSize: '0.65em', fontWeight: 400, marginLeft: 1 }}>%</span>
                </span>
            ) : (
                '--'
            ),
            stateText: known ? `${Math.round(open)} % ${t('open')}` : '--',
            marker: { text: known ? `${Math.round(open)}` : '--', unit: '%' },
            footer:
                byLevel && data.oid ? (
                    <FatSlider
                        value={asNumber(context.valueOf('oid')) ?? min}
                        min={min}
                        max={max}
                        step={step}
                        disabled={!data.oid}
                        color={accent}
                        // the window follows the knob while it is dragged, not only when it is let go
                        onChange={value => show(value, true)}
                        onChangeCommitted={value => show(value, false)}
                    />
                ) : null,
        };
    },
});

export default blindDevice;
