import React from 'react';

import { ShowChart as ChartIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import HistoryChart from '../Base/controls/HistoryChart';
import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface ChartRxData extends StandardRxData {
    /** A second state in the same chart */
    oid2?: string;
    /** How far back it looks, in hours */
    hours?: number | string;
    /** The buttons for the period above the chart */
    toolbar?: boolean | 'true';
    /** The state is held until the next value arrives, which is how a switch behaves */
    step?: boolean | 'true';
    /** The line is drawn as a smooth curve rather than from reading to reading */
    spline?: boolean | 'true';
    color?: string;
    color2?: string;
}

/**
 * The chart: what a value did, as a card of its own.
 *
 * The measured value carries its history as a line behind its number, which is enough to see that the
 * temperature is falling. This is for the case where the course itself is the point: two states
 * against each other, a day of the heating, the power of the last week.
 *
 * It draws only what is recorded. A state that no history adapter writes has nothing to show, and the
 * card says so rather than drawing an empty box.
 */
const chartDevice = defineDeviceWidget<ChartRxData>({
    name: 'Chart',
    label: 'widget_chart',
    help: 'help_chart',
    picture: {
        glyph:
            '<path d="M3 17l5-5 4 3 6-8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M3 20.5h18" stroke-width="2" stroke-linecap="round" opacity="0.5"/>',
        chart: true,
        value: '21.5 °C',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<path d="M4 24l7-8 5 4 8-11" stroke="currentColor" stroke-width="2.5" ' +
        'stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M4 28h24" stroke="currentColor" stroke-width="2" opacity="0.5"/></svg>',
    deviceTypes: [Types.chart],
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        { name: 'oid2', type: 'id', label: 'oid_second' },
        {
            name: 'hours',
            type: 'select',
            label: 'chart_period',
            default: '24',
            options: [
                { value: '1', label: 'hours_1' },
                { value: '6', label: 'hours_6' },
                { value: '12', label: 'hours_12' },
                { value: '24', label: 'hours_24' },
                { value: '72', label: 'hours_72' },
                { value: '168', label: 'hours_168' },
            ],
        },
        { name: 'toolbar', type: 'checkbox', label: 'chart_toolbar', default: true },
        { name: 'step', type: 'checkbox', label: 'chart_step', tooltip: 'chart_step_tooltip' },
        {
            name: 'spline',
            type: 'checkbox',
            label: 'chart_spline',
            tooltip: 'chart_spline_tooltip',
            hidden: 'data.step === true',
        },
        { name: 'color', type: 'color', label: 'chart_color' },
        { name: 'color2', type: 'color', label: 'chart_color_second' },
    ],
    tile: { columns: 'full', rows: 4, minColumns: 4, minRows: 3 },
    markerShape: 'icon',
    // a chart the size of a coin says nothing; the click brings up the card
    popup: true,
    render: context => {
        const { data, accents, theme, t } = context;
        const history = context.historyOf('oid');
        const history2 = data.oid2 ? context.historyOf('oid2') : null;
        const common = context.commonOf('oid');
        const common2 = context.commonOf('oid2');
        const step = data.step === true || data.step === 'true';

        return {
            accent: history ? accents.blue : accents.off,
            active: false,
            icon: <ChartIcon style={{ width: '100%', height: '100%' }} />,
            body:
                context.layout !== 'default' ? null : history && common ? (
                    <HistoryChart
                        socket={context.socket}
                        obj={{ _id: data.oid, common }}
                        obj2={data.oid2 && common2 ? { _id: data.oid2, common: common2 } : undefined}
                        historyInstance={history}
                        historyInstance2={history2}
                        objStep={step}
                        obj2Step={step}
                        spline={data.spline === true || data.spline === 'true'}
                        hours={asNumber(data.hours) ?? 24}
                        color={data.color}
                        color2={data.color2}
                        themeType={context.themeType}
                        isFloatComma={context.isFloatComma}
                        noToolbar={!(data.toolbar === true || data.toolbar === 'true')}
                        t={context.t}
                    />
                ) : (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: 8,
                            boxSizing: 'border-box',
                            color: theme.palette.text.disabled,
                            fontSize: 12,
                        }}
                    >
                        {history === undefined ? '' : t('chart_no_history')}
                    </div>
                ),
            stateText: common?.name ? context.t('widget_chart') : '',
            // on a plan it is a marker, and the click opens the chart with its axes
            chart: { attrs: ['oid', 'oid2'], hours: asNumber(data.hours) ?? 24, color: data.color },
        };
    },
});

export default chartDevice;
