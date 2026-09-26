import React from 'react';

import type { Types } from '@iobroker/type-detector';
import { I18n, Icon, type Connection, type ThemeName, type ThemeType } from '@iobroker/gui-components';

import type {
    VisRxWidgetState,
    WidgetData,
    RxRenderWidgetProps,
    RxWidgetInfo,
    RxWidgetInfoAttributesField,
    RxWidgetInfoGrid,
    RxWidgetInfoGroup,
    VisRxWidgetStateValues,
    VisTheme,
    WidgetStyle,
} from '@iobroker/types-vis-2';

import VisRxWidget from '@/Vis/visRxWidget';

import MarkerFrame, { type MarkerLayout } from './MarkerFrame';
import StandardFrame, { type StandardWidgetLayout } from './StandardFrame';
import { adoptObject } from './adoptObject';
import { absolutePicture, relativePicture, type DevicePicture } from './pictures';
import { historyInstanceIn } from './controls/history';
import { STANDARD_I18N_PREFIX } from './prefix';
import { TOKENS, accents, scaleTokens, type StandardTokens } from './tokens';

/**
 * The chart behind a click on a widget.
 *
 * It is loaded only when someone asks for it: a chart with axes, a tooltip and the periods to choose from is a
 * good part of the runtime bundle, and most projects never open one.
 */
const ChartDialog = React.lazy(() => import('./controls/ChartDialog'));

/** The card of a device behind a click on its marker; loaded when someone asks for it, like the chart */
const CardDialog = React.lazy(() => import('./controls/CardDialog'));

/** The question before something is switched, for the widgets that were told to ask one */
const ConfirmDialog = React.lazy(() => import('./controls/ConfirmDialog'));

/** Which of the two sets a widget belongs to */
export type StandardSet = 'relative' | 'absolute';

/** What a running gesture is showing, by the attribute that names the state */
type StandardPreview = Record<string, { value: unknown; holding: boolean }>;

/** The state of every widget of these sets: what `VisRxWidget` keeps, and what a gesture is showing */
interface StandardWidgetState extends Partial<VisRxWidgetState> {
    preview?: StandardPreview | null;
    /** What the object of a state says about it, by the state; `null` says that there is no such object */
    commons?: Record<string, ioBroker.StateCommon | null>;
    /** The chart of this widget is open */
    chartOpen?: boolean;
    /** The card of this marker is open */
    popupOpen?: boolean;
    /** What is waiting for a yes, and what to do when it comes */
    asking?: { action: () => void } | null;
}

/** What every widget of these sets carries, whatever device it shows */
export interface StandardRxData {
    /** The state the device is controlled or read by */
    oid: string;
    /** The name in the header; without it and without an icon the widget has no header */
    widgetTitle?: string;
    /** How the widget arranges what it shows: `StandardWidgetLayout` in a section, `MarkerLayout` on a plan */
    layout?: StandardWidgetLayout | MarkerLayout;
    /** Only the control, without the card around it */
    noCard?: boolean | 'true';
    /** When switching is asked about first: `on`, `off`, `both`, or nothing at all */
    confirm?: 'none' | 'on' | 'off' | 'both';
    /** What the question says; without it the widget sets ask their own */
    confirmText?: string;
    /** The PIN that answers the question; without one a button does */
    pin?: string;
    [key: string]: any;
}

/** Everything a device needs to draw itself */
export interface DeviceContext<RxData extends StandardRxData> {
    data: RxData;
    values: VisRxWidgetStateValues;
    /** Write a value into a state */
    setValue: (oid: string, value: string | number | boolean | null) => void;
    /**
     * Show a value for an attribute at once, without writing it.
     *
     * A gesture has to be seen while it happens: the window of a blind must follow the pointer, not wait for
     * the value to travel to the device and back. What is shown here wins over the state until the state
     * catches up.
     *
     * @param attr - the attribute that names the state, like `oid`
     * @param value - what to show
     * @param holding - true while the gesture is still running; what is shown then stays even if the old
     *   value arrives from the device in between, and is given up once the state carries the new one
     */
    preview: (attr: string, value: unknown, holding: boolean) => void;
    /** The value of a state of this widget, by the attribute that names it */
    valueOf: (attr: keyof RxData) => unknown;
    theme: VisTheme;
    themeType: ThemeType;
    /** The system writes a number with a comma, not a point */
    isFloatComma: boolean;
    /** The sizes to draw with, already scaled for the set this widget belongs to */
    tokens: StandardTokens;
    /** The four colours a device can be in, and the one it takes at rest */
    accents: ReturnType<typeof accents>;
    /** Which of the two sets this widget belongs to */
    set: StandardSet;
    /**
     * Do something, or ask first where the widget was told to ask.
     *
     * A dashboard hangs where everyone walks past it, and the heating, the gate or the pump should not be
     * switched because someone brushed the screen. Which way needs a question - on, off, both - and whether a
     * PIN has to be typed for it is a setting of the widget; a device only says which way it is about to go
     * and hands over what it would have done.
     *
     * @param kind - whether this turns the device on or off, which is what the setting names
     * @param action - what to do once it may happen
     */
    act: (kind: 'on' | 'off', action: () => void) => void;
    /** The editor is open, so the pointer belongs to it and a widget may not take a drag of its own */
    editMode: boolean;
    /** To read objects and histories with */
    socket: Connection;
    /** The history instance the system prefers, out of the system settings */
    defaultHistory?: string;
    /**
     * What the object of a state says about it: its limits, its unit, its words, what logs it.
     *
     * The settings of a widget win over this - what the user typed is what the user meant - but everything
     * that was not typed is the object's business, and a widget put on a page by the wizard has nothing typed
     * at all. `min` and `max` are the case that matters: a blind that counts from 0 to 255 is drawn wrong by
     * anything that assumes a hundred.
     *
     * The object is read once and kept, so this is not there at the first render: `undefined` means that
     * nobody has answered yet, `null` that there is no such object. The widget draws itself again once the
     * answer arrives.
     *
     * @param attr - the attribute that names the state, like `oid`
     */
    commonOf: (attr: keyof RxData) => ioBroker.StateCommon | null | undefined;
    /**
     * Which instance logs the state of an attribute: `history.0`, `sql.0`, `influxdb.0`.
     *
     * A device asks this to know whether it may offer a chart at all. It comes out of the same object as
     * {@link DeviceContext.commonOf}, and is `undefined` for as long as that one is.
     *
     * @param attr - the attribute that names the state, like `oid`
     */
    historyOf: (attr: keyof RxData) => string | null | undefined;
    /** How the widget was told to arrange itself */
    layout: StandardWidgetLayout | MarkerLayout;
    /** Open another page of the project */
    navigate: (view: string) => void;
    /**
     * Put the runtime into another theme, which is remembered for the next visit.
     *
     * The name is one of `light`, `dark`, `modernLight`, `modernDark`; without one the runtime takes the next
     * theme it knows.
     *
     * @param themeName - the theme to change to
     */
    setTheme: (themeName?: ThemeName) => void;
    /** A word of the widget sets */
    t: (word: string, ...args: (string | number)[]) => string;
}

/** What a device hands back to be drawn in the frame */
export interface DeviceResult {
    /** The colour this device is in at the moment; out of `context.accents`, never a colour of its own */
    accent: string;
    /** Whether the device is doing something, which is what fills a card of the `card` layout */
    active?: boolean;
    /** The icon in the header, drawn in `currentColor` */
    icon?: React.ReactNode;
    /** The big line at the bottom: a value with its unit, or a word like `ON` */
    value?: React.ReactNode;
    /** What the value is drawn in; without it it takes the text colour of the theme */
    valueColor?: string;
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
    /** Drawn behind everything, like the history of a value */
    background?: React.ReactNode;
    /** What the device is doing in two or three words, for the caption of a marker and for one row */
    stateText?: string;
    /** What this device draws reacts to how much room the card has; see `StandardFrameProps.container` */
    container?: boolean;
    /** A short number a marker shows in its circle instead of the icon, like `21.5` with `°C` under it */
    marker?: { text: string; unit?: string };
    /** An arrow beside the value: which way it has gone. The frames decide how large it is drawn */
    trend?: React.ReactNode;
    /** The whole card reacts to a click */
    onClick?: () => void;
    /**
     * A click on the card opens the history of these states.
     *
     * Only where there is one: a state that nothing logs leaves the card as it was, without a cursor that
     * promises something and a dialog that then has nothing to show. A device that brings its own `onClick`
     * keeps it - a switch is there to be switched, not to be read up on.
     */
    chart?: DeviceChart;
    /**
     * Something that is always in the tree and draws nothing.
     *
     * A widget that has to do something when the page opens rather than when it is clicked - the theme
     * switcher is the one - puts a component with an effect here. It is rendered beside the card, the marker
     * and the popup alike, so what it does does not depend on how the widget was laid out.
     */
    effect?: React.ReactNode;
}

/** What a click on a card shows the history of */
export interface DeviceChart {
    /** The attributes that name the states to draw, the first one and at most one more */
    attrs: string[];
    /** The colour of the first line; without it the chart takes its own */
    color?: string;
    /** The colour of the second line */
    color2?: string;
    /** How far back the chart looks when it opens, in hours */
    hours?: number;
    /** The lines are drawn as smooth curves */
    spline?: boolean;
}

export interface DeviceDefinition<RxData extends StandardRxData> {
    /** What stands behind `tplRel` and `tplAbs`, like `Blind` */
    name: string;
    /** The word in the palette, out of the i18n of these sets */
    label: string;
    /**
     * The picture in the palette, as a piece of SVG.
     *
     * The palette draws a preview that is not an image file as HTML, so these sets need no PNG per widget: the
     * drawing is in `currentColor` and follows the theme, which a picture never does.
     */
    prev: string;
    /** What the widget does, in a sentence, for the tooltip of the palette */
    help: string;
    /**
     * What this device looks like on a page, for the picture in that tooltip.
     *
     * The two sets draw their own version of it - a card and a marker - out of the same description, the same
     * way they build the widget itself. See `pictures.ts`.
     */
    picture: Omit<DevicePicture, 'accent'>;
    /** Which kinds of device the wizard puts on this widget */
    deviceTypes: Types[];
    /** The fields besides the ones every widget of these sets has */
    fields: readonly RxWidgetInfoAttributesField[];
    /**
     * Further groups of fields, if the device needs more than one.
     *
     * As a function where the two sets differ: a card can draw the history of a value behind itself, a marker
     * the size of a coin cannot, and a setting that does nothing is worse than no setting.
     */
    groups?: readonly RxWidgetInfoGroup[] | ((set: StandardSet) => readonly RxWidgetInfoGroup[]);
    /** How the device draws itself */
    render: (context: DeviceContext<RxData>) => DeviceResult;
    /** The cells this widget takes in a section, for the set `relative` */
    tile: RxWidgetInfoGrid;
    /**
     * What the marker of the set `absolute` looks like: a circle with the icon in it, or a capsule with a
     * number beside the icon. It only decides the size the widget is dropped with.
     */
    markerShape?: 'icon' | 'value';
    /**
     * This widget draws itself, without the card or the marker around it.
     *
     * Two of these are not devices at all - a heading and a web page - and a heading in a card with a name
     * over it is not a heading. They hand back a `body` and get the box to themselves; nothing else of the
     * frame applies to them.
     */
    bare?: boolean;
    /**
     * The box a widget of the set `absolute` is dropped with, where a coin is the wrong shape for it.
     *
     * A heading is a line of text and a web page is a rectangle; neither of them is a marker.
     */
    box?: { width: number; height: number };
    /**
     * A marker of the set `absolute` opens the card of this device on a click.
     *
     * A coin on a floor plan has no room for a slider, a wheel or three buttons, so a device that is operated
     * with more than one finger says so here and the click brings up the card it shows in a section. A device
     * that can be done with in one move - a switch - brings its own `onClick` instead.
     */
    popup?: boolean;
    /**
     * What the question before an action is set to when this device is put on a page.
     *
     * Almost everything starts at `none` - nobody wants to confirm a lamp. A lock starts at `both`, because
     * the front door is not something to open because a sleeve brushed the screen, and a setting that has to
     * be found first protects nobody.
     */
    confirmDefault?: 'none' | 'on' | 'off' | 'both';
    /**
     * This device switches something, so it gets the fields for a question before it happens.
     *
     * Whatever the device does through {@link DeviceContext.act} then goes through that question. A device
     * that only shows a value has nothing to ask about and gets no such fields.
     */
    confirmable?: boolean;
}

/** The box a marker of the set `absolute` is dropped with: a coin, or a capsule when it shows a number */
const MARKER_BOX = { width: 52, height: 52 };
const MARKER_BOX_VALUE = { width: 118, height: 52 };

const SETS: Record<StandardSet, { set: string; prefix: string; label: string; color: string }> = {
    relative: { set: 'relative', prefix: 'Rel', label: 'set_relative', color: '#3f7fbf' },
    absolute: { set: 'absolute', prefix: 'Abs', label: 'set_absolute', color: '#7b5fbf' },
};

/**
 * How much a marker says about itself, out of what the widget was told.
 *
 * `plain` and `badge` are what the two settings were called before there were three of them; a project that
 * still holds one of those keeps working. A widget that shows a number in its circle is never given the state
 * line, whatever it carries - that line would only repeat the number.
 *
 * @param layout - the setting as the widget carries it
 * @param withValue - the marker of this device shows a number rather than an icon
 */
function markerLayout(layout: string, withValue: boolean): MarkerLayout {
    const wanted: MarkerLayout =
        layout === 'name' || layout === 'state' ? layout : layout === 'badge' ? 'state' : 'icon';
    return withValue && wanted === 'state' ? 'name' : wanted;
}

/** A length of a style in px, or null if it is none - `100%` says nothing about pixels */
function pixels(value: unknown): number | null {
    if (typeof value === 'number') {
        return isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px)?$/);
        return match ? parseFloat(match[1]) : null;
    }
    return null;
}

/**
 * How large the widget is, out of the style it was given.
 *
 * A widget of the set `absolute` carries its size in its own style, so it is known before anything is drawn.
 * Nothing here measures the box it ended up in - a widget that draws itself from its own measurement and is
 * itself what gives that box its size chases itself until React gives up, which is what the clock and the
 * thermostat of the material set did.
 *
 * @param style - the style of the widget as the project holds it
 * @param fallback - what to assume when the style says no pixels, like `100%` in a section of a grid
 * @param fallback.width - the width to assume, in px
 * @param fallback.height - the height to assume, in px
 */
function styleBox(
    style: WidgetStyle | undefined | null,
    fallback: { width: number; height: number },
): { width: number; height: number } {
    return {
        width: pixels(style?.width) ?? fallback.width,
        height: pixels(style?.height) ?? fallback.height,
    };
}

/**
 * Make the two widget classes of one device.
 *
 * A device is described once - its fields, its states and how it draws itself - and comes out twice: as a tile
 * for a section of the grid, and as a widget placed by hand. The two differ in the size they are dropped with
 * and in how large their type is, in nothing else.
 *
 * @param definition - what the device is and how it is drawn
 */
export function defineDeviceWidget<RxData extends StandardRxData>(
    definition: DeviceDefinition<RxData>,
): Record<'Relative' | 'Absolute', typeof VisRxWidget<RxData>> {
    const make = (which: StandardSet): typeof VisRxWidget<RxData> => {
        const set = SETS[which];

        const info: RxWidgetInfo = {
            id: `tpl${set.prefix}${definition.name}`,
            visSet: set.set,
            visSetLabel: set.label,
            visSetColor: set.color,
            visName: definition.name,
            visWidgetLabel: definition.label,
            visPrev: definition.prev,
            // the row of the palette has room for a symbol, the tooltip for the widget itself
            visPrevLarge:
                which === 'relative'
                    ? relativePicture({ ...definition.picture, accent: set.color })
                    : absolutePicture({
                          ...definition.picture,
                          accent: set.color,
                          // a marker that carries a number is a capsule, the others are a coin with the symbol
                          value: definition.markerShape === 'value' ? definition.picture.value : undefined,
                      }),
            visHelp: definition.help,
            visDeviceTypes: definition.deviceTypes,
            visAttrs: [
                {
                    name: 'common',
                    fields: definition.bare
                        ? // a heading and a web page have no frame, so the fields of one would do nothing:
                          // no layout to choose, no name over them, no symbol, no card to leave off
                          definition.fields
                        : [
                              ...definition.fields.map(field =>
                                  field.name === 'oid' && !('onChange' in field && field.onChange)
                                      ? {
                                            ...field,
                                            // the state knows its name, its unit and its limits, and the channel
                                            // above it knows the icon - none of that should be typed again
                                            onChange: async (
                                                _field: RxWidgetInfoAttributesField,
                                                data: WidgetData,
                                                changeData: (newData: WidgetData) => void,
                                                socket: Connection,
                                            ): Promise<void> => {
                                                if (await adoptObject(data, socket, I18n.getLanguage())) {
                                                    changeData(data);
                                                }
                                            },
                                        }
                                      : field,
                              ),
                              which === 'relative'
                                  ? {
                                        name: 'layout',
                                        type: 'select',
                                        label: 'layout',
                                        default: 'default',
                                        options: [
                                            { value: 'default', label: 'layout_default' },
                                            { value: 'compact', label: 'layout_compact' },
                                            { value: 'card', label: 'layout_card' },
                                        ],
                                    }
                                  : {
                                        name: 'layout',
                                        type: 'select',
                                        label: 'layout',
                                        default: 'icon',
                                        options: [
                                            { value: 'icon', label: 'marker_icon' },
                                            { value: 'name', label: 'marker_name' },
                                            // A marker that carries a number says what the device is doing in the
                                            // circle itself. A line under it that says `163,57 MB` a second time is
                                            // not a layout anyone would pick, so it is not offered - only devices
                                            // whose marker is an icon have something left to tell.
                                            ...(definition.markerShape === 'value'
                                                ? []
                                                : [{ value: 'state', label: 'marker_state' }]),
                                        ],
                                    },
                              {
                                  name: 'widgetTitle',
                                  label: 'name',
                                  // a marker that shows only its icon has no use for a name; `badge` is what the
                                  // setting was called before there were three of them
                                  hidden:
                                      which === 'absolute'
                                          ? "data.layout !== 'name' && data.layout !== 'state' && data.layout !== 'badge'"
                                          : undefined,
                              },
                              { name: 'icon', type: 'icon-image', label: 'icon' },
                              ...(which === 'relative'
                                  ? ([
                                        {
                                            name: 'noCard',
                                            type: 'checkbox',
                                            label: 'without_card',
                                            hidden: "data.layout === 'card'",
                                        },
                                    ] as RxWidgetInfoAttributesField[])
                                  : []),
                          ],
                },
                ...(definition.confirmable
                    ? ([
                          {
                              name: 'security',
                              label: 'group_security',
                              fields: [
                                  {
                                      name: 'confirm',
                                      type: 'select',
                                      label: 'confirm',
                                      default: definition.confirmDefault || 'none',
                                      options: [
                                          { value: 'none', label: 'confirm_none' },
                                          { value: 'on', label: 'confirm_on' },
                                          { value: 'off', label: 'confirm_off' },
                                          { value: 'both', label: 'confirm_both' },
                                      ],
                                  },
                                  {
                                      name: 'confirmText',
                                      label: 'confirm_text',
                                      hidden: "!data.confirm || data.confirm === 'none'",
                                  },
                                  {
                                      name: 'pin',
                                      label: 'pin',
                                      tooltip: 'pin_tooltip',
                                      hidden: "!data.confirm || data.confirm === 'none'",
                                  },
                              ],
                          },
                      ] as RxWidgetInfoGroup[])
                    : []),
                ...(typeof definition.groups === 'function' ? definition.groups(which) : definition.groups || []),
            ],
            visDefaultStyle:
                which === 'relative'
                    ? { width: '100%', height: '100%', position: 'relative' }
                    : // a marker is the size of a coin: a plan is covered by widgets any bigger than that.
                      // One that shows a number is a capsule instead, so the number stays readable, and a
                      // widget that is not a marker at all brings its own box
                      {
                          ...(definition.box || (definition.markerShape === 'value' ? MARKER_BOX_VALUE : MARKER_BOX)),
                          position: 'absolute',
                      },
        };
        if (which === 'relative') {
            (info as { visDefaultGrid?: RxWidgetInfoGrid }).visDefaultGrid = definition.tile;
        }

        return class StandardDeviceWidget extends VisRxWidget<RxData, StandardWidgetState> {
            /** The catalog reads the labels of this widget under this prefix, see `visWidgetsCatalog.tsx` */
            static i18nPrefix = STANDARD_I18N_PREFIX;

            /** The states already asked about, so that every render does not ask for the object again */
            private objectsAsked: Record<string, true> = {};

            /** The widget is still on the page, so an answer that arrives late may still be kept */
            private alive = true;

            componentWillUnmount(): void {
                this.alive = false;
                super.componentWillUnmount();
            }

            /**
             * Read the object of a state, once per state.
             *
             * Its `common` is what the widget falls back on for everything the user did not type - the limits
             * of a blind, the unit of a value - and it also says which adapter logs the state.
             *
             * @param oid - the state
             */
            private askObject(oid: string): void {
                if (this.objectsAsked[oid]) {
                    return;
                }
                this.objectsAsked[oid] = true;
                const remember = (common: ioBroker.StateCommon | null): void => {
                    if (this.alive) {
                        this.setState(current => ({ commons: { ...(current.commons || {}), [oid]: common } }) as any);
                    }
                };
                void this.props.context.socket
                    .getObject(oid)
                    .then(obj => remember((obj as ioBroker.StateObject | null | undefined)?.common || null))
                    .catch(() => remember(null));
            }

            /**
             * What the object of the state behind an attribute says, as far as it is known.
             *
             * @param attr - the attribute that names the state
             */
            private commonOf(attr: string): ioBroker.StateCommon | null | undefined {
                const oid = this.state.rxData[attr];
                if (typeof oid !== 'string' || !oid) {
                    return null;
                }
                const known = this.state.commons?.[oid];
                if (known === undefined) {
                    this.askObject(oid);
                }
                return known;
            }

            /**
             * Which instance logs a state, out of the object that was read for it.
             *
             * @param oid - the state, or nothing
             */
            private historyOf(oid: string | undefined): string | null | undefined {
                if (!oid) {
                    return undefined;
                }
                const common = this.state.commons?.[oid];
                return common === undefined
                    ? undefined
                    : historyInstanceIn(common, this.props.context.systemConfig?.common?.defaultHistory);
            }

            static getWidgetInfo(): RxWidgetInfo {
                return info;
            }

            // eslint-disable-next-line class-methods-use-this
            getWidgetInfo(): RxWidgetInfo {
                return info;
            }

            /**
             * The card of this device over the plan, for a marker that cannot be operated.
             *
             * The device is drawn a second time, the way the set `relative` draws it: the same states and the
             * same colours, but the sizes of a card and the layout with the name above and the controls below.
             * A click inside the card does what it does on a card - the slider slides, the buttons press - and
             * the card itself opens nothing further, or the plan would fill with dialogs.
             *
             * @param context - the context the marker was drawn with
             * @param icon - the icon of the marker, already chosen between the object and the device type
             */
            private renderPopup(context: DeviceContext<RxData>, icon: React.ReactNode): React.JSX.Element {
                const card = definition.render({ ...context, set: 'relative', tokens: TOKENS, layout: 'default' });
                // as high as this device stands in a section, where it was laid out to be operated - but only
                // where it draws something. A dimmer is a name, a number and a slider; stretched to the height
                // of a blind it becomes three things with a hole in the middle.
                const rows = typeof definition.tile.rows === 'number' ? definition.tile.rows : 3;

                return (
                    <React.Suspense fallback={null}>
                        <CardDialog
                            width={300}
                            height={card.body ? Math.min(Math.max(rows * 90, 140), 520) : 'auto'}
                            onClose={() => this.setState({ popupOpen: false } as any)}
                        >
                            <StandardFrame
                                layout="default"
                                title={this.state.rxData.widgetTitle}
                                icon={icon}
                                accent={card.accent}
                                active={card.active}
                                value={card.value}
                                valueColor={card.valueColor}
                                trend={card.trend}
                                label={card.label}
                                control={card.control}
                                body={card.body}
                                aside={card.aside}
                                footer={card.footer}
                                background={card.background}
                                container={card.container}
                                noCard
                                tokens={TOKENS}
                                theme={context.theme}
                            />
                        </CardDialog>
                    </React.Suspense>
                );
            }

            /**
             * A value arrived from the device, so what a gesture was showing for that state is given up.
             *
             * Not while the gesture is still running: the device echoes the old value on the way, and dropping
             * the preview then makes the drawing jump back under the pointer.
             *
             * @param id - the state that changed
             * @param state - its new value
             */
            onStateUpdated(id: string, state: Partial<ioBroker.State>): void {
                super.onStateUpdated(id, state);
                const preview = this.state.preview;
                if (!preview) {
                    return;
                }
                const left: StandardPreview = {};
                let dropped = false;
                for (const [attr, shown] of Object.entries(preview)) {
                    if (!shown.holding && this.state.rxData[attr] === id) {
                        dropped = true;
                    } else {
                        left[attr] = shown;
                    }
                }
                if (dropped) {
                    this.setState({ preview: Object.keys(left).length ? left : null } as any);
                }
            }

            renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
                super.renderWidgetBody(props);

                // the glow of a marker lies outside its box, and `.vis-widget` clips by default
                if (which === 'absolute') {
                    props.className = `${props.className || ''} vis-marker-widget`;
                }

                // how large this widget is, out of its own style - nothing here measures the box it sits in
                const box = styleBox(
                    this.state.rxStyle,
                    which === 'absolute' ? MARKER_BOX : { width: 244, height: 120 },
                );

                const context: DeviceContext<RxData> = {
                    data: this.state.rxData,
                    values: this.state.values,
                    setValue: (oid, value) => this.props.context.setValue(oid, value),
                    valueOf: attr => {
                        // what a gesture is showing wins over the state, until the state has caught up
                        const shown = this.state.preview?.[attr as string];
                        if (shown) {
                            return shown.value;
                        }
                        const oid = this.state.rxData[attr as string];
                        return typeof oid === 'string' && oid ? this.state.values[`${oid}.val`] : undefined;
                    },
                    // the functional form, because a device may show two attributes in the same tick and the
                    // second call would otherwise read a state that has not been updated yet
                    preview: (attr, value, holding) =>
                        this.setState(
                            current =>
                                ({
                                    preview: { ...(current.preview || {}), [attr]: { value, holding } },
                                }) as any,
                        ),
                    theme: this.props.context.theme,
                    themeType: this.props.context.themeType,
                    isFloatComma: !!this.props.context.systemConfig?.common?.isFloatComma,
                    // the tiles of a section are all about one size; a widget placed by hand is as large as it
                    // was dragged, and its type grows with it
                    tokens: which === 'absolute' ? scaleTokens(box) : TOKENS,
                    accents: accents(this.props.context.theme),
                    set: which,
                    act: (kind, action) => {
                        // what the widget carries, and otherwise what this kind of device asks for by default
                        const confirm = this.state.rxData.confirm || definition.confirmDefault;
                        if (confirm === kind || confirm === 'both') {
                            this.setState({ asking: { action } } as any);
                        } else {
                            action();
                        }
                    },
                    editMode: !!this.state.editMode,
                    socket: this.props.context.socket,
                    defaultHistory: this.props.context.systemConfig?.common?.defaultHistory,
                    commonOf: attr => this.commonOf(attr as string),
                    historyOf: attr => {
                        const common = this.commonOf(attr as string);
                        return common === undefined
                            ? undefined
                            : historyInstanceIn(common, this.props.context.systemConfig?.common?.defaultHistory);
                    },
                    layout: this.state.rxData.layout || (which === 'absolute' ? 'icon' : 'default'),
                    navigate: view => this.props.context.changeView(view),
                    setTheme: themeName => this.props.context.toggleTheme(themeName),
                    t: (word, ...args) => I18n.t(STANDARD_I18N_PREFIX + word, ...args),
                };

                const result = definition.render(context);

                // an icon taken from the object, or set by hand, wins over the one of the device type
                const icon = this.state.rxData.icon ? (
                    <Icon
                        src={this.state.rxData.icon}
                        style={{ width: '100%', height: '100%' }}
                    />
                ) : (
                    result.icon
                );

                // the states of the chart, and the instance that logs the first of them - a click may only
                // promise a chart where there is one to show
                const chartOids = (result.chart?.attrs || [])
                    .map(attr => this.state.rxData[attr])
                    .filter((oid): oid is string => typeof oid === 'string' && !!oid);
                chartOids.forEach(oid => this.askObject(oid));
                const chartInstance = chartOids.length ? this.historyOf(chartOids[0]) : null;

                // in the editor the pointer belongs to the editor: a click there selects the widget
                const clickable = !this.state.editMode;
                const openPopup =
                    which === 'absolute' && definition.popup && clickable
                        ? () => this.setState({ popupOpen: true } as any)
                        : undefined;
                const openChart =
                    chartInstance && clickable ? () => this.setState({ chartOpen: true } as any) : undefined;
                // what the device does itself comes first, then its controls, then what it has to tell
                const onClick = result.onClick || openPopup || openChart;

                const question = this.state.asking ? (
                    <React.Suspense fallback={null}>
                        <ConfirmDialog
                            text={this.state.rxData.confirmText}
                            pin={this.state.rxData.pin}
                            t={context.t}
                            onClose={confirmed => {
                                const asking = this.state.asking;
                                this.setState({ asking: null } as any, () => {
                                    if (confirmed) {
                                        asking?.action();
                                    }
                                });
                            }}
                        />
                    </React.Suspense>
                ) : null;

                const chart =
                    this.state.chartOpen && chartInstance ? (
                        <React.Suspense fallback={null}>
                            <ChartDialog
                                socket={context.socket}
                                oid={chartOids[0]}
                                oid2={chartOids[1]}
                                instance={chartInstance}
                                instance2={this.historyOf(chartOids[1])}
                                title={this.state.rxData.widgetTitle}
                                color={result.chart?.color || result.accent}
                                color2={result.chart?.color2}
                                hours={result.chart?.hours}
                                spline={result.chart?.spline}
                                themeType={context.themeType}
                                isFloatComma={context.isFloatComma}
                                t={context.t}
                                onClose={() => this.setState({ chartOpen: false } as any)}
                            />
                        </React.Suspense>
                    ) : null;

                // a heading and a web page draw themselves: no card, no marker, no name over them
                if (definition.bare) {
                    return (
                        <>
                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>{result.body}</div>
                            {result.effect}
                            {chart}
                            {question}
                        </>
                    );
                }

                // a widget on a plan is a marker the size of a coin, one in a section is a card
                if (which === 'absolute') {
                    return (
                        <>
                            <MarkerFrame
                                layout={markerLayout(context.layout, definition.markerShape === 'value')}
                                title={this.state.rxData.widgetTitle}
                                stateText={result.stateText}
                                icon={icon}
                                marker={result.marker}
                                trend={result.trend}
                                accent={result.accent}
                                active={result.active}
                                theme={context.theme}
                                onClick={onClick}
                            />
                            {this.state.popupOpen ? this.renderPopup(context, icon) : null}
                            {result.effect}
                            {chart}
                            {question}
                        </>
                    );
                }

                return (
                    <>
                        <StandardFrame
                            layout={
                                context.layout === 'compact' || context.layout === 'card' ? context.layout : 'default'
                            }
                            title={this.state.rxData.widgetTitle}
                            icon={icon}
                            accent={result.accent}
                            active={result.active}
                            value={result.value}
                            valueColor={result.valueColor}
                            trend={result.trend}
                            label={result.label}
                            control={result.control}
                            body={result.body}
                            aside={result.aside}
                            footer={result.footer}
                            background={result.background}
                            container={result.container}
                            noCard={this.state.rxData.noCard === true || this.state.rxData.noCard === 'true'}
                            tokens={context.tokens}
                            theme={context.theme}
                            onClick={onClick}
                        />
                        {result.effect}
                        {chart}
                        {question}
                    </>
                );
            }
        };
    };

    return { Relative: make('relative'), Absolute: make('absolute') };
}
