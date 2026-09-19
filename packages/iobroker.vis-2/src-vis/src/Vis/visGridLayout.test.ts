import { describe, expect, it } from 'vitest';

import type { AnyWidgetId, ViewSection, ViewSettings, WidgetStyle } from '@iobroker/types-vis-2';

import type { Box } from './visViewGeometry';
import {
    applyGridDrop,
    buildGridSections,
    clampGridSpan,
    computeGridDrop,
    getDefaultGridSpan,
    getNewViewSettings,
    getSectionFrameStyle,
    hasSectionHeader,
    SECTION_PANEL,
    getGridCellCss,
    getGridCellSpan,
    getGridLayout,
    getGridMaxWidth,
    getGridSpanFromSize,
    getSectionColumnCount,
    GRID_LAYOUT_DEFAULTS,
    type GridSection,
    gridDropIsDone,
    IMPLICIT_SECTION_ID,
    newSectionId,
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
        expect(sections).toEqual([{ id: 'a', columnSpan: 1, widgets: w('w2', 'w1'), index: 0 }]);
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

    it('remembers where a section is in the settings, as its id may have been made unique', () => {
        const sections = buildGridSections(
            [
                { id: 'a', widgets: w('gone') },
                { id: 'a', widgets: w('w1') },
            ],
            w('w1'),
            1,
            false,
        );
        expect(sections.map(s => [s.id, s.index])).toEqual([['a_1', 1]]);
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

const box = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom });
const ids = (...list: string[]): AnyWidgetId[] => list as AnyWidgetId[];

describe('computeGridDrop', () => {
    // s1 holds w1 and w2 next to each other, s2 holds w3; both sections have free space below their widgets
    const sections: GridSection[] = [
        { id: 's1', columnSpan: 1, widgets: ids('w1', 'w2'), index: 0 },
        { id: 's2', columnSpan: 1, widgets: ids('w3'), index: 1 },
    ];
    const sectionBoxes = { s1: box(0, 0, 100, 100), s2: box(200, 0, 300, 100) };
    const widgetBoxes = { w1: box(0, 0, 40, 40), w2: box(50, 0, 90, 40), w3: box(200, 0, 240, 40) };
    const drop = (x: number, y: number, dragged = 'w1'): GridSection[] =>
        computeGridDrop(sections, dragged as AnyWidgetId, sectionBoxes, widgetBoxes, x, y);
    const widgetsOf = (result: GridSection[]): AnyWidgetId[][] => result.map(s => s.widgets);

    it('puts the widget after the one under the lower right half of which the cursor is', () => {
        expect(widgetsOf(drop(85, 35))).toEqual([ids('w2', 'w1'), ids('w3')]);
    });

    it('puts the widget before the one under the upper left half of which the cursor is', () => {
        expect(widgetsOf(drop(5, 5, 'w2'))).toEqual([ids('w2', 'w1'), ids('w3')]);
    });

    it('decides by the diagonal, so a wide widget has its before and after on the left and the right', () => {
        const wide = { ...widgetBoxes, w2: box(0, 50, 400, 90) };
        const at = (x: number): AnyWidgetId[][] =>
            widgetsOf(computeGridDrop(sections, 'w3', sectionBoxes, wide, x, 60));
        expect(at(20)).toEqual([ids('w1', 'w3', 'w2'), []]);
        expect(at(380)).toEqual([ids('w1', 'w2', 'w3'), []]);
    });

    it('moves the widget into another section, before the widget there', () => {
        expect(widgetsOf(drop(205, 5))).toEqual([ids('w2'), ids('w1', 'w3')]);
    });

    it('puts the widget at the end of another section over its free space - that fills an empty one', () => {
        expect(widgetsOf(drop(280, 80))).toEqual([ids('w2'), ids('w3', 'w1')]);
    });

    it('changes nothing over the free space of its own section, over a gap or over itself', () => {
        expect(drop(50, 80)).toBe(sections);
        expect(drop(150, 50)).toBe(sections);
        expect(drop(10, 10)).toBe(sections);
    });

    it('gives the same sections back when the widget already sits where the cursor points', () => {
        // before w2 is where w1 is already
        expect(drop(55, 5)).toBe(sections);
    });

    it('does not change the sections it was given', () => {
        drop(205, 5);
        expect(widgetsOf(sections)).toEqual([ids('w1', 'w2'), ids('w3')]);
    });
});

describe('applyGridDrop', () => {
    const settingsSections = [
        { id: 'a', widgets: ids('w1', 'hidden', 'w2'), columnSpan: 2 },
        { id: 'b', widgets: ids('w3') },
    ];
    const order = ids('w1', 'w2', 'w3', 'w4', 'w5');
    const rendered = (a: string[], b: string[], rest: string[]): GridSection[] => [
        { id: 'a', columnSpan: 2, widgets: ids(...a), index: 0 },
        { id: 'b', columnSpan: 1, widgets: ids(...b), index: 1 },
        { id: IMPLICIT_SECTION_ID, columnSpan: 2, widgets: ids(...rest), implicit: true },
    ];

    it('moves the widget into another section and keeps everything else of the sections', () => {
        const result = applyGridDrop(
            settingsSections,
            order,
            rendered(['w2'], ['w1', 'w3'], ['w4', 'w5']),
            ids('w1')[0],
        );
        expect(result.sections).toEqual([
            { id: 'a', widgets: ids('hidden', 'w2'), columnSpan: 2 },
            { id: 'b', widgets: ids('w1', 'w3') },
        ]);
        expect(result.order).toEqual(order);
    });

    it('keeps the widgets the editor does not show at their place', () => {
        const result = applyGridDrop(settingsSections, order, rendered(['w2', 'w1'], ['w3'], []), ids('w1')[0]);
        expect(result.sections[0].widgets).toEqual(ids('hidden', 'w2', 'w1'));
    });

    it('takes a widget dropped among the widgets of no section out of every section and moves it in the order', () => {
        const result = applyGridDrop(
            settingsSections,
            order,
            rendered(['w2'], ['w3'], ['w4', 'w1', 'w5']),
            ids('w1')[0],
        );
        expect(result.sections.map(s => s.widgets)).toEqual([ids('hidden', 'w2'), ids('w3')]);
        expect(result.order).toEqual(ids('w2', 'w3', 'w4', 'w1', 'w5'));
    });

    it('works for a view that has neither sections nor an order yet', () => {
        const dropped: GridSection[] = [
            { id: IMPLICIT_SECTION_ID, columnSpan: 1, widgets: ids('w2', 'w1'), implicit: true },
        ];
        expect(applyGridDrop(undefined, undefined, dropped, ids('w1')[0])).toEqual({
            sections: [],
            order: ids('w1'),
        });
    });

    it('leaves what it cannot read alone and does not change what it was given', () => {
        const junk = [null, ...settingsSections] as unknown as typeof settingsSections;
        const dropped: GridSection[] = [
            { id: 'a', columnSpan: 1, widgets: ids('w2'), index: 1 },
            { id: 'b', columnSpan: 1, widgets: ids('w1', 'w3'), index: 2 },
        ];
        const result = applyGridDrop(junk, order, dropped, ids('w1')[0]);
        expect(result.sections[0]).toBeNull();
        expect(result.sections[2].widgets).toEqual(ids('w1', 'w3'));
        expect(settingsSections[0].widgets).toEqual(ids('w1', 'hidden', 'w2'));
        expect(settingsSections[1].widgets).toEqual(ids('w3'));
    });
});

describe('gridDropIsDone', () => {
    const at = (a: string[], b: string[]): GridSection[] => [
        { id: 'a', columnSpan: 1, widgets: ids(...a) },
        { id: 'b', columnSpan: 1, widgets: ids(...b) },
    ];
    const w1 = ids('w1')[0];

    it('is done when the project shows the widget where it was dropped', () => {
        expect(gridDropIsDone(at(['w2'], ['w1', 'w3']), at(['w2'], ['w1', 'w3']), w1)).toBe(true);
    });

    it('is not done while the project still shows the widget where it came from', () => {
        expect(gridDropIsDone(at(['w1', 'w2'], ['w3']), at(['w2'], ['w1', 'w3']), w1)).toBe(false);
    });

    it('is done when the view shows other widgets now', () => {
        expect(gridDropIsDone(at(['w1', 'w2'], ['w3', 'w4']), at(['w2'], ['w1', 'w3']), w1)).toBe(true);
    });
});

describe('getGridSpanFromSize', () => {
    const metrics = { columns: 12, width: 370, gap: 8, rowHeight: 56 };

    it('takes the nearest cells', () => {
        // a column is (370 + 8) / 12 = 31.5px with its gap, a row 64px
        expect(getGridSpanFromSize(181, 120, metrics)).toEqual({ columns: 6, rows: 2 });
        expect(getGridSpanFromSize(200, 150, metrics)).toEqual({ columns: 7, rows: 2 });
    });

    it('takes at least one cell and not more columns than the section has', () => {
        expect(getGridSpanFromSize(1, 1, metrics)).toEqual({ columns: 1, rows: 1 });
        expect(getGridSpanFromSize(1000, 1000, metrics).columns).toBe(12);
    });

    it('does not limit the rows - a section grows downwards', () => {
        expect(getGridSpanFromSize(100, 1000, metrics).rows).toBe(16);
    });
});

describe('clampGridSpan', () => {
    it('keeps the cells within the limits of the type', () => {
        const limits = { minColumns: 3, maxColumns: 8, minRows: 2, maxRows: 4 };
        expect(clampGridSpan({ columns: 1, rows: 1 }, limits)).toEqual({ columns: 3, rows: 2 });
        expect(clampGridSpan({ columns: 12, rows: 9 }, limits)).toEqual({ columns: 8, rows: 4 });
        expect(clampGridSpan({ columns: 6, rows: 3 }, limits)).toEqual({ columns: 6, rows: 3 });
    });

    it('turns the whole width into the most columns the type allows', () => {
        expect(clampGridSpan({ columns: 'full', rows: 1 }, { maxColumns: 6 })).toEqual({ columns: 6, rows: 1 });
        expect(clampGridSpan({ columns: 'full', rows: 1 }, { minColumns: 6 })).toEqual({ columns: 'full', rows: 1 });
    });

    it('does not limit a row that follows the content', () => {
        expect(clampGridSpan({ columns: 4, rows: 'auto' }, { minRows: 3 }).rows).toBe('auto');
    });

    it('changes nothing without limits, or with limits that are no numbers', () => {
        expect(clampGridSpan({ columns: 5, rows: 7 }, undefined)).toEqual({ columns: 5, rows: 7 });
        const junk = { minColumns: 'many', maxRows: 0 } as unknown as Parameters<typeof clampGridSpan>[1];
        expect(clampGridSpan({ columns: 5, rows: 7 }, junk)).toEqual({ columns: 5, rows: 7 });
    });
});

describe('getDefaultGridSpan', () => {
    it('takes the cells the type names', () => {
        expect(getDefaultGridSpan({ columns: 4, rows: 1 }, { width: '500px', height: '500px' }, layout)).toEqual({
            columns: 4,
            rows: 1,
        });
        expect(getDefaultGridSpan({ columns: 'full', rows: 'auto' }, undefined, layout)).toEqual({
            columns: 'full',
            rows: 'auto',
        });
    });

    it('derives what the type leaves out from the size of its default style', () => {
        expect(getDefaultGridSpan({ rows: 1 }, { width: '246px', height: '500px' }, layout)).toEqual({
            columns: 6,
            rows: 1,
        });
        expect(getDefaultGridSpan(undefined, { width: '246px', height: '120px' }, layout)).toEqual({
            columns: 6,
            rows: 2,
        });
    });

    it('takes a row of its own that follows the content when nothing says a size', () => {
        expect(getDefaultGridSpan(undefined, undefined, layout)).toEqual({ columns: 'full', rows: 'auto' });
    });

    it('keeps the derived size within the limits of the type', () => {
        expect(getDefaultGridSpan({ maxColumns: 4 }, { width: '500px', height: '56px' }, layout)).toEqual({
            columns: 4,
            rows: 1,
        });
    });

    it('ignores what a widget set declares that is no size', () => {
        const junk = { columns: 0, rows: 'tall' } as unknown as Parameters<typeof getDefaultGridSpan>[0];
        expect(getDefaultGridSpan(junk, { width: '246px', height: '120px' }, layout)).toEqual({
            columns: 6,
            rows: 2,
        });
    });
});

describe('getSectionFrameStyle', () => {
    const paper = '#1e1e1e';
    const section = (props: Record<string, unknown>): ViewSection => ({ id: 's1', widgets: [], ...props });

    it('gives a section that sets nothing no frame, as before', () => {
        expect(getSectionFrameStyle(section({}), paper)).toEqual({});
        expect(getSectionFrameStyle(undefined, paper)).toEqual({});
    });

    it('makes a panel a card in the paper color of the theme', () => {
        expect(getSectionFrameStyle(section({ variant: 'panel' }), paper)).toEqual({
            background: paper,
            borderRadius: 12,
            padding: 12,
            boxShadow: SECTION_PANEL.boxShadow,
        });
    });

    it('lets what the section sets win over the panel', () => {
        const style = getSectionFrameStyle(
            section({ variant: 'panel', background: 'red', borderRadius: 0, padding: 4 }),
            paper,
        );
        expect(style).toMatchObject({
            background: 'red',
            borderRadius: 0,
            padding: 4,
            boxShadow: SECTION_PANEL.boxShadow,
        });
    });

    it('draws a border only with a width', () => {
        expect(getSectionFrameStyle(section({ borderColor: 'red' }), paper).border).toBeUndefined();
        expect(
            getSectionFrameStyle(section({ borderWidth: 2, borderColor: 'red', borderStyle: 'dashed' }), paper),
        ).toEqual({
            border: '2px dashed red',
        });
        expect(getSectionFrameStyle(section({ borderWidth: '1' }), paper).border).toBe('1px solid currentColor');
    });

    it('takes a solid border for a style it does not know', () => {
        expect(getSectionFrameStyle(section({ borderWidth: 1, borderStyle: 'groove; color: red' }), paper).border).toBe(
            '1px solid currentColor',
        );
    });

    it('ignores what is no number', () => {
        expect(
            getSectionFrameStyle(section({ borderRadius: 'round', padding: -3, borderWidth: 'thick' }), paper),
        ).toEqual({});
    });
});

describe('hasSectionHeader', () => {
    it('has a header with a title or an icon only', () => {
        expect(hasSectionHeader({ id: 's1', widgets: [], title: 'Kitchen' })).toBe(true);
        expect(hasSectionHeader({ id: 's1', widgets: [], icon: 'data:image/svg+xml;base64,AA' })).toBe(true);
        expect(hasSectionHeader({ id: 's1', widgets: [], title: '' })).toBe(false);
        expect(hasSectionHeader(undefined)).toBe(false);
    });
});

describe('getNewViewSettings', () => {
    it('starts a new view in the grid layout with one empty section', () => {
        const settings = getNewViewSettings();
        expect(settings.layout).toBe('grid');
        expect(settings.sections).toEqual([{ id: 's1', widgets: [] }]);
    });

    it('gives every view its own settings, so that editing one view changes no other', () => {
        const first = getNewViewSettings();
        first.sections?.[0].widgets.push('w000001');
        expect(getNewViewSettings().sections?.[0].widgets).toEqual([]);
    });
});

describe('newSectionId', () => {
    it('numbers the sections', () => {
        expect(newSectionId(undefined)).toBe('s1');
        expect(newSectionId([{ id: 's1', widgets: [] }])).toBe('s2');
    });

    it('does not take an id that is there already', () => {
        expect(newSectionId([{ id: 's2', widgets: [] }])).toBe('s3');
    });
});
