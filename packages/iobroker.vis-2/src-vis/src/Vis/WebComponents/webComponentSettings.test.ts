import { describe, expect, it, vi } from 'vitest';

import type { LoadedWebComponent, WebComponentManifest } from '@iobroker/web-components';

import {
    getWebComponentSettingTypes,
    getWebComponentWidgetType,
    isWebComponentType,
    manifestToWidgetInfo,
    toAllLanguages,
    toSettingValue,
    WEB_COMPONENT_ICON,
    WEB_COMPONENT_SET,
} from './webComponentSettings';

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
            oid: {
                type: 'objectId',
                label: { en: 'State', de: 'Datenpunkt' },
                types: 'config',
                root: 'demo.0.diagrams',
            },
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
    url: 'http://host:8082/adapter/demo/webcomponents/tile.json',
    moduleUrl: 'http://host:8082/adapter/demo/webcomponents/tile.js',
    adapter: 'demo',
    version: '1.0.0',
};

describe('manifestToWidgetInfo', () => {
    const { info, translations } = manifestToWidgetInfo(COMPONENT);
    const fields = info.visAttrs[0].fields as any[];

    it('makes one widget type of the component in the set of its adapter', () => {
        expect(info.id).toBe(getWebComponentWidgetType('iob-test-tile'));
        expect(isWebComponentType(info.id)).toBe(true);
        expect(isWebComponentType('tplMaterial2Switches')).toBe(false);
        expect(info.visSet).toBe('demo');
        expect(info.visDefaultStyle).toEqual({ width: 180, height: 110 });
        // without the title of the adapter, its name labels the set
        expect(translations[info.visSetLabel!].de).toBe('demo');
        expect(info.visSetIcon).toBe(WEB_COMPONENT_ICON);
    });

    it('labels the set of the adapter with its title and its icon', () => {
        const withAdapter = manifestToWidgetInfo(COMPONENT, {
            title: { en: 'Demo adapter', de: 'Demo-Adapter' },
            icon: 'http://host:8082/adapter/demo/demo.svg',
        });
        expect(withAdapter.info.visSet).toBe('demo');
        expect(withAdapter.translations[withAdapter.info.visSetLabel!].de).toBe('Demo-Adapter');
        expect(withAdapter.translations[withAdapter.info.visSetLabel!].fr).toBe('Demo adapter');
        expect(withAdapter.info.visSetIcon).toBe('http://host:8082/adapter/demo/demo.svg');
    });

    it('puts a component of no adapter into the set of the web components', () => {
        const demo = manifestToWidgetInfo({ ...COMPONENT, adapter: '', version: '' });
        expect(demo.info.visSet).toBe(WEB_COMPONENT_SET);
        expect(demo.translations[demo.info.visSetLabel!].de).toBe('Web-Komponenten');
        expect(demo.info.visSetIcon).toBe(WEB_COMPONENT_ICON);
    });

    it('lets nobody resize a component that works in its own size only', () => {
        expect(info.visResizable).toBeUndefined();
        const fixed = manifestToWidgetInfo({
            ...COMPONENT,
            manifest: { ...MANIFEST, size: { width: 180, height: 110, noResize: true } },
        }).info;
        expect(fixed.visResizable).toBe(false);
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
        // the types and the root of objectId narrow the choice of the object browser
        expect(fields[1].filter).toEqual({ type: 'config' });
        expect(fields[1].root).toBe('demo.0.diagrams');
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

describe('toAllLanguages', () => {
    it('fills every language', () => {
        const texts = toAllLanguages({ en: 'On', de: 'An' });
        expect(Object.keys(texts)).toHaveLength(11);
        expect(texts['zh-cn']).toBe('On');
    });
});
