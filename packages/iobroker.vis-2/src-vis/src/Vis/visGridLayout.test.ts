import { describe, expect, it } from 'vitest';

import type { AnyWidgetId, ViewSettings, WidgetStyle } from '@iobroker/types-vis-2';

import {
    buildGridSections,
    getGridCellCss,
    getGridCellSpan,
    getGridLayout,
    getGridMaxWidth,
    getSectionColumnCount,
    GRID_LAYOUT_DEFAULTS,
    IMPLICIT_SECTION_ID,
} from './visGridLayout';

const layout = getGridLayout(undefined);

describe('getGridLayout', () => {
    it('takes the defaults for a view without grid settings', () => {
        expect(getGridLayout({})).toEqual(GRID_LAYOUT_DEFAULTS);
    });

    it('reads numbers that were written as strings', () => {
        const settings = { sectionMinWidth: '280', gridRowHeight: '40' } as unknown as ViewSettings;
        expect(getGridLayout(settings)).toMatchObject({ sectionMinWidth: 280, rowHeight: 40 });
    });

    it('ignores what is not a usable number', () => {
        const settings = { sectionMinWidth: 'wide', maxSections: 0, gridGap: -4 } as unknown as ViewSettings;
        expect(getGridLayout(settings)).toMatchObject({ sectionMinWidth: 320, maxSections: 4, gridGap: 8 });
    });

    it('accepts no gap at all', () => {
        expect(getGridLayout({ sectionGap: 0, gridGap: 0 })).toMatchObject({
            sectionGap: 0,
            gridGap: 0,
        });
    });

    it('does not let the maximal width fall below the minimal one', () => {
        expect(getGridLayout({ sectionMinWidth: 400, sectionMaxWidth: 300 }).sectionMaxWidth).toBe(400);
    });
});

describe('getSectionColumnCount', () => {
    it('has one column on a phone', () => {
        expect(getSectionColumnCount(390, layout)).toBe(1);
    });

    it('needs the minimal width of both columns, the gap between them and the padding for a second one', () => {
        // 2 * 320 + 32 + 2 * 8 = 688
        expect(getSectionColumnCount(687, layout)).toBe(1);
        expect(getSectionColumnCount(688, layout)).toBe(2);
    });

    it('stops at the most columns the view allows', () => {
        expect(getSectionColumnCount(5000, layout)).toBe(4);
        expect(getSectionColumnCount(5000, { ...layout, maxSections: 2 })).toBe(2);
    });

    it('has one column before the view is measured', () => {
        expect(getSectionColumnCount(0, layout)).toBe(1);
    });
});

describe('getGridMaxWidth', () => {
    it('is the maximal width of every column, the gaps between them and the padding', () => {
        expect(getGridMaxWidth(1, layout)).toBe(500 + 16);
        expect(getGridMaxWidth(3, layout)).toBe(3 * 500 + 2 * 32 + 16);
    });
});

describe('buildGridSections', () => {
    const w = (...ids: string[]): AnyWidgetId[] => ids as AnyWidgetId[];

    it('puts everything into one section over the whole width when the view has none', () => {
        expect(buildGridSections(undefined, w('w1', 'w2'), 3, false)).toEqual([
            { id: IMPLICIT_SECTION_ID, columnSpan: 3, widgets: w('w1', 'w2'), implicit: true },
        ]);
    });

    it('keeps the order of the section and not the one of the view', () => {
        const sections = buildGridSections([{ id: 'a', widgets: w('w2', 'w1') }], w('w1', 'w2'), 1, false);
        expect(sections).toEqual([{ id: 'a', columnSpan: 1, widgets: w('w2', 'w1') }]);
    });

    it('puts the widgets no section lists into a section at the end, in the order of the view', () => {
        const sections = buildGridSections([{ id: 'a', widgets: w('w2') }], w('w1', 'w2', 'w3'), 2, false);
        expect(sections.map(s => [s.id, s.widgets])).toEqual([
            ['a', w('w2')],
            [IMPLICIT_SECTION_ID, w('w1', 'w3')],
        ]);
    });

    it('leaves out what the view does not show', () => {
        const sections = buildGridSections([{ id: 'a', widgets: w('w1', 'gone', 'w2') }], w('w1', 'w2'), 1, false);
        expect(sections[0].widgets).toEqual(w('w1', 'w2'));
    });

    it('shows a widget two sections list only in the first one', () => {
        const sections = buildGridSections(
            [
                { id: 'a', widgets: w('w1') },
                { id: 'b', widgets: w('w1', 'w2') },
            ],
            w('w1', 'w2'),
            2,
            false,
        );
        expect(sections.map(s => s.widgets)).toEqual([w('w1'), w('w2')]);
    });

    it('drops an empty section in the runtime and keeps it in the editor', () => {
        const sections = [
            { id: 'a', widgets: w('w1') },
            { id: 'b', widgets: w('gone') },
        ];
        expect(buildGridSections(sections, w('w1'), 2, false).map(s => s.id)).toEqual(['a']);
        expect(buildGridSections(sections, w('w1'), 2, true).map(s => s.id)).toEqual(['a', 'b']);
    });

    it('limits the span of a section to the columns there are', () => {
        const sections = [{ id: 'a', widgets: w('w1'), columnSpan: 3 }];
        expect(buildGridSections(sections, w('w1'), 4, false)[0].columnSpan).toBe(3);
        expect(buildGridSections(sections, w('w1'), 2, false)[0].columnSpan).toBe(2);
    });

    it('gives a section without a usable span one column', () => {
        const sections = [{ id: 'a', widgets: w('w1'), columnSpan: 0 }];
        expect(buildGridSections(sections, w('w1'), 4, false)[0].columnSpan).toBe(1);
    });

    it('makes the ids unique, as they are the keys of the sections', () => {
        const sections = buildGridSections(
            [
                { id: 'a', widgets: w('w1') },
                { id: 'a', widgets: w('w2') },
                { id: '', widgets: w('w3') },
                { id: IMPLICIT_SECTION_ID, widgets: w('w4') },
            ],
            w('w1', 'w2', 'w3', 'w4'),
            1,
            false,
        );
        const ids = sections.map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('survives sections that were edited into something else by hand', () => {
        const sections = [null, 'a', { id: 'b' }] as unknown as Parameters<typeof buildGridSections>[0];
        expect(buildGridSections(sections, w('w1'), 1, false).map(s => s.id)).toEqual([IMPLICIT_SECTION_ID]);
    });
});

describe('getGridCellSpan', () => {
    const span = (style: Partial<WidgetStyle> | Record<string, unknown>): ReturnType<typeof getGridCellSpan> =>
        getGridCellSpan(style, layout);

    it('takes the cells the style names', () => {
        expect(span({ gridColumns: 4, gridRows: 2, width: '100px', height: '500px' })).toEqual({
            columns: 4,
            rows: 2,
        });
    });

    it('takes full and auto as they are', () => {
        expect(span({ gridColumns: 'full', gridRows: 'auto' })).toEqual({ columns: 'full', rows: 'auto' });
    });

    it('reads cells that were written as strings', () => {
        expect(span({ gridColumns: '6', gridRows: '3' })).toEqual({ columns: 6, rows: 3 });
    });

    it('does not limit the columns to one section column - a wider section has more', () => {
        expect(span({ gridColumns: 18 }).columns).toBe(18);
    });

    it('turns a width in pixels into the columns it would need in a section of maximal width', () => {
        // one column is (500 + 8) / 12 = 42.3px including its gap
        expect(span({ width: 500 }).columns).toBe(12);
        expect(span({ width: '246px' }).columns).toBe(6);
        expect(span({ width: '120' }).columns).toBe(3);
        expect(span({ width: 5 }).columns).toBe(1);
        expect(span({ width: 2000 }).columns).toBe(12);
    });

    it('turns a width in percent into its share of the columns', () => {
        expect(span({ width: '100%' }).columns).toBe('full');
        expect(span({ width: '50%' }).columns).toBe(6);
        expect(span({ width: '1%' }).columns).toBe(1);
    });

    it('gives a widget without a usable width a row of its own', () => {
        expect(span({}).columns).toBe('full');
        expect(span({ width: 'calc(100% - 10px)' }).columns).toBe('full');
    });

    it('turns a height in pixels into rows', () => {
        // one row is 56 + 8 = 64px including its gap
        expect(span({ height: 56 }).rows).toBe(1);
        expect(span({ height: '120px' }).rows).toBe(2);
        expect(span({ height: 10 }).rows).toBe(1);
    });

    it('lets a widget without a height in pixels grow with its content', () => {
        expect(span({}).rows).toBe('auto');
        expect(span({ height: '100%' }).rows).toBe('auto');
    });

    it('ignores cells that make no sense and falls back to the size', () => {
        expect(span({ gridColumns: 0, gridRows: -1, width: '246px', height: '120px' })).toEqual({
            columns: 6,
            rows: 2,
        });
    });
});

describe('getGridCellCss', () => {
    it('limits the columns to the ones of the section', () => {
        expect(getGridCellCss({ columns: 6, rows: 2 }, 3)).toEqual({
            gridColumn: 'span min(6, var(--vis-grid-columns))',
            gridRow: 'span 2',
            order: 3,
        });
    });

    it('spans the whole section and lets the row follow the content', () => {
        expect(getGridCellCss({ columns: 'full', rows: 'auto' }, 0)).toEqual({
            gridColumn: '1 / -1',
            gridRow: 'auto',
            order: 0,
        });
    });

    it('never gives a negative order', () => {
        expect(getGridCellCss({ columns: 1, rows: 1 }, -1).order).toBe(0);
    });
});
