import React from 'react';

import { FormatListBulleted as ListIcon } from '@mui/icons-material';

import { Icon, I18n } from '@iobroker/gui-components';

import FatSlider from '../Base/controls/FatSlider';
import SlideToggle from '../Base/controls/SlideToggle';
import { asNumber, asText, statesOf, typedValue } from '../Base/controls/stateValue';
import { describeObject } from '../Base/adoptObject';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';
import { limitsOf } from '../Base/limits';

/** The most rows one card is worth; past that it is a page, not a card */
const MAX_ROWS = 12;

/** What a row is operated with, where the object is not asked */
type RowKind = 'auto' | 'switch' | 'slider' | 'select' | 'value' | 'button' | 'delimiter';

interface ListRxData extends StandardRxData {
    /** How many rows the card has */
    rows?: number | string;
}

interface Row {
    /** The attribute that names the state of this row, like `oidRow1` */
    attr: string;
    name: string;
    icon?: string;
    /** What it is operated with, with `auto` already answered */
    kind: Exclude<RowKind, 'auto'>;
    raw: unknown;
    common: ioBroker.StateCommon | null | undefined;
    /** The word on a button, instead of the `on` of the sets */
    text?: string;
    /** What the row says while the state is true, and the symbol and the colour that go with it */
    textOn?: string;
    iconOn?: string;
    colorOn?: string;
    /** ... and while it is false */
    textOff?: string;
    iconOff?: string;
    colorOff?: string;
    /** The unit behind a reading, where the object carries none or the wrong one */
    unit?: string;
}

/**
 * The row says itself what its two values are called, so it is read as two states and not as a number.
 *
 * A word, a symbol or a colour typed for `true` is the answer to "what is this state" - a lock that says
 * `Open` in red and `Locked` in green rather than `On` and `Off` in grey. Any one of the six is enough to
 * mean it; everything that was not typed falls back to what the object or the set says.
 *
 * @param row - the row to look at
 */
function isTwoState(row: Row): boolean {
    return !!(row.textOn || row.textOff || row.iconOn || row.iconOff || row.colorOn || row.colorOff);
}

/**
 * What a state is operated with, out of what its object says about it.
 *
 * The object already answers this: something that can be written and is either true or false is a switch,
 * something that can be written and counts between two limits is a slider, and everything else is a reading.
 * A state that nothing may write to is never a control, whatever it looks like - a card that offers a switch
 * for a state the adapter will not take is a card that lies.
 *
 * @param common - what the object says about the state, or nothing while it is still being read
 */
function kindOf(common: ioBroker.StateCommon | null | undefined): Exclude<RowKind, 'auto'> {
    const writable = !!common && common.write !== false;
    if (!writable) {
        return 'value';
    }
    if (common.type === 'boolean') {
        // a button is a state one writes `true` to and that says nothing back; `common.role` is where that stands
        return `${common.role || ''}`.startsWith('button') ? 'button' : 'switch';
    }
    /*
     * A state that lists what it may be is chosen from, not slid to.
     *
     * `common.states` says the value is one of a few named things - `0` is `off`, `1` is `night`, `2` is
     * `auto`. A slider over them hands the user a `1.5` that means nothing, and the numbers it shows are not
     * the words the adapter gave them. This comes before the number, because such a state is usually one.
     */
    if (statesOf(common).length) {
        return 'select';
    }
    if (common.type === 'number') {
        return 'slider';
    }

    return 'value';
}

/** Whether a value is one of the many ways of saying yes */
function isOn(raw: unknown): boolean {
    const text = asText(raw).toLowerCase();
    return raw === true || raw === 1 || text === '1' || text === 'true' || text === 'on';
}

/**
 * The rows the widget was given states for.
 *
 * @param context - the widget, its states and its settings
 */
function rowsOf(context: DeviceContext<ListRxData>): Row[] {
    const count = Math.max(0, Math.min(parseInt(`${context.data.rows ?? 0}`, 10) || 0, MAX_ROWS));
    const rows: Row[] = [];

    for (let index = 1; index <= count; index++) {
        const attr = `oidRow${index}`;
        const wanted: RowKind = context.data[`rowKind${index}`] || 'auto';
        // a line between two groups of rows is the one kind that is not about a state
        if (wanted !== 'delimiter' && !context.data[attr]) {
            continue;
        }
        const common = wanted === 'delimiter' ? null : context.commonOf(attr);

        rows.push({
            attr,
            name: context.data[`rowName${index}`] || '',
            icon: context.data[`rowIcon${index}`],
            kind: wanted === 'auto' ? kindOf(common) : wanted,
            raw: context.valueOf(attr),
            common,
            text: context.data[`rowText${index}`],
            textOn: context.data[`rowTextOn${index}`],
            iconOn: context.data[`rowIconOn${index}`],
            colorOn: context.data[`rowColorOn${index}`],
            textOff: context.data[`rowTextOff${index}`],
            iconOff: context.data[`rowIconOff${index}`],
            colorOff: context.data[`rowColorOff${index}`],
            unit: context.data[`rowUnit${index}`],
        });
    }

    return rows;
}

/**
 * What a row says about itself: the word of the state, or the number with its unit.
 *
 * @param row - the row to read
 * @param context - for the words of the sets and for how a number is written here
 */
function readingOf(row: Row, context: DeviceContext<ListRxData>): string {
    const text = asText(row.raw);

    // what the row was told to call this state wins over everything the object says
    const own = isOn(row.raw) ? row.textOn : row.textOff;
    if (own) {
        return own;
    }

    // what the state calls this value is what it is called here - on a row that is only read as well
    const named = statesOf(row.common).find(one => one.value === text);
    if (named) {
        return named.label;
    }

    if (row.common?.type === 'boolean' || typeof row.raw === 'boolean') {
        return context.t(isOn(row.raw) ? 'on' : 'off');
    }

    const number = asNumber(row.raw);
    if (number !== null) {
        // a measured value with six places after the point is a wall of digits; one place is a reading
        const written = Number.isInteger(number) ? `${number}` : number.toFixed(1);
        // what the row was told the unit is; the object is asked only where it was not told
        const named_ = row.unit ?? row.common?.unit;
        return `${context.isFloatComma ? written.replace('.', ',') : written}${named_ ? ` ${named_}` : ''}`;
    }

    return text || '--';
}

/**
 * Several states in one card: a row each, with the switch, the slider or the reading that belongs to it.
 *
 * Every other widget of these sets is one device. A room is not one device: the ceiling light, the standard
 * lamp, the brightness, the temperature and the window belong together on one card, and five cards for them
 * is five headers, five frames and a page one has to search. This is the card for that - the rows are what a
 * list of switches in a hall or a row of readings in a cellar actually looks like.
 *
 * What a row is operated with comes out of its object, so picking the state is usually all there is to do;
 * see {@link kindOf}. Where that answer is wrong - a number that is not worth a slider - the row says so
 * itself. Nothing else is typed either: the name and the symbol of a row are taken over from the object the
 * moment it is chosen, from its channel where the state itself has nothing to say.
 */
const listDevice = defineDeviceWidget<ListRxData>({
    name: 'List',
    label: 'widget_list',
    help: 'help_list',
    picture: {
        glyph:
            '<path d="M9 6h11M9 12h11M9 18h11" stroke-width="2" stroke-linecap="round"/>' +
            '<circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
        list: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<path d="M13 8h13M13 16h13M13 24h13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle cx="7" cy="8" r="2" fill="currentColor"/><circle cx="7" cy="16" r="2" fill="currentColor"/>' +
        '<circle cx="7" cy="24" r="2" fill="currentColor"/></svg>',
    deviceTypes: [],
    fields: [{ name: 'rows', type: 'number', label: 'rows_count', min: 1, max: MAX_ROWS, default: 3 }],
    groups: [
        {
            name: 'rows',
            label: 'group_rows',
            indexFrom: 1,
            indexTo: 'rows',
            fields: [
                {
                    name: 'oidRow',
                    type: 'id',
                    label: 'oid_row',
                    hidden: 'data["rowKind" + index] === "delimiter"',
                    // in a group the field is called `oidRow` and what it writes `oidRow3`, so the row is
                    // the index and not the name of the field
                    onChange: async (_field, data, changeData, socket, index): Promise<void> => {
                        const suffix = index ?? '';
                        const described = await describeObject(socket, data[`oidRow${suffix}`], I18n.getLanguage());
                        let changed = false;
                        // only what is still empty: whatever was typed is what was meant
                        if (described.name && !data[`rowName${suffix}`]) {
                            data[`rowName${suffix}`] = described.name;
                            changed = true;
                        }
                        if (described.icon && !data[`rowIcon${suffix}`]) {
                            data[`rowIcon${suffix}`] = described.icon;
                            changed = true;
                        }
                        if (changed) {
                            changeData(data);
                        }
                    },
                },
                { name: 'rowName', label: 'name' },
                { name: 'rowIcon', type: 'icon-image', label: 'icon' },
                {
                    name: 'rowKind',
                    type: 'select',
                    label: 'row_kind',
                    default: 'auto',
                    options: [
                        { value: 'auto', label: 'row_kind_auto' },
                        { value: 'switch', label: 'row_kind_switch' },
                        { value: 'slider', label: 'row_kind_slider' },
                        { value: 'select', label: 'row_kind_select' },
                        { value: 'value', label: 'row_kind_value' },
                        { value: 'button', label: 'row_kind_button' },
                        { value: 'delimiter', label: 'row_kind_delimiter' },
                    ],
                },
                /*
                 * The rest belongs to one kind of row each, and a panel of twelve rows times nine fields is
                 * unreadable. `index` is the row the field sits in - the expansion of an indexed group hands
                 * it to the expression, see `visWidgetsCatalog.tsx` - so each field can say which rows it is
                 * about. A row still on `auto` shows them: what the object will answer is not known here.
                 */
                {
                    name: 'rowText',
                    label: 'row_text',
                    hidden: 'data["rowKind" + index] !== "button"',
                },
                {
                    name: 'rowTextOn',
                    label: 'text_on',
                    hidden: '["slider","select","button","delimiter"].includes(data["rowKind" + index])',
                },
                {
                    name: 'rowTextOff',
                    label: 'text_off',
                    hidden: '["slider","select","button","delimiter"].includes(data["rowKind" + index])',
                },
                {
                    name: 'rowIconOn',
                    type: 'icon-image',
                    label: 'icon_on',
                    hidden: '["slider","select","button","delimiter"].includes(data["rowKind" + index])',
                },
                {
                    name: 'rowIconOff',
                    type: 'icon-image',
                    label: 'icon_off',
                    hidden: '["slider","select","button","delimiter"].includes(data["rowKind" + index])',
                },
                {
                    name: 'rowColorOn',
                    type: 'color',
                    label: 'color_on',
                    hidden: '["slider","select","button","delimiter"].includes(data["rowKind" + index])',
                },
                {
                    name: 'rowColorOff',
                    type: 'color',
                    label: 'color_off',
                    hidden: '["slider","select","button","delimiter"].includes(data["rowKind" + index])',
                },
                {
                    name: 'rowUnit',
                    label: 'unit',
                    hidden: '["switch","button","delimiter"].includes(data["rowKind" + index])',
                },
            ],
        },
    ],
    tile: { columns: 6, rows: 4, minColumns: 3, minRows: 2 },
    markerShape: 'icon',
    // a row of switches does not fit on a coin, so the marker opens the card instead
    popup: true,
    confirmable: true,
    render: context => {
        const { data, accents, theme, tokens, t } = context;

        const rows = rowsOf(context);
        const switches = rows.filter(row => row.kind === 'switch');
        const on = switches.filter(row => isOn(row.raw)).length;
        const accent = on ? accents.green : accents.off;
        const count = switches.length ? t('list_count', on, switches.length) : '';

        /** A symbol of a row, drawn to its box rather than to the font */
        const symbol = (src: string, size = 18): React.JSX.Element => (
            <span style={{ display: 'flex', width: size, height: size, flexShrink: 0 }}>
                <Icon
                    src={src}
                    style={{ width: '100%', height: '100%' }}
                />
            </span>
        );

        const line = (row: Row, index: number): React.JSX.Element => {
            const id = data[row.attr] as string;

            /*
             * The line that parts one group of rows from the next.
             *
             * A card with ten rows on it is a wall of words; `Light`, `Windows`, `Power` over the rows they
             * belong to turn it back into something one reads. It carries no state, so everything below -
             * the reading, the control - has nothing to do here.
             */
            if (row.kind === 'delimiter') {
                return (
                    <div
                        key={row.attr}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            paddingTop: index ? 10 : 0,
                            marginTop: index ? 10 : 0,
                            borderTop: index ? `1px solid ${theme.palette.divider}` : undefined,
                            flexShrink: 0,
                        }}
                    >
                        {row.icon ? symbol(row.icon, 14) : null}
                        {row.name ? (
                            <span
                                style={{
                                    fontSize: Math.round(tokens.smallSize * 0.85),
                                    fontWeight: 700,
                                    letterSpacing: 0.6,
                                    textTransform: 'uppercase',
                                    color: theme.palette.text.secondary,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {row.name}
                            </span>
                        ) : null}
                    </div>
                );
            }

            /*
             * What the row says it is: a symbol for this state, a word for it, or both.
             *
             * A symbol chosen for exactly this state and no word to go with it is the whole answer - an open
             * padlock says `open` better than the word does, and `open Open` says it twice.
             */
            const twoState = isTwoState(row);
            const ownIcon = twoState ? (isOn(row.raw) ? row.iconOn : row.iconOff) : undefined;
            const ownText = twoState ? (isOn(row.raw) ? row.textOn : row.textOff) : undefined;
            const ownColor = twoState ? (isOn(row.raw) ? row.colorOn : row.colorOff) : undefined;
            const reading = ownIcon && !ownText ? '' : readingOf(row, context);

            const label = (
                <>
                    {row.icon ? symbol(row.icon) : null}
                    <span
                        style={{
                            flex: 1,
                            minWidth: 0,
                            /*
                             * A dropdown is as wide as its longest option, and `Automatik` beside `Betriebsart`
                             * on a card three cells wide left the name as `Betrie…` and the dropdown whole. The
                             * name is the half that says which row this is, so it keeps about half the line and
                             * the dropdown gives way - both then end in an ellipsis rather than one of them.
                             * Only against a dropdown: a reading cut short is a wrong number, not a short word.
                             */
                            ...(row.kind === 'select' ? { minWidth: 'min(5.5em, 45%)' } : undefined),
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: tokens.smallSize,
                            color: theme.palette.text.secondary,
                        }}
                    >
                        {row.name || id || ''}
                    </span>
                </>
            );

            const reading_ = (
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        flexShrink: 0,
                        // a symbol given as an SVG is drawn inline, so a shape in `currentColor` takes this
                        color: ownColor,
                    }}
                >
                    {ownIcon ? symbol(ownIcon) : null}
                    {reading ? (
                        <span
                            style={{
                                fontSize: tokens.smallSize,
                                fontWeight: 700,
                                color: ownColor || theme.palette.text.primary,
                            }}
                        >
                            {reading}
                        </span>
                    ) : null}
                </span>
            );

            let control: React.ReactNode = reading_;

            if (row.kind === 'switch') {
                control = (
                    <>
                        {twoState ? reading_ : null}
                        <SlideToggle
                            on={isOn(row.raw)}
                            disabled={context.editMode || !id}
                            color={row.colorOn || accents.green}
                            offColor={row.colorOff || theme.palette.divider}
                            width={40}
                            onChange={() =>
                                context.act(isOn(row.raw) ? 'off' : 'on', () => context.setValue(id, !isOn(row.raw)))
                            }
                        />
                    </>
                );
            } else if (row.kind === 'select') {
                const options = statesOf(row.common);
                control = (
                    <select
                        value={asText(row.raw)}
                        disabled={context.editMode || !id}
                        onChange={e => {
                            const chosen = e.target.value;
                            context.act('on', () => context.setValue(id, typedValue(chosen, row.common)));
                        }}
                        style={{
                            // no width of its own: a percentage here is measured against a box that is itself
                            // only as wide as this one, and the browser then settles on a few letters of it.
                            // It shrinks against the name beside it instead, down to nothing if it has to.
                            maxWidth: '100%',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            padding: '3px 4px',
                            borderRadius: 8,
                            border: `1px solid ${theme.palette.divider}`,
                            background: theme.palette.background.paper,
                            color: theme.palette.text.primary,
                            font: 'inherit',
                            fontSize: tokens.smallSize,
                            fontWeight: 600,
                            cursor: context.editMode ? undefined : 'pointer',
                        }}
                    >
                        {/* what the state carries now, even where the object never listed it */}
                        {options.some(one => one.value === asText(row.raw)) ? null : (
                            <option value={asText(row.raw)}>{readingOf(row, context)}</option>
                        )}
                        {options.map(one => (
                            <option
                                key={one.value}
                                value={one.value}
                            >
                                {one.label}
                            </option>
                        ))}
                    </select>
                );
            } else if (row.kind === 'button') {
                control = (
                    <button
                        type="button"
                        disabled={context.editMode || !id}
                        onClick={() => context.act('on', () => context.setValue(id, true))}
                        style={{
                            padding: '4px 12px',
                            borderRadius: 8,
                            border: `1px solid ${accents.blue}`,
                            background: `${accents.blue}22`,
                            color: accents.blue,
                            font: 'inherit',
                            fontSize: tokens.smallSize,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            cursor: context.editMode ? undefined : 'pointer',
                        }}
                    >
                        {row.text || t('on')}
                    </button>
                );
            }

            /*
             * A slider gets a line of its own under the name.
             *
             * Beside the name it would be squeezed between the words and the reading, and what is left of a
             * slider on a card three cells wide is not something a thumb can hit. Over the whole width it is
             * the same slider as on a dimmer card.
             */
            const limits = row.kind === 'slider' ? limitsOf(context, row.attr) : null;
            const slider = limits ? (
                // the knob of a slider sits over the end of its rail, so the rail stops half a knob short of
                // the edge - otherwise the card is wider than itself and grows a scrollbar along the bottom
                <div style={{ padding: '0 7px' }}>
                    <FatSlider
                        slim
                        value={asNumber(row.raw) ?? 0}
                        min={limits.min}
                        max={limits.max}
                        step={limits.step}
                        color={accents.yellow}
                        disabled={context.editMode || !id}
                        onChange={value => context.preview(row.attr, value, true)}
                        onChangeCommitted={value => {
                            context.preview(row.attr, value, false);
                            context.setValue(id, value);
                        }}
                    />
                </div>
            ) : null;

            return (
                <div
                    key={row.attr}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        paddingTop: index ? 6 : 0,
                        marginTop: index ? 6 : 0,
                        // a line between the rows, so a long list reads as rows and not as a block of words
                        borderTop: index ? `1px solid ${theme.palette.divider}` : undefined,
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 24 }}>
                        {label}
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                // a toggle or a button narrower than itself is no longer something a thumb can
                                // hit, so only the row that ends in a dropdown gives way
                                flexShrink: row.kind === 'select' ? 1 : 0,
                                minWidth: 0,
                            }}
                        >
                            {slider ? reading_ : control}
                        </span>
                    </div>
                    {slider}
                </div>
            );
        };

        return {
            accent,
            active: false,
            icon: <ListIcon style={{ width: '100%', height: '100%' }} />,
            // the rows are the card; on a tile the size of a coin only the count of what is on is left
            value: context.layout === 'default' ? undefined : count || undefined,
            valueColor: accent,
            stateText: count || t('widget_list'),
            body:
                context.layout === 'default' ? (
                    <div
                        className="vis-standard-scroll"
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            // more rows than the card is tall are reached by scrolling, not by being cut off
                            overflowY: 'auto',
                            // ... and never sideways: a row is as wide as the card, whatever is in it
                            overflowX: 'hidden',
                            // room for the bar, so a reading does not end under it
                            paddingRight: 4,
                        }}
                    >
                        {rows.map(line)}
                    </div>
                ) : null,
        };
    },
});

export default listDevice;
