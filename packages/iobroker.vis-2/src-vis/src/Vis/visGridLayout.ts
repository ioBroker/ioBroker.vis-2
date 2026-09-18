/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { AnyWidgetId, ViewSection, ViewSettings, WidgetStyle } from '@iobroker/types-vis-2';

/**
 * The grid layout of a view, what it works out without touching the DOM or the store.
 *
 * The relative widgets of the view sit in sections. The sections flow over as many section columns as the view
 * is wide, and inside a section every widget occupies whole cells of a grid of twelve columns per section column
 * and rows of a fixed height. So on a narrow screen whole sections move below each other, while the arrangement
 * inside a section stays as it was designed - only its width follows the screen.
 *
 * CSS grid does the flowing. What is left to compute is here: how many section columns fit, which widget sits in
 * which section, and how many cells a widget occupies.
 */

/** The columns of the grid inside a section that occupies one section column */
export const GRID_COLUMNS = 12;

/** The CSS custom property through which a section tells its widgets how many columns it has */
export const GRID_COLUMNS_VAR = '--vis-grid-columns';

/** The section that takes the relative widgets no section lists */
export const IMPLICIT_SECTION_ID = '_implicit';

/** The grid layout settings of a view, every one of them with a usable value */
export interface GridLayout {
    sectionMinWidth: number;
    sectionMaxWidth: number;
    sectionGap: number;
    maxSections: number;
    denseSections: boolean;
    rowHeight: number;
    /** The space between the widgets inside a section, and around the sections */
    gridGap: number;
}

export const GRID_LAYOUT_DEFAULTS: Readonly<GridLayout> = {
    sectionMinWidth: 320,
    sectionMaxWidth: 500,
    sectionGap: 32,
    maxSections: 4,
    denseSections: false,
    rowHeight: 56,
    gridGap: 8,
};

/** A section as it is rendered */
export interface GridSection {
    id: string;
    /** The section columns it occupies, already limited to the ones there are */
    columnSpan: number;
    /** Its widgets, in the order they are shown */
    widgets: AnyWidgetId[];
    /** It is the section of the widgets no section lists, and not one of the view settings */
    implicit?: boolean;
}

/** How many cells of its section a widget occupies */
export interface GridCellSpan {
    /** `full` is the whole width of the section, whatever that is */
    columns: number | 'full';
    /** `auto` is one row that grows with the content */
    rows: number | 'auto';
}

/** The CSS that places a widget in its section */
export interface GridCellCss {
    gridColumn: string;
    gridRow: string;
    order: number;
}

/**
 * The value, if it is a number at least as big as `min`. The settings are edited by hand as well, so numbers
 * arrive as strings too.
 */
function toNumber(value: unknown, min: number): number | null {
    const num = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
    return isFinite(num) && num >= min ? num : null;
}

/**
 * The grid layout settings of a view, with the defaults for whatever is missing or unusable.
 *
 * @param settings - the settings of the view
 */
export function getGridLayout(settings: ViewSettings | undefined | null): GridLayout {
    const sectionMinWidth = toNumber(settings?.sectionMinWidth, 1) ?? GRID_LAYOUT_DEFAULTS.sectionMinWidth;
    return {
        sectionMinWidth,
        // a maximum below the minimum would make the sections narrower than they may get
        sectionMaxWidth: Math.max(
            sectionMinWidth,
            toNumber(settings?.sectionMaxWidth, 1) ?? GRID_LAYOUT_DEFAULTS.sectionMaxWidth,
        ),
        sectionGap: toNumber(settings?.sectionGap, 0) ?? GRID_LAYOUT_DEFAULTS.sectionGap,
        maxSections: Math.floor(toNumber(settings?.maxSections, 1) ?? GRID_LAYOUT_DEFAULTS.maxSections),
        denseSections: !!settings?.denseSections,
        rowHeight: toNumber(settings?.gridRowHeight, 1) ?? GRID_LAYOUT_DEFAULTS.rowHeight,
        gridGap: toNumber(settings?.gridGap, 0) ?? GRID_LAYOUT_DEFAULTS.gridGap,
    };
}

/**
 * How many section columns fit next to each other.
 *
 * Each one needs its minimal width, and there is a gap between two of them. The grid has a padding of `gridGap`
 * all around, which takes from the width too.
 *
 * @param width - the width of the view, in px
 * @param layout - the grid layout of the view
 */
export function getSectionColumnCount(width: number, layout: GridLayout): number {
    const available = width - 2 * layout.gridGap;
    const count = Math.floor((available + layout.sectionGap) / (layout.sectionMinWidth + layout.sectionGap));
    return Math.max(1, Math.min(layout.maxSections, count));
}

/**
 * How wide the grid may get, padding included, so that a wide screen does not stretch the sections past their
 * maximal width. The grid is centered in what is left over.
 *
 * @param columnCount - the section columns there are
 * @param layout - the grid layout of the view
 */
export function getGridMaxWidth(columnCount: number, layout: GridLayout): number {
    return columnCount * layout.sectionMaxWidth + (columnCount - 1) * layout.sectionGap + 2 * layout.gridGap;
}

/**
 * Distribute the relative widgets over the sections.
 *
 * `widgets` are the relative widgets the view shows, in their order. A section keeps the ones it lists, in its
 * own order. What a section lists but the view does not show - a deleted widget, one hidden by a filter, one that
 * is not relative any more - is left out, and a widget that two sections list stays in the first one. The widgets
 * no section lists go to one more section at the end that spans the whole width, so a view switched to the grid
 * layout shows everything even before it has any section.
 *
 * @param sections - the sections of the view settings
 * @param widgets - the relative widgets the view shows, in their order
 * @param columnCount - the section columns there are
 * @param keepEmpty - keep the sections that end up without widgets; the editor shows them so they can be filled
 */
export function buildGridSections(
    sections: ViewSection[] | undefined | null,
    widgets: AnyWidgetId[],
    columnCount: number,
    keepEmpty: boolean,
): GridSection[] {
    const shown = new Set(widgets);
    const placed = new Set<AnyWidgetId>();
    const usedIds = new Set<string>([IMPLICIT_SECTION_ID]);
    const result: GridSection[] = [];

    (Array.isArray(sections) ? sections : []).forEach((section, index) => {
        if (!section || typeof section !== 'object') {
            return;
        }
        // the id is the key of the section in React, so it has to be there and has to be unique
        let id = typeof section.id === 'string' && section.id ? section.id : `section_${index}`;
        if (usedIds.has(id)) {
            id = `${id}_${index}`;
        }
        usedIds.add(id);

        const sectionWidgets = (Array.isArray(section.widgets) ? section.widgets : []).filter(wid => {
            if (!shown.has(wid) || placed.has(wid)) {
                return false;
            }
            placed.add(wid);
            return true;
        });

        if (sectionWidgets.length || keepEmpty) {
            result.push({
                id,
                columnSpan: Math.min(columnCount, Math.floor(toNumber(section.columnSpan, 1) ?? 1)),
                widgets: sectionWidgets,
            });
        }
    });

    const rest = widgets.filter(wid => !placed.has(wid));
    if (rest.length) {
        result.push({ id: IMPLICIT_SECTION_ID, columnSpan: columnCount, widgets: rest, implicit: true });
    }

    return result;
}

/**
 * How many cells of its section a widget occupies.
 *
 * `gridColumns` and `gridRows` of the style say it. A widget that has not been placed in the grid yet brings
 * only a size in pixels, so that is turned into cells: the columns as if the section had its maximal width, the
 * rows from their height. That way a view switched to the grid layout keeps its widgets about as big as they were.
 *
 * @param style - the style of the widget
 * @param layout - the grid layout of the view
 */
export function getGridCellSpan(style: WidgetStyle | undefined | null, layout: GridLayout): GridCellSpan {
    return {
        columns: getColumnSpan(style, layout),
        rows: getRowSpan(style, layout),
    };
}

/** A length in pixels, or null if the value is none: a number, `120` or `120px` */
function parsePixels(value: unknown): number | null {
    if (typeof value === 'number') {
        return isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const m = value.trim().match(/^(-?\d+(?:\.\d+)?)(px)?$/);
        return m ? parseFloat(m[1]) : null;
    }
    return null;
}

/** A length in percent, or null if the value is none */
function parsePercent(value: unknown): number | null {
    if (typeof value === 'string') {
        const m = value.trim().match(/^(-?\d+(?:\.\d+)?)%$/);
        return m ? parseFloat(m[1]) : null;
    }
    return null;
}

function getColumnSpan(style: WidgetStyle | undefined | null, layout: GridLayout): number | 'full' {
    if (style?.gridColumns === 'full') {
        return 'full';
    }
    const columns = toNumber(style?.gridColumns, 1);
    if (columns !== null) {
        return Math.round(columns);
    }

    const percent = parsePercent(style?.width);
    if (percent !== null) {
        return percent >= 100 ? 'full' : Math.max(1, Math.round((GRID_COLUMNS * percent) / 100));
    }

    const width = parsePixels(style?.width);
    if (width !== null && width > 0) {
        // n columns are n cells and n - 1 gaps wide, so one column more is a cell and a gap more
        const pitch = (layout.sectionMaxWidth + layout.gridGap) / GRID_COLUMNS;
        return Math.max(1, Math.min(GRID_COLUMNS, Math.round((width + layout.gridGap) / pitch)));
    }

    // without a width there is nothing to go by; a row of its own is what shows such a widget best
    return 'full';
}

function getRowSpan(style: WidgetStyle | undefined | null, layout: GridLayout): number | 'auto' {
    if (style?.gridRows === 'auto') {
        return 'auto';
    }
    const rows = toNumber(style?.gridRows, 1);
    if (rows !== null) {
        return Math.round(rows);
    }

    const height = parsePixels(style?.height);
    if (height !== null && height > 0) {
        return Math.max(1, Math.round((height + layout.gridGap) / (layout.rowHeight + layout.gridGap)));
    }

    // a height in percent means nothing in a row that grows with the content, and neither does none
    return 'auto';
}

/**
 * The CSS that places a widget in its section.
 *
 * The columns are limited to the ones of the section in CSS, via `GRID_COLUMNS_VAR`: the widget does not know
 * how many section columns its section occupies at the moment. `order` keeps the order of the section, whatever
 * order the elements have in the DOM - the can.js widgets are inserted there outside of React.
 *
 * @param span - how many cells the widget occupies
 * @param order - the position of the widget in its section
 */
export function getGridCellCss(span: GridCellSpan, order: number): GridCellCss {
    return {
        gridColumn: span.columns === 'full' ? '1 / -1' : `span min(${span.columns}, var(${GRID_COLUMNS_VAR}))`,
        gridRow: span.rows === 'auto' ? 'auto' : `span ${span.rows}`,
        order: Math.max(0, order),
    };
}
