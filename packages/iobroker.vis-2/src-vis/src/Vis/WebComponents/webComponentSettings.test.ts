import { describe, expect, it, vi } from 'vitest';

import {
    checkWebComponentManifest,
    getWebComponentSettingTypes,
    getWebComponentWidgetType,
    manifestToWidgetInfo,
    toAllLanguages,
    toSettingValue,
    WEB_COMPONENT_SET,
} from './webComponentSettings';
import { getWebComponentSources } from './webComponentSources';
import type { LoadedWebComponent, WebComponentManifest } from './webComponentTypes';

const MANIFEST: WebComponentManifest = {
    manifestVersion: 1,
    tag: 'iob-test-tile',
    name: { en: 'Test tile', de: 'Testkachel' },
    icon: 'tile.svg',
    size: { width: 180, height: 110 },
    settings: {
        type: 'panel',
        items: {
            _header: { type: 'header', text: { en: 'State', de: 'Datenpunkt' } },
            oid: { type: 'objectId', label: { en: 'State', de: 'Datenpunkt' } },
            decimals: { type: 'number', label: 'Decimals', min: 0, max: 6, default: 1 },
            _line: { type: 'divider' },
            variant: {
                type: 'select',
                label: 'Layout',
                options: [
                    { value: 'tile', label: { en: 'Tile', de: 'Kachel' } },
                    { value: 'compact', label: 'One row' },
                ],
                default: 'tile',
            },
            toggle: { type: 'checkbox', label: 'Toggle', default: true },
            textTrue: { type: 'text', label: 'Text for true', hidden: '!data.toggle' },
        },
    },
};

const COMPONENT: LoadedWebComponent = {
    manifest: MANIFEST,
    url: 'http://host:8082/adapter/demo/webcomponents/tile.js',
    adapter: 'demo',
    version: '1.0.0',
};

describe('manifestToWidgetInfo', () => {
    const { info, translations } = manifestToWidgetInfo(COMPONENT);
    const fields = info.visAttrs[0].fields as any[];

    it('makes one widget type of the component in the set of the web components', () => {
        expect(info.id).toBe(getWebComponentWidgetType('iob-test-tile'));
        expect(info.visSet).toBe(WEB_COMPONENT_SET);
        expect(info.visDefaultStyle).toEqual({ width: 180, height: 110 });
    });

    it('resolves the icon against the module', () => {
        expect(info.visPrev).toBe('http://host:8082/adapter/demo/webcomponents/tile.svg');
    });

    it('maps the JSON-Config types onto the fields of vis-2', () => {
        expect(fields.map(field => [field.name, field.type])).toEqual([
            ['_header', 'help'],
            ['oid', 'id'],
            ['decimals', 'number'],
            ['_line', 'delimiter'],
            ['variant', 'select'],
            ['toggle', 'checkbox'],
            ['textTrue', 'text'],
        ]);
        expect(fields[2]).toMatchObject({ min: 0, max: 6, default: 1 });
        // the expression is over the values of the settings, which vis-2 calls `data` as well
        expect(fields[6].hidden).toBe('!data.toggle');
    });

    it('refers to translation keys and brings the texts in every language', () => {
        const oid = fields[1];
        expect(translations[oid.label].de).toBe('Datenpunkt');
        // a language the manifest does not have falls back to English
        expect(translations[oid.label].fr).toBe('State');
        // a plain string is the text in every language
        expect(translations[fields[2].label].de).toBe('Decimals');
        expect(fields[4].options).toEqual([
            { value: 'tile', label: expect.any(String) },
            { value: 'compact', label: expect.any(String) },
        ]);
        expect(translations[fields[4].options[0].label].de).toBe('Kachel');
    });

    it('leaves out a setting whose name vis-2 uses itself', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { info: reservedInfo } = manifestToWidgetInfo({
            ...COMPONENT,
            manifest: {
                ...MANIFEST,
                settings: { type: 'panel', items: { name: { type: 'text' }, 'signals-count': { type: 'text' } } },
            },
        });
        expect(reservedInfo.visAttrs[0].fields).toEqual([]);
        expect(warn).toHaveBeenCalledTimes(2);
    });

    it('makes a group of each tab', () => {
        const { info: tabsInfo, translations: tabsTranslations } = manifestToWidgetInfo({
            ...COMPONENT,
            manifest: {
                ...MANIFEST,
                settings: {
                    type: 'tabs',
                    items: {
                        main: { type: 'panel', label: { en: 'Main', de: 'Haupt' }, items: { a: { type: 'text' } } },
                        look: { type: 'panel', items: { b: { type: 'color' } } },
                    },
                },
            },
        });
        expect(tabsInfo.visAttrs.map(group => group.name)).toEqual(['main', 'look']);
        expect(tabsTranslations[tabsInfo.visAttrs[0].label!].de).toBe('Haupt');
        expect(tabsInfo.visAttrs[1].label).toBeUndefined();
    });
});

describe('getWebComponentSettingTypes', () => {
    it('lists the settings that carry a value, without headers and dividers', () => {
        expect(getWebComponentSettingTypes(MANIFEST)).toEqual({
            oid: 'objectId',
            decimals: 'number',
            variant: 'select',
            toggle: 'checkbox',
            textTrue: 'text',
        });
    });
});

describe('toSettingValue', () => {
    it('gives the component the type its manifest declares', () => {
        expect(toSettingValue('number', '2')).toBe(2);
        expect(toSettingValue('number', '2,5')).toBe(2.5);
        expect(toSettingValue('number', '')).toBeUndefined();
        expect(toSettingValue('number', 'abc')).toBeUndefined();
        expect(toSettingValue('checkbox', 'true')).toBe(true);
        expect(toSettingValue('checkbox', false)).toBe(false);
        expect(toSettingValue('checkbox', 'false')).toBe(false);
        expect(toSettingValue('text', 5)).toBe('5');
        expect(toSettingValue('text', undefined)).toBeUndefined();
    });

    it('hands no placeholder of a new widget over as an object ID', () => {
        expect(toSettingValue('objectId', 'nothing_selected')).toBe('');
        expect(toSettingValue('objectId', '0_userdata.0.lamp')).toBe('0_userdata.0.lamp');
    });
});

describe('checkWebComponentManifest', () => {
    it('accepts a valid manifest', () => {
        expect(checkWebComponentManifest(MANIFEST)).toBeNull();
    });

    it('names what is wrong', () => {
        expect(checkWebComponentManifest(undefined)).toMatch(/no manifest/);
        expect(checkWebComponentManifest({ ...MANIFEST, manifestVersion: 2 })).toMatch(/manifestVersion/);
        expect(checkWebComponentManifest({ ...MANIFEST, tag: 'tile' })).toMatch(/custom element/);
        expect(checkWebComponentManifest({ ...MANIFEST, tag: 'Iob-Tile' })).toMatch(/custom element/);
        expect(checkWebComponentManifest({ ...MANIFEST, settings: { type: 'table' } })).toMatch(/JSON-Config/);
    });
});

describe('toAllLanguages', () => {
    it('fills every language', () => {
        const texts = toAllLanguages({ en: 'On', de: 'An' });
        expect(Object.keys(texts)).toHaveLength(11);
        expect(texts['zh-cn']).toBe('On');
    });
});

describe('getWebComponentSources', () => {
    const instance = (id: string, webComponents?: unknown): ioBroker.InstanceObject =>
        ({ _id: id, type: 'instance', common: { version: '1.2.3', webComponents } }) as any;

    it('resolves the modules against the admin folder of the adapter', () => {
        expect(
            getWebComponentSources(
                [
                    instance('system.adapter.demo.0', ['webcomponents/tile.js', 'https://cdn.example/x.js']),
                    instance('system.adapter.other.0'),
                ],
                'http://host:8082/vis-2/index.html',
            ),
        ).toEqual([
            { url: 'http://host:8082/adapter/demo/webcomponents/tile.js', adapter: 'demo', version: '1.2.3' },
            { url: 'https://cdn.example/x.js', adapter: 'demo', version: '1.2.3' },
        ]);
    });

    it('lists a module of several instances of one adapter once', () => {
        expect(
            getWebComponentSources(
                [instance('system.adapter.demo.0', ['tile.js']), instance('system.adapter.demo.1', ['tile.js'])],
                'http://localhost:3000/edit.html',
            ),
        ).toEqual([{ url: 'http://localhost:3000/adapter/demo/tile.js', adapter: 'demo', version: '1.2.3' }]);
    });
});
