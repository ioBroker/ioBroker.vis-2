import { describe, expect, it } from 'vitest';

import type { Project, View } from '@iobroker/types-vis-2';

import {
    addToSection,
    findSectionOf,
    findSectionPlace,
    forgetWidgets,
    getSectionTransfer,
    getViewExport,
    getViewFileName,
    insertSection,
    insertView,
    parseSectionImport,
    parseViewImport,
    placeCopiesInSections,
    removeSection,
} from './viewTransfer';

/** A grid view: a group of two widgets and a single widget, in two sections */
const gridView = (): View =>
    ({
        name: 'Living',
        parentId: 'folder1',
        activeWidgets: ['w000001'],
        filterList: [],
        rerender: false,
        settings: {
            style: {},
            layout: 'grid',
            sections: [
                { id: 's1', widgets: ['g000001'] },
                { id: 's2', widgets: ['w000003', 'w000099'] },
            ],
            order: ['w000003', 'g000001'],
        },
        widgets: {
            g000001: { tpl: '_tplGroup', data: { members: ['w000001', 'w000002'] }, style: {} },
            w000001: { tpl: 'tplValue', groupid: 'g000001', grouped: true, data: {}, style: {} },
            w000002: { tpl: 'tplValue', groupid: 'g000001', grouped: true, data: {}, style: {} },
            w000003: { tpl: 'tplSwitch', data: { oid: 'a.0.b' }, style: {} },
        },
    }) as unknown as View;

/** A project whose IDs go up to w000005 and g000002 */
const project = (): Project =>
    ({
        ___settings: { folders: [] },
        Kitchen: {
            settings: { style: {} },
            widgets: {
                w000005: { tpl: 'tplValue', data: {}, style: {} },
                g000002: { tpl: '_tplGroup', data: { members: [] }, style: {} },
            },
            activeWidgets: [],
            filterList: [],
            rerender: false,
        },
    }) as unknown as Project;

describe('getViewExport', () => {
    it('leaves out the folder and the selection, and names the view', () => {
        const p = project();
        p.Living = gridView();
        p.Living.name = 'old name';
        const exported = getViewExport(p, 'Living');
        expect(exported.name).toBe('Living');
        expect(exported.parentId).toBeUndefined();
        expect(exported.activeWidgets).toEqual([]);
        expect(Object.keys(exported.widgets)).toHaveLength(4);
        // a copy, not the view itself
        expect(p.Living.parentId).toBe('folder1');
    });
});

describe('getViewFileName', () => {
    it('replaces what a file name may not contain', () => {
        expect(getViewFileName('Haus/EG: Wohnen')).toBe('Haus_EG_ Wohnen.json');
        expect(getViewFileName('  ')).toBe('view.json');
    });
});

describe('parseViewImport', () => {
    it('reads a single view under its name', () => {
        const result = parseViewImport(JSON.stringify(gridView()));
        expect(Object.keys(result.views!)).toEqual(['Living']);
    });

    it('lists a view without a name under an empty one', () => {
        const view = gridView();
        delete view.name;
        expect(Object.keys(parseViewImport(JSON.stringify(view)).views!)).toEqual(['']);
    });

    it('reads every view of a project, but not its settings', () => {
        const p = project();
        p.Living = gridView();
        expect(Object.keys(parseViewImport(JSON.stringify(p)).views!).sort()).toEqual(['Kitchen', 'Living']);
    });

    it('says what is wrong', () => {
        expect(parseViewImport('  ').error).toBe('');
        expect(parseViewImport('{ "a": ').error).toBe('The text is not valid JSON');
        expect(parseViewImport('[{ "tpl": "tplValue" }]').error).toMatch(/widgets/);
        expect(parseViewImport('{ "a": 1 }').error).toBe('No view found in the text');
    });
});

describe('insertView', () => {
    it('gives every widget a new ID and lets the sections, the order and the group follow', () => {
        const p = project();
        insertView(p, 'Living', gridView());
        const view = p.Living;

        // the IDs continue after the highest of the project
        expect(Object.keys(view.widgets).sort()).toEqual(['g000003', 'w000006', 'w000007', 'w000008']);
        const group = view.widgets.g000003 as any;
        expect(group.data.members).toEqual(['w000006', 'w000007']);
        expect(view.widgets.w000006.groupid).toBe('g000003');
        expect(view.widgets.w000008.data.oid).toBe('a.0.b');

        // w000099 does not exist and is dropped
        expect(view.settings.sections).toEqual([
            { id: 's1', widgets: ['g000003'] },
            { id: 's2', widgets: ['w000008'] },
        ]);
        expect(view.settings.order).toEqual(['w000008', 'g000003']);

        expect(view.name).toBe('Living');
        expect(view.parentId).toBeUndefined();
        expect(view.activeWidgets).toEqual([]);
    });

    it('does not change the source, so a view of the same project can be copied', () => {
        const p = project();
        p.Living = gridView();
        insertView(p, 'Living copy', p.Living, p.Living.parentId);

        expect(Object.keys(p.Living.widgets).sort()).toEqual(['g000001', 'w000001', 'w000002', 'w000003']);
        expect(p.Living.settings.sections![1].widgets).toEqual(['w000003', 'w000099']);

        const copy = p['Living copy'];
        expect(copy.parentId).toBe('folder1');
        expect(Object.keys(copy.widgets).sort()).toEqual(['g000003', 'w000006', 'w000007', 'w000008']);
        expect(copy.settings.sections![0].widgets).toEqual(['g000003']);
    });

    it('replaces a view of the same name', () => {
        const p = project();
        insertView(p, 'Kitchen', gridView());
        expect(Object.keys(p.Kitchen.widgets)).toHaveLength(4);
        expect(p.Kitchen.widgets.w000005).toBeUndefined();
    });

    it('keeps a widget whose group is missing, as a widget of its own', () => {
        const view = gridView();
        delete (view.widgets as any).g000001;
        const p = project();
        insertView(p, 'Living', view);
        expect(Object.keys(p.Living.widgets)).toHaveLength(3);
        for (const widget of Object.values(p.Living.widgets)) {
            expect(widget.groupid).toBeUndefined();
            expect(widget.grouped).toBeUndefined();
        }
    });

    it('takes a view without settings', () => {
        const p = project();
        insertView(p, 'Empty', { widgets: {} } as unknown as View);
        expect(p.Empty.settings).toEqual({ style: {} });
        expect(p.Empty.filterList).toEqual([]);
    });
});

describe('widgets that refer to each other', () => {
    it('lets a widget that shows another one show the copy of it', () => {
        const view = gridView();
        (view.widgets as any).w000003.data.widget1 = 'w000004';
        (view.widgets as any).w000004 = { tpl: 'tplValue', usedInWidget: true, data: {}, style: {} };
        const p = project();
        insertView(p, 'Living', view);
        const host = Object.values(p.Living.widgets).find(widget => widget.tpl === 'tplSwitch')!;
        expect(host.data.widget1).toMatch(/^w0000\d\d$/);
        expect(host.data.widget1).not.toBe('w000004');
        expect(p.Living.widgets[host.data.widget1 as 'w']).toBeDefined();
    });

    it('leaves out the widgets the editor shows only because another view shares them', () => {
        const p = project();
        p.Living = gridView();
        (p.Living.widgets as any).vKitchen_w000005 = { tpl: 'tplValue', data: {}, style: {} };
        expect(Object.keys(getViewExport(p, 'Living').widgets)).not.toContain('vKitchen_w000005');
        insertView(p, 'Living copy', p.Living);
        expect(Object.keys(p['Living copy'].widgets)).toHaveLength(4);
    });
});

describe('sections', () => {
    it('takes a section with its widgets, the members of its groups and nothing else', () => {
        const transfer = getSectionTransfer(gridView(), 's1')!;
        expect(transfer.section.id).toBe('s1');
        expect(Object.keys(transfer.widgets).sort()).toEqual(['g000001', 'w000001', 'w000002']);
        expect(getSectionTransfer(gridView(), 'nope')).toBeNull();
    });

    it('inserts a copy of a section with a new id and new widgets, after the given place', () => {
        const p = project();
        p.Living = gridView();
        (p.Living.settings.sections![0] as any).wizardId = 'room.living';
        const id = insertSection(p, 'Living', getSectionTransfer(p.Living, 's1')!, 1);

        expect(id).toBe('s3');
        const sections = p.Living.settings.sections!;
        expect(sections.map(section => section.id)).toEqual(['s1', 's3', 's2']);
        expect(sections[1].widgets).toEqual(['g000003']);
        expect((sections[1] as any).wizardId).toBeUndefined();
        expect((p.Living.widgets as any).g000003.data.members).toEqual(['w000006', 'w000007']);
        // the original is unchanged
        expect(sections[0].widgets).toEqual(['g000001']);
        expect((p.Living.widgets as any).g000001.data.members).toEqual(['w000001', 'w000002']);
    });

    it('puts a section into a view that has none, at the end', () => {
        const p = project();
        const id = insertSection(p, 'Kitchen', getSectionTransfer(gridView(), 's2')!);
        expect(p.Kitchen.settings.sections).toEqual([{ id, widgets: ['w000006'] }]);
        expect(p.Kitchen.widgets.w000006.tpl).toBe('tplSwitch');
    });

    it('removes a section with its widgets', () => {
        const p = project();
        p.Living = gridView();
        removeSection(p, 'Living', 's1');
        expect(p.Living.settings.sections!.map(section => section.id)).toEqual(['s2']);
        expect(Object.keys(p.Living.widgets)).toEqual(['w000003']);
    });

    it('finds the section of a widget and puts widgets after it', () => {
        const view = gridView();
        expect(findSectionOf(view, 'w000003')).toBe('s2');
        expect(findSectionOf(view, 'w000001')).toBeNull();

        (view.widgets as any).w000010 = { tpl: 'tplValue', data: {}, style: { position: 'relative' } };
        (view.widgets as any).w000011 = { tpl: 'tplValue', data: {}, style: { position: 'relative' } };
        expect(addToSection(view, 's1', ['w000010', 'w000011'], 'g000001')).toBe(true);
        expect(view.settings.sections![0].widgets).toEqual(['g000001', 'w000010', 'w000011']);
        expect(addToSection(view, 'nope', ['w000010'])).toBe(false);
    });

    it('puts copies after their originals, in the order of the section', () => {
        const view = gridView();
        view.settings.sections![1].widgets = ['w000003', 'w000004', 'w000005'] as any;
        for (const wid of ['w000004', 'w000005', 'w000014', 'w000013']) {
            (view.widgets as any)[wid] = { tpl: 'tplValue', data: {}, style: { position: 'relative' } };
        }
        // selected in reverse order
        placeCopiesInSections(view, [
            { from: 'w000004', to: 'w000014', place: findSectionPlace(view, 'w000004')! },
            { from: 'w000003', to: 'w000013', place: findSectionPlace(view, 'w000003')! },
        ]);
        expect(view.settings.sections![1].widgets).toEqual(['w000003', 'w000004', 'w000013', 'w000014', 'w000005']);
    });

    it('puts the copies of cut widgets where the originals were', () => {
        const view = gridView();
        view.settings.sections![1].widgets = ['w000003', 'w000004', 'w000005'] as any;
        (view.widgets as any).w000005 = { tpl: 'tplValue', data: {}, style: {} };
        (view.widgets as any).w000014 = { tpl: 'tplValue', data: {}, style: {} };
        const place = findSectionPlace(view, 'w000004')!;
        expect(place).toEqual({ section: 's2', index: 1 });
        // w000004 was cut
        forgetWidgets(view, ['w000004']);
        expect(view.settings.sections![1].widgets).toEqual(['w000003', 'w000005']);
        placeCopiesInSections(view, [{ from: 'w000004', to: 'w000014', place }]);
        expect(view.settings.sections![1].widgets).toEqual(['w000003', 'w000014', 'w000005']);
    });

    it('forgets deleted widgets in the sections and in the order', () => {
        const view = gridView();
        forgetWidgets(view, ['w000003', 'g000001']);
        expect(view.settings.sections!.map(section => section.widgets)).toEqual([[], ['w000099']]);
        expect(view.settings.order).toEqual([]);
    });
});

describe('parseSectionImport', () => {
    it('reads a single section', () => {
        const transfer = getSectionTransfer(gridView(), 's2')!;
        expect(Object.keys(parseSectionImport(JSON.stringify(transfer)).sections!)).toEqual(['s2']);
    });

    it('offers every section of a view and of a project, by title or id', () => {
        const view = gridView();
        (view.settings.sections![0] as any).title = 'Lights';
        expect(Object.keys(parseSectionImport(JSON.stringify(view)).sections!)).toEqual(['Lights', 's2']);

        const p = project();
        p.Living = view;
        expect(Object.keys(parseSectionImport(JSON.stringify(p)).sections!)).toEqual([
            'Living / Lights',
            'Living / s2',
        ]);
    });

    it('says what is wrong', () => {
        expect(parseSectionImport('').error).toBe('');
        expect(parseSectionImport('{').error).toBe('The text is not valid JSON');
        expect(parseSectionImport(JSON.stringify(project())).error).toBe('No section found in the text');
    });
});
