/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisBaseWidgetProps } from '@iobroker/types-vis-2';
import VisRxWidget, { type VisRxWidgetState } from '../../visRxWidget';

/** One line of the table. Everything but the keys starting with an underscore is a column. */
type TableRow = Record<string, any> & {
    /** CSS classes of the row; `selected` marks the line that is shown as selected from the start */
    _class?: string;
    /** identifies the line, so that an event can replace the line it belongs to instead of adding another */
    _id?: string | number;
    /** what is written to `ack_oid` when the button of this line is pressed */
    _ack_id?: string;
    /** shown in the widget named by `detailed_wid` when the line is clicked */
    _detail?: Record<string, any> | string;
};

type RxData = {
    table_oid: string;
    static_value: string;
    event_oid: string;
    new_on_top: boolean;
    ack_oid: string;
    selected_oid: string;
    hide_header: boolean;
    show_scroll: boolean;
    detailed_wid: string;
    max_rows: number;
    /** draw with the class names of the can.js widget instead of the modern look, see vis.css */
    noStyle: boolean;
    colCount: number;
    class: string;
    [colName: `colName${number}`]: string;
    [colWidth: `colWidth${number}`]: string;
    [colAttr: `colAttr${number}`]: string;
};

interface BasicTableState extends VisRxWidgetState {
    /** the lines that arrived through `event_oid`, on top of the lines of the table itself */
    events: TableRow[];
    /** which line is drawn as selected */
    selectedIndex: number | null;
}

/** One column: which attribute of a line it shows, and the number that names its header and width */
interface Column {
    attr: string;
    index: number;
    isButton: boolean;
}

/**
 * `Basic - Table`: a table from a state that holds JSON.
 *
 * Replaces the can.js template `tplTableBody` together with `widgets/basic/js/table.js`. The markup and the CSS
 * classes are kept exactly - `tclass` and everything derived from it is what `widgets/basic/css/table.css`
 * styles, and projects style their tables through those names - but the two things that library needed jQuery
 * for are gone:
 *
 * - it rebuilt the whole table by hand whenever the state changed. Here the state changes and React renders.
 * - a new line from `event_oid` was spliced into the DOM. Here it is kept in the state of the widget, and a
 *   line whose `_id` is already there replaces that one, as it did before.
 */
class BasicTable extends VisRxWidget<RxData, BasicTableState> {
    /** the value of `event_oid` this widget has already taken in, so a re-render does not add it twice */
    private lastEvent: string | null = null;

    constructor(props: VisBaseWidgetProps) {
        super(props);
        this.state = { ...this.state, events: [], selectedIndex: null };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplTableBody',
            visSet: 'basic',
            visName: 'Table',
            visPrev: 'widgets/basic/img/Prev_TableBody.svg',
            visAttrs: [
                // One group, as the template had it: `group_header` is the only group name the words of the
                // widget set know, and inventing `group_table` or `group_columns` would show them untranslated.
                {
                    name: 'common',
                    fields: [
                        { name: 'table_oid', type: 'id' },
                        { name: 'static_value', type: 'text' },
                        { name: 'event_oid', type: 'id' },
                        { name: 'new_on_top', type: 'checkbox' },
                        { name: 'ack_oid', type: 'id' },
                        { name: 'selected_oid', type: 'id' },
                        { name: 'hide_header', type: 'checkbox' },
                        { name: 'show_scroll', type: 'checkbox' },
                        { name: 'detailed_wid', type: 'widget' },
                        { name: 'max_rows', type: 'number' },
                        { name: 'noStyle', label: 'table_no_style', type: 'checkbox' },
                        { name: 'colCount', type: 'number', min: 0, max: 20 },
                    ],
                },
                {
                    name: 'header',
                    indexFrom: 1,
                    indexTo: 'colCount',
                    fields: [
                        { name: 'colName', type: 'text' },
                        { name: 'colWidth', type: 'text' },
                        { name: 'colAttr', type: 'text' },
                    ],
                },
            ],
            visWidgetLabel: 'table_body', // Label of widget
            visHelp: 'help_table_body', // Description in the palette
            visDefaultStyle: {
                width: 300,
                height: 150,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicTable.getWidgetInfo();
    }

    /** The class every name in the table is built from; `tclass` is what table.css styles */
    private getTableClass(): string {
        return this.state.rxData.class || 'tclass';
    }

    /**
     * The lines of the table itself, without the ones that arrived as events.
     *
     * @returns the parsed lines, and an empty list when the state holds nothing usable
     */
    private getBaseRows(): TableRow[] {
        const source = this.state.rxData.table_oid
            ? this.state.values[`${this.state.rxData.table_oid}.val`]
            : this.state.rxData.static_value || '';

        if (!source) {
            return [];
        }
        if (typeof source !== 'string') {
            return Array.isArray(source) ? (source as TableRow[]) : [];
        }
        try {
            const parsed = JSON.parse(source);
            return Array.isArray(parsed) ? (parsed as TableRow[]) : [];
        } catch {
            console.log('showTable: Cannot parse json table');
            return [];
        }
    }

    /**
     * Which columns a line has.
     *
     * The rule of `table.js`: the keys of the line are walked in order and counted, and `colAttr<n>` may say
     * that the n-th column shows a different attribute. A key starting with an underscore is data of the line
     * and no column - unless it is a `_btn...`, which is a button, or unless a `colAttr<n>` names it.
     *
     * @param row - the line the columns are read from, normally the first one
     * @returns the columns in the order they are drawn
     */
    private getColumns(row: TableRow): Column[] {
        const columns: Column[] = [];
        const colCount = this.state.rxData.colCount;
        let index = 1;

        for (const key of Object.keys(row)) {
            if (typeof row[key] === 'function' || key.startsWith('jQuery')) {
                continue;
            }
            const attr = this.state.rxData[`colAttr${index}`] || key;

            if (attr.startsWith('_')) {
                if (attr.startsWith('_btn') || this.state.rxData[`colAttr${index}`]) {
                    columns.push({ attr, index, isButton: attr.startsWith('_btn') });
                    index++;
                }
                continue;
            }
            if (!colCount || index <= colCount) {
                columns.push({ attr, index, isButton: false });
            }
            index++;
        }

        return columns;
    }

    componentDidMount(): void {
        super.componentDidMount();
        // a value that is already there when the widget appears is not a new event
        this.lastEvent = this.state.rxData.event_oid
            ? ((this.state.values[`${this.state.rxData.event_oid}.val`] as string) ?? null)
            : null;
    }

    /**
     * Take in a line that arrived through `event_oid`.
     *
     * Called from the render, because the value of a state reaches a widget as a new render and there is no
     * other moment to notice it. It only touches the state when the value really changed.
     */
    private collectEvent(): void {
        const eventOid = this.state.rxData.event_oid;
        if (!eventOid) {
            return;
        }
        const raw = this.state.values[`${eventOid}.val`] as string;
        if (!raw || raw === this.lastEvent) {
            return;
        }
        this.lastEvent = raw;

        let event: TableRow;
        if (typeof raw === 'string') {
            try {
                event = JSON.parse(raw);
            } catch {
                console.log(`elem.triggered: Cannot parse json new event ${raw}`);
                return;
            }
        } else {
            event = raw as TableRow;
        }
        if (!event) {
            return;
        }

        setTimeout(() => {
            this.setState(state => {
                const events = [...state.events];
                // a line that names an `_id` replaces the line with that id instead of adding another
                const existing = event._id === undefined ? -1 : events.findIndex(e => e._id === event._id);
                if (existing !== -1) {
                    events[existing] = event;
                } else if (this.state.rxData.new_on_top) {
                    events.unshift(event);
                } else {
                    events.push(event);
                }
                return { events };
            });
        }, 0);
    }

    /** Select a line: mark it, write it to `selected_oid` and show its detail */
    private onRowClick(row: TableRow, index: number): void {
        if (this.props.editMode) {
            return;
        }
        this.setState({ selectedIndex: index });

        if (this.state.rxData.selected_oid) {
            this.props.context.setValue(
                this.state.rxData.selected_oid,
                typeof row === 'string' ? row : JSON.stringify(row),
            );
        }

        this.showDetail(row);
    }

    /**
     * Write the detail of a line into the widget named by `detailed_wid`.
     *
     * That widget belongs to the view and not to this one, so this reaches into its element by id - the same
     * way `table.js` did it. There is no way through React: the two are siblings in the view, and which widget
     * receives the detail is a setting of this one.
     *
     * @param row - the line that was clicked
     */
    private showDetail(row: TableRow): void {
        const target = this.state.rxData.detailed_wid
            ? window.document.getElementById(this.state.rxData.detailed_wid)
            : null;
        if (!target) {
            return;
        }
        const tClass = this.getTableClass();
        const detail = row._detail;
        if (detail === undefined || detail === null) {
            target.innerHTML = '';
            return;
        }

        const lines: string[] = [`<table class="${tClass}-detail">`];
        const addLine = (name: string, value: string, position: number): void => {
            lines.push(
                `<tr class="${tClass}-detail-tr ${tClass}-detail-tr-${position % 2 ? 'odd' : 'even'}">` +
                    `<td class="${tClass}-detail-td-name">${name}</td>` +
                    `<td class="${tClass}-detail-td-value">${value}</td></tr>`,
            );
            if (value && value.length > 6 && value.substring(value.length - 6) === '&nbsp;') {
                lines.push(`<tr class="${tClass}-detail-tr"><td colspan="2">&nbsp;</td></tr>`);
            }
        };

        if (typeof detail === 'object') {
            let position = 0;
            for (const name of Object.keys(detail)) {
                if (typeof detail[name] === 'function') {
                    continue;
                }
                addLine(name, (detail[name] as string)?.toString() ?? '', position);
                position++;
            }
        } else {
            addLine('detail', detail.toString(), 0);
        }
        lines.push('</table>');
        target.innerHTML = lines.join('');
    }

    /** The button of a line was pressed: confirm it */
    private onAckButton(event: React.MouseEvent, row: TableRow): void {
        event.stopPropagation();
        if (this.props.editMode || !this.state.rxData.ack_oid) {
            return;
        }
        this.props.context.setValue(this.state.rxData.ack_oid, row._ack_id || JSON.stringify(row));
    }

    /**
     * One cell of a line.
     *
     * @param row - the line
     * @param column - which column of it
     * @param rowIndex - the position of the line, so the button can be told apart
     */
    private renderCell(row: TableRow, column: Column, rowIndex: number): React.JSX.Element {
        const tClass = this.getTableClass();
        // the old look names every cell by its column, the modern one styles them all the same
        const cellClass = this.state.rxData.noStyle ? `${tClass}-th${column.index}` : undefined;
        const width = this.state.rxData[`colWidth${column.index}`];
        const style: React.CSSProperties = width ? { width } : {};
        const value = row[column.attr];

        if (column.isButton) {
            // a button is either its caption or an object that brings a class of its own with it
            const caption = typeof value === 'string' ? value : value?.caption;
            const buttonClass = typeof value === 'string' ? '' : value?._class;
            return (
                <td
                    key={column.index}
                    className={cellClass}
                    style={style}
                >
                    {caption ? (
                        <button
                            type="button"
                            data-index={rowIndex}
                            data-server-id={row._id}
                            className={`vis-table-ack-button ${tClass}-ack-button ${buttonClass ? `-${buttonClass}` : ''}`}
                            onClick={e => this.onAckButton(e, row)}
                        >
                            {caption}
                        </button>
                    ) : null}
                </td>
            );
        }

        // The cells were built as HTML in `table.js`, so a value that carries markup has always been rendered
        // as markup - a table that draws its own icons or colours relies on it.
        return (
            <td
                key={column.index}
                className={cellClass}
                style={style}
                dangerouslySetInnerHTML={{ __html: value === undefined || value === null ? '' : `${value}` }}
            />
        );
    }

    /** The table in the class names of the can.js widget it replaced, styled by widgets/basic/css/table.css */
    private renderLegacy(rows: TableRow[], columns: Column[], selectedIndex: number): React.JSX.Element {
        const tClass = this.getTableClass();

        return (
            <div className="vis-widget-body">
                {this.state.rxData.hide_header ? null : (
                    <table className={`vis-table-header ${tClass}`}>
                        <tbody>
                            <tr className={`${tClass}-th`}>{this.renderHeaderCells(columns, tClass)}</tr>
                        </tbody>
                    </table>
                )}
                <div
                    className={`vis-table-div ${tClass}-inner${this.state.rxData.show_scroll ? ' tclass-inner-overflow' : ''}`}
                >
                    <table className={`vis-table-body ${tClass}`}>
                        <tbody>
                            {rows.map((row, rowIndex) => (
                                <tr
                                    key={row._id ?? rowIndex}
                                    className={this.getRowClasses(row, rowIndex, selectedIndex, true).join(' ')}
                                    data-index={rowIndex}
                                    data-server-id={row._id}
                                    onClick={this.isClickable() ? () => this.onRowClick(row, rowIndex) : undefined}
                                >
                                    {columns.map(column => this.renderCell(row, column, rowIndex))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    /** The modern table: one scrolling area with a header that stays, see `.vis-table-modern` in vis.css */
    private renderModern(rows: TableRow[], columns: Column[], selectedIndex: number): React.JSX.Element {
        const tClass = this.getTableClass();

        return (
            <div
                className={`vis-widget-body vis-table-modern${
                    this.props.context.themeType === 'dark' ? ' vis-table-modern-dark' : ''
                }`}
            >
                <div className="vis-table-modern-scroll">
                    <table className="vis-table-body">
                        {this.state.rxData.hide_header ? null : (
                            <thead>
                                <tr>{this.renderHeaderCells(columns, tClass)}</tr>
                            </thead>
                        )}
                        <tbody>
                            {rows.map((row, rowIndex) => (
                                <tr
                                    key={row._id ?? rowIndex}
                                    className={this.getRowClasses(row, rowIndex, selectedIndex, false).join(' ')}
                                    data-index={rowIndex}
                                    data-server-id={row._id}
                                    onClick={this.isClickable() ? () => this.onRowClick(row, rowIndex) : undefined}
                                >
                                    {columns.map(column => this.renderCell(row, column, rowIndex))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    /** Whether a click on a row does anything */
    private isClickable(): boolean {
        return !!(this.state.rxData.detailed_wid || this.state.rxData.selected_oid);
    }

    /**
     * The header cells, which are the same in both looks apart from the class of the old one.
     *
     * @param columns - the columns to draw
     * @param tClass - the class every name of the old look is built from
     */
    private renderHeaderCells(columns: Column[], tClass: string): React.JSX.Element[] {
        return columns.map(column => (
            <th
                key={column.index}
                className={this.state.rxData.noStyle ? `${tClass}-th${column.index}` : undefined}
                style={
                    this.state.rxData[`colWidth${column.index}`]
                        ? { width: this.state.rxData[`colWidth${column.index}`] }
                        : undefined
                }
            >
                {this.state.rxData[`colName${column.index}`] || (column.isButton ? '' : column.attr)}
            </th>
        ));
    }

    /**
     * The classes of one row.
     *
     * The `_class` of a line is honoured in both looks - it is data of the table and not decoration of the
     * widget, and a project uses it to mark a line as its own.
     *
     * @param row - the line
     * @param rowIndex - its position
     * @param selectedIndex - which line is drawn as selected
     * @param legacy - whether the old class names are drawn
     */
    private getRowClasses(row: TableRow, rowIndex: number, selectedIndex: number, legacy: boolean): string[] {
        const tClass = this.getTableClass();
        const classes = ['vis-table-row'];

        if (legacy) {
            classes.push(`${tClass}-tr`, `${tClass}${rowIndex % 2 ? '-tr-even' : '-tr-odd'}`);
        } else if (this.isClickable()) {
            classes.push('vis-table-modern-clickable');
        }

        if (row._class) {
            for (const name of row._class.split(' ')) {
                classes.push(`${tClass}-tr-${name}`);
            }
        }
        if (rowIndex === selectedIndex) {
            classes.push(legacy ? `${tClass}-tr-selected` : 'vis-table-modern-selected');
        }

        return classes;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 300;
        props.style.height ??= 150;

        this.collectEvent();

        const rows = [...this.getBaseRows(), ...this.state.events].filter(row => row);
        const maxRows = parseInt(this.state.rxData.max_rows as unknown as string, 10);
        const shown = maxRows ? rows.slice(0, maxRows) : rows;
        const columns = shown.length ? this.getColumns(shown[0]) : [];

        // the line that says it is selected wins until another one is clicked
        const selectedIndex =
            this.state.selectedIndex ??
            shown.findIndex(row => row._class && row._class.split(' ').includes('selected'));

        return this.state.rxData.noStyle
            ? this.renderLegacy(shown, columns, selectedIndex)
            : this.renderModern(shown, columns, selectedIndex);
    }
}

export default BasicTable;
