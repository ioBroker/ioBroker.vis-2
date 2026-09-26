import React from 'react';

import type { VisTheme } from '@iobroker/types-vis-2';

/**
 * How much a marker of the set `absolute` says about itself.
 *
 * On a floor plan the room usually says what a device is, so the icon alone is the normal case; a plan that is
 * not labelled wants the name under it, and one that is read from across the room the state as well.
 */
export type MarkerLayout =
    /** Only the marker */
    | 'icon'
    /** The marker with the name under it */
    | 'name'
    /** The marker with the name and what the device is doing under it */
    | 'state';

export interface MarkerFrameProps {
    layout: MarkerLayout;
    /** The name under the marker */
    title?: string;
    /** What the device is doing, in two or three words, under the name */
    stateText?: string;
    /** The icon, drawn in `currentColor` */
    icon?: React.ReactNode;
    /** A short number beside the icon, like `21.5` with `°C`; without it the marker is only the icon */
    marker?: { text: string; unit?: string };
    /** An arrow behind the number, saying which way it has gone */
    trend?: React.ReactNode;
    /** The colour the state gives this device */
    accent: string;
    /** Whether the device is doing something: then the marker fills with its colour and glows brightly */
    active?: boolean;
    theme: VisTheme;
    onClick?: () => void;
}

/**
 * The size of the marker, as a length the browser works out from the box the widget was given.
 *
 * `cqh` and `cqw` are hundredths of the height and the width of the nearest container - here the body of the
 * widget, which is `100%` of a box the editor sizes. Everything on the marker is a multiple of this one length,
 * so the whole thing follows the widget while it is dragged, without a line of JavaScript.
 *
 * This is the third attempt and the first that holds. Percentages of a box that has no height of its own gave
 * an icon ten times the size of its marker. Measuring the box and keeping it in the state of the component
 * followed the mouse in theory, but the widget is re-rendered often enough that the measurement never
 * survived. A container query asks the browser, which knows the answer at every frame, and it cannot loop
 * either: a container of the type `size` is measured without looking at what is in it.
 *
 * The `max()` keeps a marker visible where there is no height to ask for - one of these widgets dropped into a
 * section of a grid, for instance. Which way round the marker arranges itself is a container query too, in
 * `Vis/css/vis.css`: wide is a capsule, square shows the number alone, tall puts the icon above it.
 */
const MARKER_SIZE: Record<MarkerLayout, string> = {
    icon: 'max(20px, min(100cqh, 100cqw))',
    name: 'max(18px, min(74cqh, 100cqw))',
    state: 'max(16px, min(58cqh, 100cqw))',
};

/**
 * The lines under the marker, in hundredths of the height of the box.
 *
 * They are measured against the box and not against the marker, and together with `MARKER_SIZE` they add up to
 * less than a hundred - a line box is about 1.2 times its font, so 74 + 2 + 18 * 1.2 is 97.6 of the height.
 * Measuring them against the marker is what pushed the whole thing out of its box: the marker was already
 * two thirds of the height, and two lines of a fifth of it each did not fit in the third that was left.
 */
const CAPTION_SIZE = {
    name: { name: 18, state: 0 },
    state: { name: 16, state: 14 },
};

/**
 * A device as a small marker, for a floor plan or a photo of a room.
 *
 * A page with an absolute layout has a picture under it, and a card would cover it, so a device is no bigger
 * than a coin: a ring in the colour of its state around a dark disc, the icon inside, and a soft glow of the
 * same colour so it is found on a busy picture. Dragged wider than it is tall it becomes a capsule with the
 * number beside the icon; dragged square it shows the number alone, because both would have to be too small;
 * dragged tall it puts the icon over the number.
 *
 * @param props - what to show and in which colour; how large and which way round follows from the box
 */
export default function MarkerFrame(props: MarkerFrameProps): React.JSX.Element {
    const { theme, accent } = props;
    const active = !!props.active;
    const withValue = !!props.marker;
    const withName = props.layout !== 'icon' && !!props.title;
    const withState = props.layout === 'state' && !!props.stateText;
    const withCaption = withName || withState;

    // one length, and everything else is a multiple of it
    const size = MARKER_SIZE[withCaption ? props.layout : 'icon'];
    const caption = CAPTION_SIZE[props.layout === 'state' ? 'state' : 'name'];
    const times = (factor: number): string => `calc(${size} * ${factor})`;
    const iconShare = withValue ? 0.5 : 0.52;

    // a marker sits on a picture, so it brings its own contrast instead of taking it from the theme
    const scrim = theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.86)' : 'rgba(17, 24, 39, 0.86)';
    const ink = theme.palette.mode === 'light' ? '#111827' : '#fff';

    const marker = (
        <div
            className={`vis-marker-body${withValue ? ' vis-marker-has-value' : ''}`}
            onClick={props.onClick}
            style={{
                // as variables, so the rules of `vis.css` can stretch the marker where the shape asks for it
                ['--vis-marker-size' as string]: size,
                ['--vis-marker-width' as string]: withValue ? '100cqw' : size,
                maxWidth: '100%',
                gap: withValue ? times(0.08) : 0,
                // the padding only keeps the contents off the ring; what is in it stands in the middle
                padding: withValue ? `0 ${times(0.14)}` : 0,
                background: active ? accent : scrim,
                border: `${times(0.055)} solid ${accent}`,
                color: active ? '#fff' : accent,
                boxShadow: active
                    ? `0 0 14px ${accent}, 0 2px 6px rgba(0, 0, 0, 0.4)`
                    : `0 0 10px ${accent}55, 0 2px 6px rgba(0, 0, 0, 0.4)`,
                transition: 'background 0.3s, box-shadow 0.3s, border-color 0.3s',
                cursor: props.onClick ? 'pointer' : undefined,
            }}
        >
            {props.icon ? (
                <div
                    className="vis-marker-icon"
                    style={{
                        width: times(iconShare),
                        height: times(iconShare),
                        // an MUI icon takes its size from the font, so it is told one that is not `1em`
                        fontSize: times(iconShare),
                    }}
                >
                    {props.icon}
                </div>
            ) : null}
            {props.marker ? (
                <div
                    className="vis-marker-value"
                    style={{ color: active ? '#fff' : ink }}
                >
                    <span style={{ fontSize: times(0.36) }}>{props.marker.text}</span>
                    {props.marker.unit ? (
                        <span style={{ fontSize: times(0.22), opacity: 0.8 }}>{props.marker.unit}</span>
                    ) : null}
                    {props.trend ? (
                        <div
                            style={{
                                width: times(0.3),
                                height: times(0.3),
                                flexShrink: 0,
                                alignSelf: 'center',
                                display: 'flex',
                            }}
                        >
                            {props.trend}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );

    return (
        <div
            // no `gap` on this element: a container query unit on the container itself looks at the container
            // ABOVE it, and with none there `2cqh` became two hundredths of the viewport - 17px instead of 3.
            // The space belongs to the caption, which is a child and therefore measures against this box.
            className={`vis-marker${withValue ? ' vis-marker-has-value' : ''}`}
        >
            {marker}
            {withCaption ? (
                <div
                    style={{
                        flexShrink: 0,
                        maxWidth: '100%',
                        minWidth: 0,
                        marginTop: '2cqh',
                        overflow: 'hidden',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        // the caption also lies on the picture, so it carries a shadow instead of a background
                        textShadow: theme.palette.mode === 'light' ? '0 1px 2px #fff' : '0 1px 3px rgba(0, 0, 0, 0.8)',
                    }}
                >
                    {withName ? (
                        <div
                            style={{
                                fontSize: `max(8px, ${caption.name}cqh)`,
                                fontWeight: 600,
                                color: theme.palette.text.primary,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {props.title}
                        </div>
                    ) : null}
                    {withState ? (
                        <div
                            style={{
                                fontSize: `max(7px, ${caption.state}cqh)`,
                                color: theme.palette.text.secondary,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {props.stateText}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
