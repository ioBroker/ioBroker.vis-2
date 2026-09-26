import React from 'react';

import { TrendingUp as ValueIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import type { RxWidgetInfoAttributesField } from '@iobroker/types-vis-2';

import Sparkline from '../Base/controls/Sparkline';
import TrendArrow from '../Base/controls/TrendArrow';
import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface ValueRxData extends StandardRxData {
    /** A second value beside the first, like the humidity next to the temperature */
    oid2?: string;
    unit?: string;
    unit2?: string;
    /** Places after the point; without it the value is shown as it comes */
    digits?: number | string;
    /** Below this the value is drawn as a warning */
    min?: number | string;
    /** Above this the value is drawn as a warning */
    max?: number | string;
    /** Draw what the value did behind the card */
    chart?: boolean | 'true';
    /** How far back that drawing goes, in hours */
    chartHours?: number | string;
    /** Over how many seconds the drawing is averaged */
    chartSmoothing?: number | string;
    /** Draw the line as a smooth curve rather than from reading to reading */
    chartSpline?: boolean | 'true';
    /** A click on the card opens the chart of the value */
    chartClick?: boolean | 'true';
    /** Say which way the value has gone, as an arrow beside it */
    trend?: boolean | 'true';
    /** Over how many hours the value is compared with itself */
    trendHours?: number | string;
    /** A change smaller than this counts as no change */
    trendThreshold?: number | string;
    trendUpColor?: string;
    trendDownColor?: string;
}

/** The periods a history is offered over */
const HOURS = [
    { value: '1', label: 'hours_1' },
    { value: '6', label: 'hours_6' },
    { value: '12', label: 'hours_12' },
    { value: '24', label: 'hours_24' },
    { value: '72', label: 'hours_72' },
    { value: '168', label: 'hours_168' },
];

/**
 * Whether a setting that comes as a checkbox is on.
 *
 * A project may hold it as a word rather than as a boolean, and a widget that was put on a page before the
 * setting existed holds nothing at all - which is where `fallback` comes in: the default of a field is written
 * into a widget when it is created, so an older widget has to be told the same thing a second time here.
 *
 * @param value - what the widget carries
 * @param fallback - what the field says as its default
 */
function isOn(value: boolean | 'true' | undefined, fallback = false): boolean {
    if (value === undefined || value === null || (value as string) === '') {
        return fallback;
    }
    return value === true || value === 'true';
}

/** The number as it is written out, without its unit */
function format(value: unknown, digits: number | null, isComma: boolean): string {
    const num = asNumber(value);
    if (num === null) {
        if (typeof value === 'string' && value) {
            return value;
        }
        if (typeof value === 'boolean') {
            return `${value}`;
        }
        return '--';
    }
    const text = digits === null ? num.toString() : num.toFixed(digits);
    return isComma ? text.replace('.', ',') : text;
}

/**
 * The measured value: temperature, humidity, brightness, pressure - a number to read, not to set.
 *
 * The number is the biggest thing on the card and the unit rides behind it, small and quiet, sitting on the
 * same baseline. A second value - the humidity next to the temperature - stands beside it in the same way.
 *
 * Where the state is logged, the card can say more than the moment: the shape of the last hours as a line
 * behind the number, an arrow for which way it has gone, and the whole chart with its axes behind a click on
 * the card. All three need a history adapter on the state and none of them says a word when there is none -
 * the card is then simply the number, as it was.
 */
const valueDevice = defineDeviceWidget<ValueRxData>({
    name: 'Value',
    label: 'widget_value',
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28">' +
        '<text x="16" y="22" text-anchor="middle" font-size="17" font-weight="600" ' +
        'font-family="system-ui, sans-serif" fill="currentColor">21°</text></svg>',
    help: 'help_value',
    picture: {
        glyph:
            '<path d="M3 17l6-6 4 4 7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M15 8h5v5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        value: '21.5 °C',
        chart: true,
    },
    deviceTypes: [
        Types.temperature,
        Types.humidity,
        Types.illuminance,
        Types.pressure,
        Types.airQuality,
        Types.flow,
        Types.electricity,
    ],
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        { name: 'unit', label: 'unit' },
        { name: 'oid2', type: 'id', label: 'oid_second' },
        { name: 'unit2', label: 'unit_second' },
        { name: 'digits', type: 'number', label: 'digits', min: 0, max: 5 },
        { name: 'min', type: 'number', label: 'min' },
        { name: 'max', type: 'number', label: 'max' },
    ],
    // a card can carry the history behind itself, a marker the size of a coin cannot - the arrow and the
    // chart behind a click it can
    groups: set => [
        {
            name: 'history',
            label: 'group_history',
            fields: [
                ...(set === 'relative'
                    ? ([
                          { name: 'chart', type: 'checkbox', label: 'chart', default: true },
                          {
                              name: 'chartSmoothing',
                              type: 'select',
                              label: 'chart_smoothing',
                              default: '0',
                              tooltip: 'chart_smoothing_tooltip',
                              hidden: '!data.chart',
                              options: [
                                  { value: '0', label: 'smoothing_off' },
                                  { value: '60', label: 'smoothing_1m' },
                                  { value: '300', label: 'smoothing_5m' },
                                  { value: '900', label: 'smoothing_15m' },
                                  { value: '3600', label: 'smoothing_1h' },
                              ],
                          },
                          {
                              name: 'chartHours',
                              type: 'select',
                              label: 'chart_period',
                              default: '24',
                              options: HOURS,
                              hidden: '!data.chart',
                          },
                      ] as RxWidgetInfoAttributesField[])
                    : []),
                {
                    name: 'chartSpline',
                    type: 'checkbox',
                    label: 'chart_spline',
                    tooltip: 'chart_spline_tooltip',
                    hidden: '!data.chart && !data.chartClick',
                },
                { name: 'chartClick', type: 'checkbox', label: 'chart_on_click', default: true },
                { name: 'trend', type: 'checkbox', label: 'trend' },
                {
                    name: 'trendHours',
                    type: 'select',
                    label: 'trend_period',
                    default: '1',
                    options: HOURS,
                    hidden: '!data.trend',
                },
                { name: 'trendThreshold', type: 'number', label: 'trend_threshold', hidden: '!data.trend' },
                { name: 'trendUpColor', type: 'color', label: 'trend_up_color', hidden: '!data.trend' },
                { name: 'trendDownColor', type: 'color', label: 'trend_down_color', hidden: '!data.trend' },
            ],
        },
    ],
    tile: { columns: 6, rows: 2, minColumns: 3 },
    markerShape: 'value',
    render: context => {
        const { data, tokens, theme, isFloatComma, accents } = context;
        const raw = context.valueOf('oid');
        const value = asNumber(raw);
        const digits = asNumber(data.digits);

        const min = asNumber(data.min);
        const max = asNumber(data.max);
        const outOfRange = value !== null && ((min !== null && value < min) || (max !== null && value > max));
        const known = raw !== undefined && raw !== null;
        const accent = !known ? accents.off : outOfRange ? accents.yellow : accents.blue;
        // A measured value does nothing - it is read. Only one that has left its limits fills its card or its
        // marker; a floor plan where every thermometer is a solid disc is what the markers are meant to avoid.
        const alarming = known && outOfRange;

        // whether there is a history at all is the object's business, not a setting: a state that nothing
        // logs gets no line, no arrow and no chart, whatever the widget was told
        const history = context.historyOf('oid');

        /** The number big, the unit behind it on the same baseline */
        const withUnit = (text: string, unit: string | undefined, size: number): React.JSX.Element => (
            <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: size, lineHeight: 1 }}>{text}</span>
                {unit ? (
                    <span
                        style={{
                            fontSize: Math.round(size * 0.65),
                            fontWeight: 400,
                            color: theme.palette.text.secondary,
                            lineHeight: 1.4,
                        }}
                    >
                        {unit}
                    </span>
                ) : null}
            </span>
        );

        return {
            accent,
            active: alarming,
            icon: <ValueIcon style={{ width: '100%', height: '100%' }} />,
            background:
                history && isOn(data.chart, true) && context.set === 'relative' ? (
                    <Sparkline
                        socket={context.socket}
                        oid={data.oid}
                        instance={history}
                        hours={asNumber(data.chartHours) ?? 24}
                        smoothing={asNumber(data.chartSmoothing) ?? 0}
                        spline={isOn(data.chartSpline)}
                        latest={value ?? undefined}
                        color={accent}
                    />
                ) : null,
            value: withUnit(format(raw, digits, isFloatComma), data.unit, tokens.valueSize),
            // how large the arrow is drawn is the frame's business: a card gives it the size of its value, a
            // marker a share of its own
            trend:
                history && isOn(data.trend) ? (
                    <TrendArrow
                        socket={context.socket}
                        oid={data.oid}
                        instance={history}
                        hours={asNumber(data.trendHours) ?? 1}
                        latest={value ?? undefined}
                        threshold={asNumber(data.trendThreshold) ?? 0}
                        // a filled card or marker draws everything in white, and a blue arrow on a blue disc
                        // is no arrow at all
                        upColor={data.trendUpColor || (alarming ? '#fff' : accents.red)}
                        downColor={data.trendDownColor || (alarming ? '#fff' : accents.blue)}
                        flatColor={alarming ? '#fff' : accents.off}
                    />
                ) : null,
            stateText: `${format(raw, digits, isFloatComma)}${data.unit ? ` ${data.unit}` : ''}`,
            // a marker shows the number itself, which is the whole point of a measured value
            marker: { text: format(raw, digits, isFloatComma), unit: data.unit },
            valueColor: outOfRange ? accents.yellow : undefined,
            chart: isOn(data.chartClick, true)
                ? {
                      attrs: ['oid', 'oid2'],
                      color: accent,
                      hours: asNumber(data.chartHours) ?? 24,
                      spline: isOn(data.chartSpline),
                  }
                : undefined,
            control: data.oid2
                ? withUnit(format(context.valueOf('oid2'), digits, isFloatComma), data.unit2, tokens.smallSize)
                : null,
        };
    },
});

export default valueDevice;
