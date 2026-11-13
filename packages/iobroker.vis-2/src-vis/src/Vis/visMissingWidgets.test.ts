import { describe, expect, it } from 'vitest';

import type { Project } from '@iobroker/types-vis-2';

import { adapterCandidates, findMissingWidgetSets, findWidgetAdapter, missingKey } from './visMissingWidgets';

const project = {
    ___settings: {},
    Home: {
        settings: {},
        widgets: {
            w000001: { tpl: 'tplMaterial2Switches', widgetSet: 'vis-2-widgets-material', data: {}, style: {} },
            w000002: { tpl: 'tplMaterial2Thermostat', widgetSet: 'vis-2-widgets-material', data: {}, style: {} },
            w000003: { tpl: 'tplValueFloat', widgetSet: 'basic', data: {}, style: {} },
            g000001: { tpl: '_tplGroup', widgetSet: null, data: {}, style: {} },
        },
    },
    Kitchen: {
        settings: {},
        widgets: {
            w000004: { tpl: 'tplMaterial2Switches', widgetSet: 'vis-2-widgets-material', data: {}, style: {} },
            w000005: { tpl: 'tplHqButton', widgetSet: 'hqwidgets', data: {}, style: {} },
            w000006: { tpl: 'tplSomething', widgetSet: null, data: {}, style: {} },
        },
    },
} as unknown as Project;

const known = (tpl: string): boolean => tpl === 'tplValueFloat';

describe('findMissingWidgetSets', () => {
    it('gathers the widgets nothing can draw by their set, the biggest set first', () => {
        const missing = findMissingWidgetSets(project, known);
        expect(missing.map(one => [one.set, one.count])).toEqual([
            ['vis-2-widgets-material', 3],
            ['hqwidgets', 1],
            ['', 1],
        ]);
        expect(missing[0].views).toEqual(['Home', 'Kitchen']);
        expect(missing[0].types).toEqual(['tplMaterial2Switches', 'tplMaterial2Thermostat']);
    });

    it('finds nothing where everything is known, and never a group', () => {
        expect(findMissingWidgetSets(project, () => true)).toEqual([]);
        expect(findMissingWidgetSets(null, known)).toEqual([]);
    });
});

describe('adapterCandidates', () => {
    it('tries the set itself, then with the prefixes of vis-2 and vis', () => {
        expect(adapterCandidates('hqwidgets')).toEqual(['hqwidgets', 'vis-2-widgets-hqwidgets', 'vis-hqwidgets']);
        expect(adapterCandidates('vis-2-widgets-material')).toEqual([
            'vis-2-widgets-material',
            'vis-2-widgets-vis-2-widgets-material',
            'vis-vis-2-widgets-material',
        ]);
        expect(adapterCandidates('iobroker.vis-jqui-mfd')[0]).toBe('vis-jqui-mfd');
    });

    it('offers nothing for a set without a name or with one no adapter can have', () => {
        expect(adapterCandidates('')).toEqual([]);
        expect(adapterCandidates('rm -rf; x')).toEqual([]);
    });
});

describe('findWidgetAdapter', () => {
    it('takes the first candidate the repository knows', () => {
        expect(findWidgetAdapter('hqwidgets', { 'vis-hqwidgets': {} })).toBe('vis-hqwidgets');
        expect(findWidgetAdapter('vis-2-widgets-material', { 'vis-2-widgets-material': {} })).toBe(
            'vis-2-widgets-material',
        );
        expect(findWidgetAdapter('unknown', { 'vis-hqwidgets': {} })).toBe(null);
    });

    it('takes only a name that is one of an adapter of widgets without a repository', () => {
        expect(findWidgetAdapter('vis-2-widgets-material', null)).toBe('vis-2-widgets-material');
        expect(findWidgetAdapter('hqwidgets', null)).toBe(null);
    });
});

describe('missingKey', () => {
    it('does not depend on the order', () => {
        expect(missingKey(['b', 'a'])).toBe(missingKey(['a', 'b']));
    });
});
