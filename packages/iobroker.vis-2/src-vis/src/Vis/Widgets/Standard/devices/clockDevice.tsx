import React from 'react';

import { Schedule as ClockIcon } from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';

import ClockFace from '../Base/controls/ClockFace';
import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface ClockRxData extends StandardRxData {
    /** `analog` or `digital` */
    mode?: 'analog' | 'digital';
    withSeconds?: boolean | 'true';
    withDate?: boolean | 'true';
    color?: string;
}

/**
 * The clock: the one thing on a dashboard that is not a device.
 *
 * A tablet on a wall is a clock for most of the day, and one that has to be read off the corner of
 * the system bar is no clock. With hands or in digits, with the date under it.
 *
 * It ticks by itself, so it is the only widget of these sets that changes without a state changing.
 */
const clockDevice = defineDeviceWidget<ClockRxData>({
    name: 'Clock',
    label: 'widget_clock',
    help: 'help_clock',
    picture: {
        glyph:
            '<circle cx="12" cy="12" r="8.5" stroke-width="2"/>' +
            '<path d="M12 7v5.5l3.5 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        value: '14:25',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M16 9v7.5l5 3" stroke="currentColor" stroke-width="2.5" ' +
        'stroke-linecap="round" stroke-linejoin="round"/></svg>',
    deviceTypes: [],
    fields: [
        {
            name: 'mode',
            type: 'select',
            label: 'clock_mode',
            default: 'analog',
            options: [
                { value: 'analog', label: 'clock_analog' },
                { value: 'digital', label: 'clock_digital' },
            ],
        },
        { name: 'withSeconds', type: 'checkbox', label: 'clock_seconds' },
        { name: 'withDate', type: 'checkbox', label: 'clock_date' },
        { name: 'color', type: 'color', label: 'clock_color' },
    ],
    tile: { columns: 4, rows: 4, minColumns: 2, minRows: 2 },
    markerShape: 'value',
    render: context => {
        const { data, accents, theme } = context;

        return {
            accent: data.color || accents.blue,
            active: false,
            icon: <ClockIcon style={{ width: '100%', height: '100%' }} />,
            body:
                context.layout === 'default' ? (
                    <TickingClock
                        data={data}
                        context={context}
                    />
                ) : null,
            // a marker is too small for a face, so it carries the time as its number
            marker: { text: new Date().toLocaleTimeString(I18n.getLanguage(), { hour: '2-digit', minute: '2-digit' }) },
            value:
                context.layout === 'default'
                    ? undefined
                    : new Date().toLocaleTimeString(I18n.getLanguage(), { hour: '2-digit', minute: '2-digit' }),
            valueColor: data.color || theme.palette.text.primary,
        };
    },
});

/**
 * The clock that keeps itself up to date.
 *
 * It has to be a component of its own: a widget is drawn again when one of its states changes, and a
 * clock has no state. The timer runs once a second where the seconds are shown and once every ten
 * otherwise - a minute hand that jumps a minute late is a broken clock, one that is redrawn sixty
 * times for nothing is a warm tablet.
 *
 * @param props - the settings of the widget and its context
 * @param props.data - what the widget was told to show
 * @param props.context - the theme and the colours to draw with
 */
function TickingClock(props: {
    data: ClockRxData;
    context: Parameters<Parameters<typeof defineDeviceWidget<ClockRxData>>[0]['render']>[0];
}): React.JSX.Element {
    const withSeconds = props.data.withSeconds === true || props.data.withSeconds === 'true';
    const [now, setNow] = React.useState(() => new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), withSeconds ? 1000 : 10000);
        return () => clearInterval(timer);
    }, [withSeconds]);

    const language = I18n.getLanguage();

    return (
        <ClockFace
            mode={props.data.mode === 'digital' ? 'digital' : 'analog'}
            now={now}
            withSeconds={withSeconds}
            dateText={
                props.data.withDate === true || props.data.withDate === 'true'
                    ? now.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })
                    : undefined
            }
            language={language}
            ink={props.data.color || props.context.theme.palette.text.primary}
            quiet={props.context.theme.palette.text.secondary}
            accent={props.data.color || props.context.accents.red}
        />
    );
}

export default clockDevice;
