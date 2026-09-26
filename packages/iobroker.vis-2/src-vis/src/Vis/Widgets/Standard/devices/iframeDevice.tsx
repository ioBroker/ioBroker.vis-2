import React from 'react';

import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface IframeRxData extends StandardRxData {
    /** The address of the page to show */
    src?: string;
    /** How often the page is loaded again, in seconds; 0 leaves it alone */
    refresh?: number | string;
    /** The page may scroll inside its box */
    scrolling?: boolean | 'true';
    /** How round the corners are */
    radius?: number | string;
}

/**
 * A web page inside a widget: a camera, a chart of another adapter, a timetable, a map.
 *
 * Not everything worth showing on a dashboard is a state, and not everything that is a state is worth
 * rebuilding as a widget. The page is loaded as it is, and reloaded every so often where it is one of those
 * that never update themselves.
 *
 * What it cannot do is reach into the page: a browser keeps a frame from another site to itself, and that is
 * the right way round. A page that refuses to be framed at all - most login pages do - stays blank, and there
 * is nothing a widget can do about that either.
 */
const iframeDevice = defineDeviceWidget<IframeRxData>({
    name: 'Iframe',
    label: 'widget_iframe',
    help: 'help_iframe',
    picture: {
        glyph:
            '<rect x="3" y="5" width="18" height="14" rx="2" stroke-width="2"/>' +
            '<path d="M3 9h18" stroke-width="2"/>',
        frame: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="4" y="6" width="24" height="20" rx="2" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M4 12h24" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="8" cy="9" r="1.2" fill="currentColor"/></svg>',
    deviceTypes: [],
    // a page is a rectangle, not a card and not a coin
    bare: true,
    box: { width: 320, height: 240 },
    fields: [
        { name: 'src', label: 'iframe_src' },
        { name: 'oid', type: 'id', label: 'iframe_oid', tooltip: 'iframe_oid_tooltip' },
        { name: 'refresh', type: 'number', label: 'iframe_refresh', min: 0 },
        { name: 'scrolling', type: 'checkbox', label: 'iframe_scrolling' },
        { name: 'radius', type: 'number', label: 'iframe_radius', min: 0, max: 40 },
    ],
    tile: { columns: 6, rows: 4, minColumns: 3, minRows: 2 },
    render: context => {
        const { data, theme } = context;
        const fromState = data.oid ? context.valueOf('oid') : undefined;
        const src = (typeof fromState === 'string' && fromState) || data.src || '';

        return {
            accent: theme.palette.primary.main,
            body: src ? (
                <IframeBody
                    src={src}
                    refresh={Number(data.refresh) || 0}
                    scrolling={data.scrolling === true || data.scrolling === 'true'}
                    radius={Number(data.radius) || 0}
                    editMode={context.editMode}
                />
            ) : (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px dashed ${theme.palette.divider}`,
                        borderRadius: Number(data.radius) || 0,
                        color: theme.palette.text.disabled,
                        fontSize: 13,
                    }}
                >
                    {context.t('iframe_src')}
                </div>
            ),
            stateText: src,
        };
    },
});

interface IframeBodyProps {
    src: string;
    /** How often the page is loaded again, in seconds */
    refresh: number;
    scrolling: boolean;
    radius: number;
    /** In the editor the page is only shown, never clicked */
    editMode: boolean;
}

/**
 * The frame itself, and what makes it load the page again.
 *
 * The reload is a counter in the address rather than a new element: replacing the element makes the widget
 * blink white every time, and a camera that blinks every ten seconds is worse than one that lags.
 *
 * @param props - the address, how often to reload it and how it should look
 */
function IframeBody(props: IframeBodyProps): React.JSX.Element {
    const [round, setRound] = React.useState(0);

    React.useEffect(() => {
        if (!props.refresh) {
            return;
        }
        const timer = setInterval(() => setRound(current => current + 1), Math.max(1, props.refresh) * 1000);
        return () => clearInterval(timer);
    }, [props.refresh]);

    const url = round ? `${props.src}${props.src.includes('?') ? '&' : '?'}_=${round}` : props.src;

    return (
        <iframe
            src={url}
            title={props.src}
            scrolling={props.scrolling ? 'yes' : 'no'}
            style={{
                width: '100%',
                height: '100%',
                border: 0,
                borderRadius: props.radius || undefined,
                display: 'block',
                // in the editor the page belongs to the editor: a click there selects the widget
                pointerEvents: props.editMode ? 'none' : undefined,
            }}
        />
    );
}

export default iframeDevice;
