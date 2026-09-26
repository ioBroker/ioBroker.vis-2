import React from 'react';

import type { VisTheme } from '@iobroker/types-vis-2';

import { cardFill, type StandardTokens } from './tokens';

/**
 * How a widget arranges what it shows.
 *
 * The three follow `ioBroker.aura`, whose widgets these sets are modelled on, and they change a page more than
 * any other setting: the same devices read as a list, as a form or as a wall of coloured tiles.
 */
export type StandardWidgetLayout =
    /** The name quietly on top, the value and the control at the bottom edge */
    | 'default'
    /** One row: icon, name, control - a list of devices */
    | 'compact'
    /** The whole tile in the colour of the state, everything centred and white */
    | 'card';

export interface StandardFrameProps {
    layout: StandardWidgetLayout;
    /** The name of the device */
    title?: string;
    /** The icon of the device, drawn in `currentColor` */
    icon?: React.ReactNode;
    /** The colour the state gives this device: its icon, its value and, in the `card` layout, the whole tile */
    accent: string;
    /** Whether the device is doing something, which is what fills a card */
    active?: boolean;
    /** The big line at the bottom: a value with its unit, or a word like `ON` */
    value?: React.ReactNode;
    /** What the value is drawn in; without it the value takes the text colour of the theme */
    valueColor?: string;
    /** An arrow beside the value, saying which way it has gone */
    trend?: React.ReactNode;
    /** A quiet word left of the value, like `closed` on a blind */
    label?: string;
    /** What stands beside the value: a toggle, a button */
    control?: React.ReactNode;
    /** Something that fills the middle, like the window of a blind */
    body?: React.ReactNode;
    /** What stands beside that drawing: the up, stop and down buttons of a blind */
    aside?: React.ReactNode;
    /** What gets the whole width of the bottom: a slider */
    footer?: React.ReactNode;
    /** Drawn behind everything and clipped to the card, like the history of a value */
    background?: React.ReactNode;
    /** No card around it: only what the widget shows, for a widget on a floor plan */
    noCard?: boolean;
    /**
     * What is in this card may react to how much room the card has.
     *
     * It makes the card a container in the sense of a container query, which a widget that leaves parts of
     * itself out on a short card needs - see `.vis-thermostat-modes` in `Vis/css/vis.css`. Only the widgets
     * that ask for it: a box of the type `size` takes its size from its own box and never from what is in it,
     * which is right for a card that fills its cell and wrong for one that grows with its content.
     */
    container?: boolean;
    tokens: StandardTokens;
    theme: VisTheme;
    onClick?: () => void;
}

/**
 * The card every widget of the sets `relative` and `absolute` sits in.
 *
 * It is the one place that knows what these widgets look like, so that twelve devices read as one set: the
 * paper of the theme with a 1px line around it, a quiet name over a big value, and the control at the bottom
 * edge. It fills whatever box it is given - a cell of a section or a dragged rectangle - so the two sets differ
 * in their size, not in their look. There is no hover: a wall tablet has none, and a board that only tells you
 * what it means when a mouse is over it tells half its users nothing.
 *
 * @param props - what to show, in which layout and at which size
 */
export default function StandardFrame(props: StandardFrameProps): React.JSX.Element {
    const { tokens, theme, accent, layout } = props;

    const iconBox = (color: string, glow?: boolean): React.JSX.Element | null =>
        props.icon ? (
            <div
                style={{
                    width: tokens.iconSize,
                    height: tokens.iconSize,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color,
                    filter: glow ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))' : undefined,
                }}
            >
                {props.icon}
            </div>
        ) : null;

    // the arrow is drawn as large as the box it is given, so its size is decided here and not by the device
    const trendBox = (size: number): React.JSX.Element | null =>
        props.trend ? (
            <div
                style={{
                    width: size,
                    height: size,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {props.trend}
            </div>
        ) : null;

    const name = (size: number, color: string, weight?: number): React.JSX.Element | null =>
        props.title ? (
            <div
                style={{
                    fontSize: size,
                    fontWeight: weight,
                    color,
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {props.title}
            </div>
        ) : null;

    let content: React.JSX.Element;

    if (layout === 'card') {
        // the tile takes the colour of the state; what is written on it is white and sits in the middle
        const fill = cardFill(accent, !!props.active, theme);
        content = (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: tokens.gap,
                    borderRadius: tokens.radius,
                    transition: 'background 0.3s, border-color 0.3s',
                    ...fill,
                }}
            >
                {props.icon ? (
                    <div
                        style={{
                            width: tokens.iconSize * 1.6,
                            height: tokens.iconSize * 1.6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            filter: props.active ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))' : undefined,
                        }}
                    >
                        {props.icon}
                    </div>
                ) : null}
                {props.title ? (
                    <div
                        style={{
                            fontSize: tokens.smallSize,
                            fontWeight: 700,
                            maxWidth: '100%',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {props.title}
                    </div>
                ) : null}
                {props.value !== undefined && props.value !== null ? (
                    <div
                        style={{
                            fontSize: tokens.titleSize,
                            opacity: 0.85,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        {props.value}
                        {trendBox(tokens.titleSize)}
                    </div>
                ) : null}
            </div>
        );
    } else if (layout === 'compact') {
        // one row: what the device is on the left, what it does on the right
        content = (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.gap,
                }}
            >
                {iconBox(accent)}
                {name(tokens.smallSize, theme.palette.text.primary)}
                {props.value !== undefined && props.value !== null ? (
                    <div
                        style={{
                            flexShrink: 0,
                            fontSize: tokens.smallSize,
                            fontWeight: 600,
                            color: props.valueColor || accent,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        {props.value}
                        {trendBox(tokens.smallSize)}
                    </div>
                ) : null}
                {props.control ? <div style={{ flexShrink: 0 }}>{props.control}</div> : null}
            </div>
        );
    } else {
        /*
         * The arrangement of `ioBroker.aura`, which these widgets follow:
         *
         *   name                          the header, quiet
         *   0%                   [toggle] the value with what acts on it beside it
         *   +------------------+ [up   ]  what the device draws, if it draws anything
         *   |     drawing      | [stop ]
         *   +------------------+ [down ]
         *   closed                    0%  a word and the value, where the drawing took the row above
         *   =========O============     a slider over the whole width
         *
         * Where the value row sits follows from what else there is: with a drawing it comes under it, with a
         * slider but no drawing it comes right under the name, and with neither it drops to the bottom edge.
         */
        const hasValue = props.value !== undefined && props.value !== null;
        const valueUnderName = hasValue && !props.body && !!props.footer;
        const valueUnderBody = hasValue && !!props.body;
        const valueAtBottom = hasValue && !props.body && !props.footer;

        const valueRow = (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: tokens.gap,
                    flexShrink: 0,
                }}
            >
                {props.label ? (
                    <div style={{ fontSize: tokens.smallSize, color: theme.palette.text.secondary, minWidth: 0 }}>
                        {props.label}
                    </div>
                ) : null}
                <div
                    style={{
                        fontSize: tokens.valueSize,
                        fontWeight: 700,
                        lineHeight: 1.1,
                        minWidth: 0,
                        // a word in front of it means the value belongs to the right, as on a blind
                        marginLeft: props.label ? 'auto' : undefined,
                        color: props.valueColor || theme.palette.text.primary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    {props.value}
                    {trendBox(Math.round(tokens.valueSize * 0.85))}
                </div>
                {props.control ? <div style={{ flexShrink: 0 }}>{props.control}</div> : null}
            </div>
        );

        content = (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: tokens.gap,
                    minHeight: 0,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.gap, flexShrink: 0 }}>
                    {props.title || props.icon ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.gap }}>
                            {iconBox(accent)}
                            {name(tokens.titleSize, theme.palette.text.secondary)}
                        </div>
                    ) : null}
                    {valueUnderName ? valueRow : null}
                </div>
                {props.body ? (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: tokens.gap }}>
                        <div style={{ flex: 1, minWidth: 0 }}>{props.body}</div>
                        {props.aside ? <div style={{ flexShrink: 0 }}>{props.aside}</div> : null}
                    </div>
                ) : null}
                {valueUnderBody ? valueRow : null}
                {props.footer ? <div style={{ flexShrink: 0, width: '100%' }}>{props.footer}</div> : null}
                {valueAtBottom || (!hasValue && props.control) ? valueRow : null}
            </div>
        );
    }

    return (
        <div
            onClick={props.onClick}
            className={props.container ? 'vis-card-container' : undefined}
            style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                position: 'relative',
                cursor: props.onClick ? 'pointer' : undefined,
                // the `card` layout paints itself, and a widget without a card carries nothing of its own
                ...(props.noCard || layout === 'card'
                    ? undefined
                    : {
                          background: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: tokens.radius,
                          // a light theme lifts its cards off the page, a dark one draws them flat
                          boxShadow: theme.palette.mode === 'light' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                          padding: tokens.padding,
                      }),
            }}
        >
            {props.background ? (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: props.noCard ? undefined : tokens.radius,
                        overflow: 'hidden',
                        pointerEvents: 'none',
                    }}
                >
                    {props.background}
                </div>
            ) : null}
            {props.background ? <div style={{ position: 'relative', height: '100%' }}>{content}</div> : content}
        </div>
    );
}
