import React from 'react';

import { TableChart as TableIcon } from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';

import CellRulesDialog from '../Base/controls/CellRulesDialog';
import ColumnKeyField from '../Base/controls/ColumnKeyField';
import { cellLook, cellRules, type CellRule } from '../Base/controls/cellLook';
import { asNumber } from '../Base/controls/stateValue';
import {
    filterRows,
    formatMoment,
    guessEndKey,
    guessStartKey,
    momentOf,
    type CellFormat,
    type RowFilter,
} from '../Base/controls/tableFormat';
import { sortRows, tableCell, tableColumns, tableRows, type TableRow } from '../Base/controls/tableRows';
import { cssPixels } from '../Base/widgetCss';
import type { RxWidgetInfoAttributesField } from '@iobroker/types-vis-2';

import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';
import { STANDARD_I18N_PREFIX } from '../Base/prefix';

/** What a column is left with when the card is too narrow for all of them, before it scrolls */
const MIN_COLUMN_WIDTH = 72;

/** The most columns one card is worth describing by hand */
const MAX_COLUMNS = 8;

/** How often a table that shows moments catches up with the clock, in ms */
const TICK = 60_000;

interface TableRxData extends StandardRxData {
    /** How many columns are described; without any, the ones the data has */
    columns?: number | string;
    /** The heading row; a checkbox that was switched off is `false`, one never touched is nothing at all */
    withHead?: boolean | 'true' | 'false';
    /** Every second row a little lighter, which is what makes a long table readable */
    zebra?: boolean | 'true' | 'false';
    headColor?: string;
    headBackground?: string;
    /** At most this many rows; the rest is scrolled to */
    maxRows?: number | string;
    /** Which rows are shown, by the moment they are at */
    rowFilter?: RowFilter;
    /** The column the start of a row is in; without it the table looks for one */
    filterKey?: string;
    /** The column the end of a row is in; without it the table looks for one */
    filterEndKey?: string;
    /** Where in the state the list is, `articles` of `{ meta: …, articles: [ … ] }`; nothing is the whole state */
    listPath?: string;
    /** The column the rows are sorted by; without it they stay in the order of the adapter */
    sortKey?: string;
    /** The largest, the latest or the last word first */
    sortDescending?: boolean | 'true' | 'false';
}

interface Column {
    /** The key of the row this column shows */
    key: string;
    title: string;
    align: 'left' | 'center' | 'right';
    width?: string;
    prefix?: string;
    suffix?: string;
    color?: string;
    background?: string;
    /** A word per value, `0:Off;1:On`, for a column that carries a number meaning something */
    words: Record<string, string>;
    /** A colour per condition; the first that holds decides, see `cellLook.ts` */
    rules: CellRule[];
    /** How a moment in this column is written; nothing writes the value as it is */
    format: CellFormat;
    /** The letters of the format `custom`, like `DD.MM. hh:mm` */
    pattern?: string;
}

/**
 * The words a column was given for its values: `0:Off;1:On`.
 *
 * The same notation the input widget takes for its own choices, so there is one thing to learn rather than
 * two. What is not named keeps the value it has.
 *
 * @param written - what stands in the field
 */
function wordsOf(written: string | undefined): Record<string, string> {
    const words: Record<string, string> = {};
    (written || '')
        .split(';')
        .map(one => one.trim())
        .filter(one => one)
        .forEach(one => {
            const at = one.indexOf(':');
            if (at > 0) {
                words[one.slice(0, at).trim()] = one.slice(at + 1).trim();
            }
        });

    return words;
}

/**
 * The columns this table shows: the ones it was told, or the ones the data has.
 *
 * A state that carries a table usually carries more than belongs on a card, so the columns can be named -
 * and then only those are shown, in that order, under the headings they were given. Every column that has
 * no key yet is passed over, which is what makes the widget useful before anything has been set up: three
 * empty columns stand there to be filled, and until the first one is, the data decides.
 *
 * @param context - the widget and its settings
 * @param rows - the rows the state holds
 */
function columnsOf(context: DeviceContext<TableRxData>, rows: TableRow[]): Column[] {
    const count = Math.max(0, Math.min(parseInt(`${context.data.columns ?? 0}`, 10) || 0, MAX_COLUMNS));
    const described: Column[] = [];

    for (let index = 1; index <= count; index++) {
        const key = context.data[`columnKey${index}`];
        if (!key) {
            continue;
        }
        described.push({
            key,
            title: context.data[`columnTitle${index}`] || key,
            align: context.data[`columnAlign${index}`] || 'left',
            width: context.data[`columnWidth${index}`] || undefined,
            prefix: context.data[`columnPrefix${index}`] || undefined,
            suffix: context.data[`columnSuffix${index}`] || undefined,
            color: context.data[`columnColor${index}`] || undefined,
            background: context.data[`columnBackground${index}`] || undefined,
            words: wordsOf(context.data[`columnWords${index}`]),
            rules: cellRules(context.data[`columnRules${index}`]),
            format: context.data[`columnFormat${index}`] || '',
            pattern: context.data[`columnPattern${index}`] || undefined,
        });
    }

    if (described.length) {
        return described;
    }

    return tableColumns(rows).map(key => ({ key, title: key, align: 'left', words: {}, rules: [], format: '' }));
}

interface TableViewProps {
    rows: TableRow[];
    columns: Column[];
    withHead: boolean;
    zebra: boolean;
    /** At most this many rows, after the filter */
    limit: number | null;
    filter: RowFilter;
    filterKey?: string;
    filterEndKey?: string;
    headColor?: string;
    headBackground?: string;
    smallSize: number;
    isFloatComma: boolean;
    theme: DeviceContext<TableRxData>['theme'];
    emptyText: string;
}

/**
 * The table itself, with the clock it needs.
 *
 * Which appointments are still to come, and whether one is today or tomorrow, is worked out against now - and a
 * widget that read the clock while it renders would draw something different on every render, which is how
 * React ends up rendering for ever. So the clock is read here, once a minute, the way the washing machine reads
 * it for its countdown.
 *
 * @param props - the rows, the columns, and how they are shown
 */
function TableView(props: TableViewProps): React.JSX.Element {
    const { theme, columns } = props;
    const timed = !!props.filter || columns.some(column => column.format === 'relative');
    const [now, setNow] = React.useState(() => Date.now());

    React.useEffect(() => {
        if (!timed) {
            return undefined;
        }
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), TICK);
        return () => clearInterval(timer);
    }, [timed]);

    const lang = I18n.getLanguage();
    const startKey = props.filterKey || guessStartKey(props.rows, columns);
    const endKey = props.filterEndKey || guessEndKey(props.rows);
    const kept = filterRows(props.rows, props.filter, startKey, endKey, now);
    const rows = props.limit && props.limit > 0 ? kept.slice(0, props.limit) : kept;
    // a stripe out of the text colour, so it works in both themes without a colour of its own
    const stripe = theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.035)' : 'rgba(255, 255, 255, 0.045)';

    /*
     * `table-layout: fixed` is what makes a width a width.
     *
     * Without it a table is as wide as its longest cell and the card scrolls sideways; with it the given
     * widths hold and the rest share what is left. It also makes the ellipsis work on its own - a
     * `max-width: 0` for that, which is the trick an automatic layout needs, overrules the widths here
     * and squeezes every named column down to a letter.
     */
    const cell: React.CSSProperties = {
        // a column told to be ninety pixels wide is ninety wide, padding and all - otherwise the widths
        // and the floor below disagree by exactly the padding, and the free column pays for it
        boxSizing: 'border-box',
        padding: '4px 8px',
        fontSize: props.smallSize,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    };

    /*
     * How narrow the table may become before the card scrolls sideways.
     *
     * `table-layout: fixed` hands every column its width and lets the ones without a width share what is
     * left - and on a phone there is nothing left: a card of three hundred pixels with two columns of
     * ninety swallowed the third one whole, headline and all, without so much as a scrollbar. So every
     * column keeps a floor of its own, the table is at least as wide as those floors together, and the
     * card around it scrolls when they no longer fit. A column told to be forty pixels wide stays forty.
     */
    const minWidth = columns.reduce((sum, column) => {
        const px = /^\d+(\.\d+)?px$/.test(column.width || '') ? parseFloat(column.width as string) : null;
        return sum + (px ?? MIN_COLUMN_WIDTH);
    }, 0);

    /**
     * What a cell says: a moment as its column writes it, a word the column has for the value, or the value.
     *
     * @param column - the column of the cell
     * @param value - what the row holds under it
     */
    const written = (column: Column, value: unknown): string => {
        if (column.format) {
            const moment = momentOf(value);
            if (moment !== null) {
                return formatMoment(moment, column.format, { lang, now, pattern: column.pattern });
            }
        }
        const plain = tableCell(value, props.isFloatComma);
        // a word the column was given for this value wins over the value
        return column.words[plain] ?? plain;
    };

    return (
        <div
            className="vis-standard-scroll"
            style={{ width: '100%', height: '100%', overflow: 'auto' }}
        >
            {rows.length && columns.length ? (
                <table
                    style={{
                        width: '100%',
                        minWidth,
                        borderCollapse: 'collapse',
                        tableLayout: 'fixed',
                    }}
                >
                    {props.withHead ? (
                        <thead>
                            <tr>
                                {columns.map(column => (
                                    <th
                                        key={column.key}
                                        style={{
                                            ...cell,
                                            width: column.width,
                                            textAlign: column.align,
                                            fontWeight: 700,
                                            color: props.headColor || theme.palette.text.secondary,
                                            // the heading stays while the rows are scrolled past it
                                            position: 'sticky',
                                            top: 0,
                                            // it must not be see-through: the rows pass underneath
                                            background: props.headBackground || theme.palette.background.paper,
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                        }}
                                    >
                                        {column.title}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    ) : null}
                    <tbody>
                        {rows.map((row, index) => (
                            <tr
                                key={index}
                                style={{ background: props.zebra && index % 2 ? stripe : undefined }}
                            >
                                {columns.map(column => {
                                    const value = row[column.key];
                                    const text = written(column, value);
                                    /*
                                     * The rules are asked with the value, not with what is written.
                                     * `> 25` on a column that shows `26,1 °C` has to compare numbers,
                                     * and the text has a unit and a comma in it by then.
                                     */
                                    const look = cellLook(value, column.rules);
                                    return (
                                        <td
                                            key={column.key}
                                            title={text}
                                            style={{
                                                ...cell,
                                                width: column.width,
                                                textAlign: column.align,
                                                color: look.color || column.color || theme.palette.text.primary,
                                                background: look.background || column.background,
                                                borderTop: index ? `1px solid ${theme.palette.divider}` : undefined,
                                            }}
                                        >
                                            {text === '' ? '' : `${column.prefix || ''}${text}${column.suffix || ''}`}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div
                    style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: props.smallSize,
                        color: theme.palette.text.secondary,
                    }}
                >
                    {props.emptyText}
                </div>
            )}
        </div>
    );
}

/**
 * A field that offers the keys of the state, for a setting that names a column.
 *
 * @param labelKey - the word of the field
 * @param lists - offer the lists inside the state, for the field that names the path to one
 */
function keyField(
    labelKey: string,
    lists?: boolean,
): Extract<RxWidgetInfoAttributesField, { type: 'custom' }>['component'] {
    const component: Extract<RxWidgetInfoAttributesField, { type: 'custom' }>['component'] = (
        field,
        data,
        onDataChange,
        componentProps,
    ) => {
        const name = `${field.name}`;
        return (
            <ColumnKeyField
                value={data[name] || ''}
                oid={data.oid}
                path={lists ? undefined : data.listPath}
                lists={lists}
                socket={componentProps.context.socket}
                label={I18n.t(`${STANDARD_I18N_PREFIX}${labelKey}`)}
                onChange={value => onDataChange({ ...data, [name]: value })}
            />
        );
    };
    return component;
}

/**
 * A table out of a state: the rows an adapter put into it as JSON.
 *
 * Plenty of adapters hand over a list rather than a value - the next departures, the open alarms, the
 * shopping list, the devices of a gateway - and until now a page could only show that as the raw JSON it is.
 * The shapes those lists come in differ per adapter, so four of them are read, see `tableRows.ts`.
 *
 * Which columns are shown can be left alone, and then the data decides. Where that is too much, they are
 * named one by one with their heading, their width, their alignment and what is written in front of and
 * behind every cell - `kW` behind a number is a column, not a hundred cells.
 */
const tableDevice = defineDeviceWidget<TableRxData>({
    name: 'Table',
    label: 'widget_table',
    help: 'help_table',
    picture: {
        glyph:
            '<rect x="3" y="4.5" width="18" height="15" rx="2" stroke-width="2"/>' +
            '<path d="M3 9.5h18M9.5 9.5v10" stroke-width="2"/>',
        table: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="4" y="6" width="24" height="20" rx="2.5" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M4 13h24M13 13v13" stroke="currentColor" stroke-width="2.5"/></svg>',
    deviceTypes: [],
    fields: [
        { name: 'oid', type: 'id', label: 'oid_table', tooltip: 'oid_table_tooltip' },
        {
            name: 'listPath',
            type: 'custom',
            label: 'table_list_path',
            tooltip: 'table_list_path_tooltip',
            noBinding: true,
            component: keyField('table_list_path', true),
        },
        {
            name: 'sortKey',
            type: 'custom',
            label: 'table_sort_key',
            tooltip: 'table_sort_key_tooltip',
            noBinding: true,
            component: keyField('table_sort_key'),
        },
        { name: 'sortDescending', type: 'checkbox', label: 'table_sort_descending', hidden: '!data.sortKey' },
        { name: 'withHead', type: 'checkbox', label: 'table_head', default: true },
        { name: 'zebra', type: 'checkbox', label: 'table_zebra', default: true },
        { name: 'headColor', type: 'color', label: 'table_head_color', hidden: '!data.withHead' },
        { name: 'headBackground', type: 'color', label: 'table_head_background', hidden: '!data.withHead' },
        { name: 'maxRows', type: 'number', label: 'table_max_rows', min: 0, max: 500 },
        {
            name: 'rowFilter',
            type: 'select',
            label: 'table_filter',
            tooltip: 'table_filter_tooltip',
            default: '',
            options: [
                { value: '', label: 'table_filter_none' },
                { value: 'upcoming', label: 'table_filter_upcoming' },
                { value: 'today', label: 'table_filter_today' },
                { value: 'todayUpcoming', label: 'table_filter_today_upcoming' },
            ],
        },
        {
            name: 'filterKey',
            type: 'custom',
            label: 'table_filter_key',
            tooltip: 'table_filter_key_tooltip',
            noBinding: true,
            hidden: '!data.rowFilter',
            component: keyField('table_filter_key'),
        },
        {
            name: 'filterEndKey',
            type: 'custom',
            label: 'table_filter_end_key',
            tooltip: 'table_filter_key_tooltip',
            noBinding: true,
            hidden: '!data.rowFilter',
            component: keyField('table_filter_end_key'),
        },
        {
            name: 'columns',
            type: 'number',
            label: 'table_columns',
            tooltip: 'table_columns_tooltip',
            min: 0,
            max: MAX_COLUMNS,
            default: 3,
        },
    ],
    groups: [
        {
            name: 'columns',
            label: 'group_columns',
            indexFrom: 1,
            indexTo: 'columns',
            fields: [
                {
                    name: 'columnKey',
                    type: 'custom',
                    label: 'column_key',
                    tooltip: 'column_key_tooltip',
                    noBinding: true,
                    // the keys are read out of the state itself, so nobody has to look up the JSON first
                    component: keyField('column_key'),
                },
                { name: 'columnTitle', label: 'column_title' },
                {
                    name: 'columnAlign',
                    type: 'select',
                    label: 'text_align',
                    default: 'left',
                    options: [
                        { value: 'left', label: 'text_align_left' },
                        { value: 'center', label: 'text_align_center' },
                        { value: 'right', label: 'text_align_right' },
                    ],
                },
                { name: 'columnWidth', label: 'column_width', tooltip: 'column_width_tooltip' },
                { name: 'columnPrefix', label: 'column_prefix' },
                { name: 'columnSuffix', label: 'column_suffix' },
                {
                    name: 'columnFormat',
                    type: 'select',
                    label: 'column_format',
                    tooltip: 'column_format_tooltip',
                    default: '',
                    options: [
                        { value: '', label: 'column_format_none' },
                        { value: 'time', label: 'column_format_time' },
                        { value: 'date', label: 'column_format_date' },
                        { value: 'dateShort', label: 'column_format_date_short' },
                        { value: 'datetime', label: 'column_format_datetime' },
                        { value: 'weekdayTime', label: 'column_format_weekday_time' },
                        { value: 'relative', label: 'column_format_relative' },
                        { value: 'custom', label: 'column_format_custom' },
                    ],
                },
                {
                    name: 'columnPattern',
                    label: 'column_pattern',
                    tooltip: 'column_pattern_tooltip',
                    hidden: 'data["columnFormat" + index] !== "custom"',
                },
                { name: 'columnWords', label: 'column_words', tooltip: 'input_options_tooltip' },
                { name: 'columnColor', type: 'color', label: 'column_color' },
                { name: 'columnBackground', type: 'color', label: 'column_background' },
                {
                    name: 'columnRules',
                    type: 'custom',
                    label: 'column_rules',
                    noBinding: true,
                    component: (field, data, onDataChange, componentProps) => {
                        // in a group the field is called `columnRules` and what it writes `columnRules3`
                        const name = `${field.name}`;
                        const at = field.index ?? '';
                        return (
                            <CellRulesDialog
                                value={data[name]}
                                title={data[`columnTitle${at}`] || data[`columnKey${at}`]}
                                theme={componentProps.context.theme}
                                themeType={componentProps.context.theme.palette.mode}
                                onChange={value => onDataChange({ ...data, [name]: value })}
                            />
                        );
                    },
                },
            ],
        },
    ],
    tile: { columns: 'full', rows: 6, minColumns: 3, minRows: 3 },
    markerShape: 'icon',
    // a table on a coin is a grey block; the click brings up the card that can actually be read
    popup: true,
    render: context => {
        const { data, accents, theme, t } = context;
        // the rows calculate with the size of their writing, so one that was set in pixels takes its place
        const smallSize = cssPixels(context.css.text.fontSize) ?? context.tokens.smallSize;

        const all = sortRows(
            tableRows(context.valueOf('oid'), data.listPath),
            data.sortKey || undefined,
            data.sortDescending === true || data.sortDescending === 'true',
        );
        const columns = columnsOf(context, all);

        return {
            accent: accents.blue,
            active: false,
            icon: <TableIcon style={{ width: '100%', height: '100%' }} />,
            stateText: t('table_rows', all.length),
            marker: { text: `${all.length}` },
            body:
                context.layout === 'default' ? (
                    <TableView
                        rows={all}
                        columns={columns}
                        withHead={data.withHead !== false && data.withHead !== 'false'}
                        zebra={data.zebra !== false && data.zebra !== 'false'}
                        limit={asNumber(data.maxRows)}
                        filter={data.rowFilter || ''}
                        filterKey={data.filterKey || undefined}
                        filterEndKey={data.filterEndKey || undefined}
                        headColor={data.headColor}
                        headBackground={data.headBackground}
                        smallSize={smallSize}
                        isFloatComma={context.isFloatComma}
                        theme={theme}
                        emptyText={t('table_empty')}
                    />
                ) : null,
            // the rows are the card; a tile the size of a coin says how many there are
            value: context.layout === 'default' ? undefined : `${all.length}`,
        };
    },
});

export default tableDevice;
