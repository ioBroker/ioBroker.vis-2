import React from 'react';

import { Schedule as ClockIcon } from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';

import ClockFace from '../Base/controls/ClockFace';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

interface ClockRxData extends StandardRxData {
    /** `analog` or `digital` */
    mode?: 'analog' | 'digital';
    withSeconds?: boolean | 'true';
    withDate?: boolean | 'true';
    color?: string;
}

/** A checkbox that was switched off is `false`, one that was never touched is nothing at all */
function isOn(value: boolean | 'true' | undefined): boolean {
    return value === true || value === 'true';
}

/**
 * The moment, kept up to date.
 *
 * It has to be a hook and not a value worked out while the widget is drawn: a widget is drawn again when one
 * of its states changes, and a clock has no state - one drawn once would stand still until something else on
 * the page moved. The timer runs once a second where the seconds are shown and once every ten otherwise: a
 * minute hand that jumps a minute late is a broken clock, one that is redrawn sixty times for nothing is a
 * warm tablet.
 *
 * @param withSeconds - the seconds are shown, so the clock has to keep up with them
 */
function useNow(withSeconds: boolean): Date {
    const [now, setNow] = React.useState(() => new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), withSeconds ? 1000 : 10000);
        return () => clearInterval(timer);
    }, [withSeconds]);

    return now;
}

/**
 * The time in digits, with the date under it where that was asked for.
 *
 * This is what the clock is in every layout that has no room for a face: the value of a card, the number of a
 * marker. The sizes are relative, so it fits the place it is put into without being told how large that is.
 *
 * @param props - what the widget was told to show
 * @param props.data - the settings of the widget
 */
function LiveTime(props: { data: ClockRxData }): React.JSX.Element {
    const withSeconds = isOn(props.data.withSeconds);
    const now = useNow(withSeconds);
    const language = I18n.getLanguage();

    const time = now.toLocaleTimeString(language, {
        hour: '2-digit',
        minute: '2-digit',
        ...(withSeconds ? { second: '2-digit' } : {}),
    });

    /*
     * As large as the place it is in allows, which is not the size that place offers.
     *
     * A marker takes its sizes from its height, and the time is the one value of these sets whose length is
     * not known in advance: `18:22` is five characters, `6:27:44 PM` is ten, and which of the two it is
     * depends on the language and on the settings. So the width of the widget has a say as well, and the
     * digits shrink rather than run out of the capsule. `1em` is the size the frame offered.
     */
    // a character is about six tenths of its size wide, and the symbol beside it wants its share of the box
    const widest = (100 / (time.length * 1.18)).toFixed(1);
    const style: React.CSSProperties = { fontSize: `min(1em, ${widest}cqw, 40cqh)`, whiteSpace: 'nowrap' };

    if (!isOn(props.data.withDate)) {
        return <span style={style}>{time}</span>;
    }

    return (
        <span
            style={{
                ...style,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                lineHeight: 1.05,
            }}
        >
            <span>{time}</span>
            <span style={{ fontSize: '0.42em', opacity: 0.75 }}>
                {now.toLocaleDateString(language, { day: 'numeric', month: 'short' })}
            </span>
        </span>
    );
}

/**
 * The clock as a drawing: hands on a face, or the digits written large.
 *
 * @param props - the settings of the widget and the colours to draw with
 * @param props.data - what the widget was told to show
 * @param props.context - the theme and the colours of the set
 * @param props.withDate - the date under the time; a marker has no room for it
 */
function LiveClock(props: {
    data: ClockRxData;
    context: DeviceContext<ClockRxData>;
    withDate?: boolean;
}): React.JSX.Element {
    const withSeconds = isOn(props.data.withSeconds);
    const now = useNow(withSeconds);
    const language = I18n.getLanguage();

    return (
        <ClockFace
            mode={props.data.mode === 'digital' ? 'digital' : 'analog'}
            now={now}
            withSeconds={withSeconds}
            dateText={
                props.withDate && isOn(props.data.withDate)
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

/**
 * The clock: the one thing on a dashboard that is not a device.
 *
 * A tablet on a wall is a clock for most of the day, and one that has to be read off the corner of the system
 * bar is no clock. With hands or in digits, with the date under it.
 *
 * It ticks by itself, so it is the only widget of these sets that changes without a state changing - and
 * everything it shows is therefore a component and not a string worked out while the widget is drawn. On a
 * floor plan the marker is the clock: with hands it is the face itself, with digits the time in the capsule.
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
        const analog = data.mode !== 'digital';

        /*
         * On a plan the clock is the marker.
         *
         * With hands that means the face fills it - a circle with a small clock drawn in it is a symbol of a
         * clock and not a clock. With digits the time stands in the capsule where other devices put their
         * reading. Either way it is a component, so it keeps running; the time this widget showed before was
         * the one at which the page happened to be drawn, and it stayed there.
         */
        if (context.set === 'absolute') {
            return {
                accent: data.color || accents.blue,
                active: false,
                icon: <ClockIcon style={{ width: '100%', height: '100%' }} />,
                face: analog ? (
                    <LiveClock
                        data={data}
                        context={context}
                    />
                ) : undefined,
                marker: analog ? undefined : { text: <LiveTime data={data} /> },
                valueColor: data.color || theme.palette.text.primary,
            };
        }

        return {
            accent: data.color || accents.blue,
            active: false,
            icon: <ClockIcon style={{ width: '100%', height: '100%' }} />,
            body:
                context.layout === 'default' ? (
                    <LiveClock
                        data={data}
                        context={context}
                        withDate
                    />
                ) : null,
            // a tile the size of a coin has no room for a face, so it carries the time as its value
            value: context.layout === 'default' ? undefined : <LiveTime data={data} />,
            valueColor: data.color || theme.palette.text.primary,
        };
    },
});

export default clockDevice;
