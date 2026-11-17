import { describe, expect, it } from 'vitest';

import type { GroupWidget, Project, Widget } from '@iobroker/types-vis-2';

import {
    addClass,
    extractBinding,
    isIdAttribute,
    isIdValue,
    isLocalStateId,
    parseDimension,
    removeClass,
    syncMultipleWidgets,
} from './visUtils';
import { deepClone, pasteGroup, pasteSingleWidget, unsyncMultipleWidgets } from '@/Utilities/utils';

describe('addClass', () => {
    it('appends a class and keeps the order', () => {
        expect(addClass('a b', 'c')).toBe('a b c');
    });

    it('does not add a class twice', () => {
        expect(addClass('a b', 'b')).toBe('a b');
    });

    it('normalises the spacing of what was already there', () => {
        expect(addClass('  a   b  ', 'c')).toBe('a b c');
    });

    it('copes with an empty class and with nothing to add', () => {
        expect(addClass('', 'c')).toBe('c');
        expect(addClass('a', undefined)).toBe('a');
        expect(addClass('', undefined)).toBe('');
    });
});

describe('removeClass', () => {
    it('removes the class it is given', () => {
        expect(removeClass('a b c', 'b')).toBe('a c');
    });

    it('leaves the rest alone when the class is not there', () => {
        expect(removeClass('a b', 'x')).toBe('a b');
    });

    it('removes only the first of a repeated class', () => {
        // `indexOf` plus `splice` is what the function does; written down so a change to it is noticed
        expect(removeClass('a b a', 'a')).toBe('b a');
    });

    it('returns an empty class for an empty class', () => {
        expect(removeClass('', 'a')).toBe('');
    });
});

describe('parseDimension', () => {
    it('splits a length into number and unit', () => {
        expect(parseDimension('12px')).toEqual({ value: 12, dimension: 'px' });
        expect(parseDimension('50%')).toEqual({ value: 50, dimension: '%' });
        expect(parseDimension('2em')).toEqual({ value: 2, dimension: 'em' });
    });

    it('takes px as the unit when none is written', () => {
        expect(parseDimension('42')).toEqual({ value: 42, dimension: 'px' });
        expect(parseDimension(42)).toEqual({ value: 42, dimension: 'px' });
    });

    it('keeps the sign', () => {
        expect(parseDimension('-8px')).toEqual({ value: -8, dimension: 'px' });
    });

    it('falls back to zero for what is not a length', () => {
        expect(parseDimension('calc(100% - 4px)')).toEqual({ value: 0, dimension: 'px' });
        expect(parseDimension('')).toEqual({ value: 0, dimension: 'px' });
        expect(parseDimension(null)).toEqual({ value: 0, dimension: 'px' });
        expect(parseDimension(undefined)).toEqual({ value: 0, dimension: 'px' });
    });
});

describe('isLocalStateId', () => {
    it('knows a local state by its prefix', () => {
        expect(isLocalStateId('local_something')).toBe(true);
        expect(isLocalStateId('vis-2.0.control.instance')).toBe(false);
    });
});

describe('isIdAttribute', () => {
    it('takes every attribute whose name ends in oid', () => {
        expect(isIdAttribute('oid')).toBe(true);
        expect(isIdAttribute('oid1')).toBe(true);
        expect(isIdAttribute('table_oid')).toBe(true);
        expect(isIdAttribute('signals-oid-0')).toBe(true);
    });

    it('does not take an attribute that only holds text', () => {
        expect(isIdAttribute('html_prepend')).toBe(false);
        expect(isIdAttribute('ticks')).toBe(false);
    });

    it('takes a react field that says it is an id', () => {
        const info = { detailed: { name: 'detailed', type: 'id' as const } };
        expect(isIdAttribute('detailed', info)).toBe(true);
        expect(isIdAttribute('detailed1', info)).toBe(true);
    });

    it('leaves out an id field that asks not to be subscribed', () => {
        const info = { detailed: { name: 'detailed', type: 'id' as const, noSubscribe: true } };
        expect(isIdAttribute('detailed', info)).toBe(false);
    });
});

describe('isIdValue', () => {
    it('takes a value that is shaped like a state id', () => {
        expect(isIdValue('hm-rpc.0.ABC0000000.1.STATE')).toBe(true);
        expect(isIdValue('system.adapter.vis-2.0.alive')).toBe(true);
    });

    it('leaves out what only looks like one', () => {
        // fewer than three parts: a number and a path would be subscribed for nothing
        expect(isIdValue('12.5')).toBe(false);
        expect(isIdValue('img/logo.png')).toBe(false);
        expect(isIdValue('')).toBe(false);
        expect(isIdValue(42)).toBe(false);
        expect(isIdValue(null)).toBe(false);
    });

    it('leaves out the characters the js-controller refuses in an id', () => {
        expect(isIdValue('a.b.c[0]')).toBe(false);
        expect(isIdValue('a.b."c"')).toBe(false);
        expect(isIdValue('a.b.c*')).toBe(false);
    });

    it('leaves out a value that is far too long to be an id', () => {
        expect(isIdValue(`a.b.${'x'.repeat(300)}`)).toBe(false);
    });
});

describe('extractBinding', () => {
    it('finds nothing in a text without a binding', () => {
        expect(extractBinding('just text')).toBe(null);
        expect(extractBinding('')).toBe(null);
    });

    it('reads a plain binding', () => {
        const bindings = extractBinding('{hm-rpc.0.device.STATE}');
        expect(bindings).toHaveLength(1);
        expect(bindings![0].systemOid).toBe('hm-rpc.0.device.STATE');
        expect(bindings![0].visOid).toBe('hm-rpc.0.device.STATE.val');
        expect(bindings![0].token).toBe('{hm-rpc.0.device.STATE}');
    });

    it('keeps the part of the state that was asked for', () => {
        const bindings = extractBinding('{hm-rpc.0.device.STATE.ts}');
        expect(bindings![0].systemOid).toBe('hm-rpc.0.device.STATE');
        expect(bindings![0].visOid).toBe('hm-rpc.0.device.STATE.ts');
    });

    it('reads every binding of a text', () => {
        const bindings = extractBinding('{a.b.c} und {d.e.f}');
        expect(bindings).toHaveLength(2);
        expect(bindings!.map(b => b.systemOid)).toEqual(['a.b.c', 'd.e.f']);
    });

    it('reads the operations behind the semicolons', () => {
        // the argument of an operation goes in brackets, see the "Bindings" chapter of the README
        const bindings = extractBinding('{a.b.c;*(2);+(1)}');
        expect(bindings![0].systemOid).toBe('a.b.c');
        expect(bindings![0].operations?.map(operation => operation.op)).toEqual(['*', '+']);
        // the argument of an arithmetic operation arrives as a number, not as the text it was written as
        expect(bindings![0].operations?.[0].arg).toBe(2);
    });

    it('reads an operation that takes no argument', () => {
        const bindings = extractBinding('{a.b.c;round}');
        expect(bindings![0].operations?.map(operation => operation.op)).toEqual(['round']);
    });

    it('reads an operation whose argument is a path', () => {
        const bindings = extractBinding('{a.b.c;json(common.name.en)}');
        expect(bindings![0].operations?.[0].op).toBe('json');
        // a path is kept as one piece; only the operations that really take a list get one
        expect(bindings![0].operations?.[0].arg).toBe('common.name.en');
    });

    it('stops at fifty bindings in one text', () => {
        const many = Array.from({ length: 60 }, (_, index) => `{a.b.c${index}}`).join(' ');
        expect(extractBinding(many)).toHaveLength(50);
    });
});

/** A group and a single widget in the view "source", both shown in the view "target" too */
const multiViewProject = (): Project =>
    ({
        ___settings: {},
        source: {
            widgets: {
                g000001: {
                    tpl: '_tplGroup',
                    data: { members: ['w000001', 'w000002'], 'multi-views': 'target' },
                    style: {},
                },
                w000001: {
                    tpl: 'tplValueString',
                    data: { oid: 'a.b.c' },
                    style: {},
                    grouped: true,
                    groupid: 'g000001',
                },
                w000002: {
                    tpl: 'tplValueString',
                    data: { oid: 'd.e.f' },
                    style: {},
                    grouped: true,
                    groupid: 'g000001',
                },
                w000003: { tpl: 'tplHtml', data: { html: 'x', 'multi-views': 'target' }, style: {} },
            },
        },
        target: { widgets: {} },
    }) as unknown as Project;

describe('syncMultipleWidgets', () => {
    it('points the members of a copied group at the copy of the group', () => {
        const project = multiViewProject();
        syncMultipleWidgets(project);

        // the ID of a copy starts with "v", which the type of a widget ID does not allow for
        const widgets = project.target.widgets as Record<string, Widget>;
        expect(widgets.vsource_g000001.data.members).toEqual(['vsource_w000001', 'vsource_w000002']);
        // a member that points at the group of another view cannot be drawn in this one (#431)
        expect(widgets.vsource_w000001.groupid).toBe('vsource_g000001');
        expect(widgets.vsource_w000002.groupid).toBe('vsource_g000001');
    });

    it('leaves the group in its own view as it was', () => {
        const project = multiViewProject();
        syncMultipleWidgets(project);

        const widgets = project.source.widgets;
        expect(widgets.g000001.data.members).toEqual(['w000001', 'w000002']);
        expect(widgets.w000001.groupid).toBe('g000001');
        expect(Object.keys(widgets)).toEqual(['g000001', 'w000001', 'w000002', 'w000003']);
    });

    it('copies nothing into a view that does not exist or into the view of the widget itself', () => {
        const project = multiViewProject();
        project.source.widgets.w000003.data['multi-views'] = 'source,missing,';
        project.source.widgets.g000001.data['multi-views'] = '';
        syncMultipleWidgets(project);

        expect(Object.keys(project.target.widgets)).toEqual([]);
        expect(Object.keys(project.source.widgets)).toEqual(['g000001', 'w000001', 'w000002', 'w000003']);
        expect(project.missing).toBeUndefined();
    });

    it('takes the copy out of a view that was taken out of "multi-views"', () => {
        const project = multiViewProject();
        syncMultipleWidgets(project);

        // the editor syncs the project it changed, and that still holds the copies of the sync before (#417)
        project.source.widgets.w000003.data['multi-views'] = null;
        project.source.widgets.g000001.data['multi-views'] = null;
        syncMultipleWidgets(project);

        expect(Object.keys(project.target.widgets)).toEqual([]);
    });

    it('takes out the copies of a widget that was deleted', () => {
        const project = multiViewProject();
        syncMultipleWidgets(project);

        delete project.source.widgets.w000003;
        syncMultipleWidgets(project);

        expect(Object.keys(project.target.widgets).sort()).toEqual([
            'vsource_g000001',
            'vsource_w000001',
            'vsource_w000002',
        ]);
    });

    it('keeps the widgets of the view itself', () => {
        const project = multiViewProject();
        (project.target.widgets as Record<string, unknown>).w000010 = {
            tpl: 'tplHtml',
            data: { html: 'own' },
            style: {},
        };
        syncMultipleWidgets(project);
        syncMultipleWidgets(project);

        expect(project.target.widgets.w000010.data.html).toBe('own');
        expect(Object.keys(project.target.widgets)).toHaveLength(5);
    });

    it('keeps the widgets with "_" in their own ID (#744)', () => {
        const project = multiViewProject();
        const widgets = project.target.widgets as Record<string, Widget>;
        // a generated project, and the runtime puts "_" in place of every space of a widget ID
        widgets.pool_status = { tpl: 'tplHtml', data: { html: 'pool' }, style: {} } as unknown as Widget;
        widgets.vsource_w000099 = {
            tpl: 'tplHtml',
            data: { html: 'looks like a copy' },
            style: {},
        } as unknown as Widget;
        syncMultipleWidgets(project);
        syncMultipleWidgets(project);

        expect(widgets.pool_status.data.html).toBe('pool');
        expect(widgets.vsource_w000099.data.html).toBe('looks like a copy');
        expect(Object.keys(widgets)).toHaveLength(6);
    });

    it('marks every copy with the view and the widget it comes from', () => {
        const project = multiViewProject();
        syncMultipleWidgets(project);

        const widgets = project.target.widgets as Record<string, Widget>;
        expect(widgets.vsource_g000001.multiViewOrigin).toEqual({ view: 'source', wid: 'g000001' });
        expect(widgets.vsource_w000001.multiViewOrigin).toEqual({ view: 'source', wid: 'w000001' });
        expect(widgets.vsource_w000003.multiViewOrigin).toEqual({ view: 'source', wid: 'w000003' });
        // the originals stay unmarked
        expect(Object.values(project.source.widgets).some(widget => widget.multiViewOrigin)).toBe(false);
    });

    it('marks the copy of a widget whose own ID has "_" with the whole ID', () => {
        const project = multiViewProject();
        const source = project.source.widgets as Record<string, Widget>;
        source.pool_status = {
            tpl: 'tplHtml',
            data: { html: 'pool', 'multi-views': 'target' },
            style: {},
        } as unknown as Widget;
        syncMultipleWidgets(project);

        const copy = (project.target.widgets as Record<string, Widget>).vsource_pool_status;
        expect(copy.multiViewOrigin).toEqual({ view: 'source', wid: 'pool_status' });
        expect(copy.data['multi-views']).toBeUndefined();
    });
});

describe('unsyncMultipleWidgets', () => {
    it('drops the copies and keeps the widgets with "_" in their own ID (#744)', () => {
        const project = {
            ___settings: {},
            source: {
                widgets: {
                    w000001: { tpl: 'tplHtml', data: { html: 'x', 'multi-views': 'target' }, style: {} },
                    pool_status: { tpl: 'tplHtml', data: { html: 'pool' }, style: {} },
                },
            },
            target: { widgets: {} },
        } as unknown as Project;
        syncMultipleWidgets(project);
        expect(Object.keys(project.target.widgets)).toEqual(['vsource_w000001']);

        const saved = unsyncMultipleWidgets(project);
        expect(Object.keys(saved.target.widgets)).toEqual([]);
        expect(Object.keys(saved.source.widgets)).toEqual(['w000001', 'pool_status']);
        // the project that is shown keeps its copies
        expect(Object.keys(project.target.widgets)).toEqual(['vsource_w000001']);
    });

    it('keeps a widget that was pasted from a copy, as a widget of its own', () => {
        const project = multiViewProject();
        syncMultipleWidgets(project);
        const widgets = project.target.widgets as Record<string, Widget>;

        // the toolbar lists the copies too, so a copy can be selected, copied and pasted
        const single = pasteSingleWidget({ widget: deepClone(widgets.vsource_w000003), project, widgets });
        const group = pasteGroup({
            group: deepClone(widgets.vsource_g000001) as GroupWidget,
            widgets,
            groupMembers: widgets,
            project,
        });
        const members = (widgets[group] as GroupWidget).data.members;
        syncMultipleWidgets(project);

        for (const wid of [single, group, ...members]) {
            expect(widgets[wid]).toBeDefined();
            expect(widgets[wid].multiViewOrigin).toBeUndefined();
        }
        expect(Object.keys(unsyncMultipleWidgets(project).target.widgets).sort()).toEqual(
            [single, group, ...members].sort(),
        );
    });
});
