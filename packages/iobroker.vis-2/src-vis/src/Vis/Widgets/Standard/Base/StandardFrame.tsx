import React from 'react';

import { I18n } from '@iobroker/gui-components';
import type { VisTheme } from '@iobroker/types-vis-2';

import { cardFill, type StandardTokens } from './tokens';
import { mergeFrame, NO_CSS, type WidgetCss } from './widgetCss';

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
    /**
     * The name of the device. Without one the content moves up into its place: the icon goes in front of the row
     * of the value, and without an icon as well there is no header at all
     */
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
    label?: React.ReactNode;
    /** What stands beside the value: a toggle, a button */
    control?: React.ReactNode;
    /** Something that fills the middle, like the window of a blind */
    body?: React.ReactNode;
    /** What stands beside that drawing: the up, stop and down buttons of a blind */
    aside?: React.ReactNode;
    /** What gets the whole width of the bottom: a slider */
    footer?: React.ReactNode;
    /**
     * The value stands under the name rather than under the body.
     *
     * For a card whose body is the point of it - the days of a weather forecast - rather than a drawing of
     * the value: the reading is read first and belongs at the top, and the body then gets the whole rest of
     * the card instead of a strip of it.
     */
    valueOnTop?: boolean;
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
    /** The size of the name in px, where one was set; otherwise the layout decides */
    titleSize?: number;
    /** The size of the icon in px, where one was set; otherwise the layout decides */
    iconSize?: number;
    /** The size of the value in px, where one was set; otherwise the layout decides */
    valueSize?: number;
    /** What was set in the CSS attributes of the widget, which wins over what is drawn here by default */
    css?: WidgetCss;
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
    const css = props.css || NO_CSS;

    const iconBox = (color: string, glow?: boolean): React.JSX.Element | null =>
        props.icon ? (
            <div
                style={{
                    width: props.iconSize ?? tokens.iconSize,
                    height: props.iconSize ?? tokens.iconSize,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color,
                    transition: 'color 0.3s',
                    filter: glow ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))' : undefined,
                }}
            >
                {props.icon}
            </div>
        ) : null;

    // the arrow is drawn as large as the box it is given, so its size is decided here and not by the device
    const trendBox = (size: number | string): React.JSX.Element | null =>
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

    /*
     * The name of a card may take two lines.
     *
     * On one line `Waschmaschine` and `Speicher oben` lost their ends on a tile of half a phone, and a card
     * whose name cannot be read cannot be found. A second line costs the drawing a little height, which it
     * gives back without a word; a long single word is broken at a syllable where the browser knows the
     * language, and anywhere where it does not. The one-row layout stays on one line: it has no second one.
     */
    const twoLines: React.CSSProperties = {
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        lineHeight: 1.2,
        hyphens: 'auto',
        overflowWrap: 'anywhere',
    };
    const oneLine: React.CSSProperties = {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    };

    const name = (size: number, color: string, wrap: boolean, weight?: number): React.JSX.Element | null =>
        props.title ? (
            <div
                lang={wrap ? I18n.getLanguage() : undefined}
                title={props.title}
                style={{
                    fontSize: props.titleSize ?? size,
                    fontWeight: css.text.fontWeight ?? weight,
                    color: css.text.color ?? color,
                    flex: 1,
                    minWidth: 0,
                    ...(wrap ? twoLines : oneLine),
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
                    alignItems: css.align ?? 'center',
                    justifyContent: 'center',
                    gap: tokens.gap,
                    transition: 'background 0.3s, border-color 0.3s, color 0.3s',
                    ...mergeFrame({ ...fill, borderRadius: tokens.radius }, css.frame),
                    color: css.text.color ?? fill.color,
                }}
            >
                {props.icon ? (
                    <div
                        style={{
                            width: props.iconSize ?? tokens.iconSize * 1.6,
                            height: props.iconSize ?? tokens.iconSize * 1.6,
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
                        lang={I18n.getLanguage()}
                        title={props.title}
                        style={{
                            fontSize: props.titleSize ?? tokens.smallSize,
                            fontWeight: css.text.fontWeight ?? 700,
                            maxWidth: '100%',
                            textAlign: 'center',
                            ...twoLines,
                        }}
                    >
                        {props.title}
                    </div>
                ) : null}
                {props.value !== undefined && props.value !== null ? (
                    <div
                        style={{
                            fontSize: props.valueSize ?? tokens.titleSize,
                            opacity: 0.85,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            ...css.text,
                        }}
                    >
                        {props.value}
                        {trendBox('1em')}
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
                {/* without a name something else has to keep the value and the control at the right edge */}
                {props.title ? name(tokens.smallSize, theme.palette.text.primary, false) : <div style={{ flex: 1 }} />}
                {props.value !== undefined && props.value !== null ? (
                    <div
                        style={{
                            flexShrink: 0,
                            fontSize: props.valueSize ?? tokens.smallSize,
                            fontWeight: 600,
                            color: props.valueColor || accent,
                            transition: 'color 0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            ...css.text,
                        }}
                    >
                        {props.value}
                        {trendBox('1em')}
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
         *
         * Without a name the content moves up into its place. A row of the value with its control that has no
         * drawing to stand under goes to the top, and the icon goes in front of the first row, so a tile one row
         * high still shows the icon, the value and the switch. Above a drawing the icon keeps a row of its own -
         * there is no row there to join. Without a name and an icon there is no header at all, and nothing is
         * left of it, not even its gap.
         */
        const hasValue = props.value !== undefined && props.value !== null;
        const named = !!props.title;
        const valueUnderName = hasValue && (props.valueOnTop || (!props.body && !!props.footer));
        const valueUnderBody = hasValue && !!props.body && !props.valueOnTop;
        const valueAtBottom = hasValue && !props.body && !props.footer && !props.valueOnTop;
        const controlAtBottom = !hasValue && !!props.control;
        const rowUp = !named && !props.body && (valueAtBottom || controlAtBottom);
        const rowOnTop = valueUnderName || rowUp;
        const iconInRow = !named && rowOnTop && !!props.icon;

        /*
         * The value with what belongs to it.
         *
         * A word and a value that do not fit beside each other are not squeezed: the value goes under the word,
         * still on the right. Squeezed, the word broke in the middle - `Noch 1:28` over a lonely `h` on a
         * washing machine half a phone wide - and a value cut off is a wrong value.
         */
        const valueRow = (withIcon: boolean): React.JSX.Element => (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    // with a word or a control in the row the value has its place already
                    justifyContent: (!props.label && !props.control && css.align) || 'space-between',
                    flexWrap: props.label ? 'wrap' : undefined,
                    columnGap: tokens.gap,
                    rowGap: 2,
                    flexShrink: 0,
                }}
            >
                {props.label ? (
                    <div
                        style={{
                            fontSize: tokens.smallSize,
                            color: css.text.color ?? theme.palette.text.secondary,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            // the icon stands in front of the word, the value keeps its place on the right
                            display: withIcon ? 'flex' : undefined,
                            alignItems: withIcon ? 'center' : undefined,
                            gap: withIcon ? tokens.gap : undefined,
                        }}
                    >
                        {withIcon ? iconBox(accent) : null}
                        {props.label}
                    </div>
                ) : null}
                <div
                    /*
                     * Alone in its row a long word of the value is broken at a syllable: `Unterwegs` lost its end
                     * on a tile of three columns. Not anywhere, though - `Haus|e` reads worse than a word that
                     * reaches a little into the padding, as `Hause` does there.
                     */
                    lang={props.label ? undefined : I18n.getLanguage()}
                    style={{
                        fontSize: props.valueSize ?? tokens.valueSize,
                        fontWeight: 700,
                        lineHeight: 1.1,
                        minWidth: 0,
                        whiteSpace: props.label ? 'nowrap' : undefined,
                        hyphens: props.label ? undefined : 'auto',
                        // a word in front of it means the value belongs to the right, as on a blind
                        marginLeft: props.label ? 'auto' : undefined,
                        color: props.valueColor || theme.palette.text.primary,
                        transition: 'color 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        ...css.text,
                    }}
                >
                    {/* the icon belongs to the value it stands in front of, not to the far end of the row */}
                    {withIcon && !props.label ? iconBox(accent) : null}
                    {props.value}
                    {trendBox('0.85em')}
                </div>
                {props.control ? <div style={{ flexShrink: 0 }}>{props.control}</div> : null}
            </div>
        );

        const headerRow = named ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.gap }}>
                {iconBox(accent)}
                {name(tokens.titleSize, theme.palette.text.secondary, true)}
            </div>
        ) : props.icon && !iconInRow ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.gap }}>{iconBox(accent)}</div>
        ) : null;

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
                {headerRow || rowOnTop ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.gap, flexShrink: 0 }}>
                        {headerRow}
                        {rowOnTop ? valueRow(iconInRow) : null}
                    </div>
                ) : null}
                {props.body ? (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: tokens.gap }}>
                        <div style={{ flex: 1, minWidth: 0 }}>{props.body}</div>
                        {props.aside ? <div style={{ flexShrink: 0 }}>{props.aside}</div> : null}
                    </div>
                ) : null}
                {valueUnderBody ? valueRow(false) : null}
                {props.footer ? <div style={{ flexShrink: 0, width: '100%' }}>{props.footer}</div> : null}
                {!rowUp && (valueAtBottom || controlAtBottom) ? valueRow(false) : null}
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
                // the `card` layout paints itself, and a widget without a card carries nothing of its own but what
                // it was told to carry
                ...(layout === 'card'
                    ? undefined
                    : mergeFrame(
                          props.noCard
                              ? {}
                              : {
                                    background: theme.palette.background.paper,
                                    borderWidth: 1,
                                    borderStyle: 'solid',
                                    borderColor: theme.palette.divider,
                                    borderRadius: tokens.radius,
                                    // a light theme lifts its cards off the page, a dark one draws them flat
                                    boxShadow:
                                        theme.palette.mode === 'light' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                                    paddingTop: tokens.padding,
                                    paddingRight: tokens.padding,
                                    paddingBottom: tokens.padding,
                                    paddingLeft: tokens.padding,
                                },
                          css.frame,
                      )),
            }}
        >
            {props.background ? (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: css.frame.borderRadius ?? (props.noCard ? undefined : tokens.radius),
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
