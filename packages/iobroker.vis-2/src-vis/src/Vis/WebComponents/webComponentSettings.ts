/**
 * Turns the manifest of a web component into what the palette and the attributes panel of vis-2 render from.
 *
 * Pure functions only, so the mapping can be tested without a browser. What every host needs - reading and
 * checking a manifest, the types of the settings - comes from `@iobroker/web-components`.
 */
import type { RxWidgetInfo, RxWidgetInfoAttributesField, RxWidgetInfoGroup } from '@iobroker/types-vis-2';
import {
    DECORATION_TYPES,
    getSettingsGroups,
    getSettingTypes,
    resolveManifestUrl,
    toSettingValue as toTypedValue,
    type LoadedWebComponent,
    type WebComponentManifest,
    type WebComponentSetting,
    type WebComponentSettingType,
    type WebComponentText,
} from '@iobroker/web-components';

/** The palette set all web components appear in */
export const WEB_COMPONENT_SET = 'webcomponents';

/** Icon of the set, and of a component whose manifest brings none: `</>` in a box */
export const WEB_COMPONENT_ICON = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7e57c2" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="3"/>' +
        '<path d="M9 9l-3 3 3 3M15 9l3 3-3 3M13 8l-2 8"/></svg>',
)}`;

const LANGUAGES: ioBroker.Languages[] = ['en', 'de', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'];

/**
 * Names the attributes panel of vis-2 uses itself for every widget. A setting with such a name would overwrite
 * them, so it is left out.
 */
const RESERVED_NAMES = ['name', 'comment', 'class', 'filterkey', 'multi-views', 'locked'];
const RESERVED_PREFIXES = ['visibility', 'signals-', 'lc-', 'g_'];

/** Translations for `I18n.extendTranslations`: key -> language -> text */
export type WebComponentTranslations = Record<string, Record<ioBroker.Languages, string>>;

/** Translated text in every language vis-2 knows; a missing language falls back to English */
export function toAllLanguages(text: WebComponentText): Record<ioBroker.Languages, string> {
    const result = {} as Record<ioBroker.Languages, string>;
    for (const lang of LANGUAGES) {
        result[lang] =
            typeof text === 'object' && text ? text[lang] || text.en || Object.values(text)[0] || '' : String(text);
    }
    return result;
}

/** The widget type (`tpl`) under which a web component is stored in a project */
export function getWebComponentWidgetType(tag: string): string {
    return `tplWc_${tag}`;
}

/** Whether vis-2 itself uses a widget attribute of this name */
export function isReservedSettingName(name: string): boolean {
    return RESERVED_NAMES.includes(name) || RESERVED_PREFIXES.some(prefix => name.startsWith(prefix));
}

/**
 * The settings that carry a value - what the element gets in `settings` - with their types; without those whose
 * name vis-2 uses itself
 *
 * @param manifest the manifest of the component
 */
export function getWebComponentSettingTypes(manifest: WebComponentManifest): Record<string, WebComponentSettingType> {
    const types = getSettingTypes(manifest);
    for (const name of Object.keys(types)) {
        if (isReservedSettingName(name)) {
            delete types[name];
        }
    }
    return types;
}

/**
 * The value of a setting in the type the manifest promises
 *
 * vis-2 keeps what is typed into a field, and what a binding delivers, as text. The component gets the type its
 * manifest declares instead, so it never has to guess.
 *
 * @param type type of the setting
 * @param value the value as vis-2 holds it
 */
export function toSettingValue(type: WebComponentSettingType, value: unknown): string | number | boolean | undefined {
    // a new widget gets this in its object fields, see Editor.addWidget()
    if (type === 'objectId' && value === 'nothing_selected') {
        return '';
    }
    return toTypedValue(type, value);
}

/**
 * One field of the attributes panel for one setting
 *
 * @param name name of the setting
 * @param setting the setting as the manifest describes it
 * @param keyPrefix prefix of the translation keys of this component
 * @param translations collects the texts the field refers to
 */
function toField(
    name: string,
    setting: WebComponentSetting,
    keyPrefix: string,
    translations: WebComponentTranslations,
): RxWidgetInfoAttributesField | null {
    const translate = (text: WebComponentText | undefined, suffix: string): string | undefined => {
        if (text === undefined || text === '') {
            return undefined;
        }
        const key = `${keyPrefix}_${suffix}`;
        translations[key] = toAllLanguages(text);
        return key;
    };

    const common = {
        name,
        label: translate(setting.label, name),
        tooltip: translate(setting.help, `${name}_help`),
        default: setting.default,
        hidden: setting.hidden,
        disabled: setting.disabled,
    };

    switch (setting.type) {
        case 'header':
        case 'staticText': {
            const text = translate(setting.text ?? setting.label, `${name}_text`);
            return text
                ? {
                      name,
                      type: 'help',
                      text,
                      hidden: setting.hidden,
                      style: setting.type === 'header' ? { fontWeight: 'bold' } : undefined,
                  }
                : null;
        }
        case 'divider':
            return { name, type: 'delimiter', hidden: setting.hidden };
        case 'text':
            return { ...common, type: 'text', multiline: (setting.minRows || 1) > 1 } as RxWidgetInfoAttributesField;
        case 'password':
            return { ...common, type: 'password' } as RxWidgetInfoAttributesField;
        case 'number':
        case 'slider':
            return {
                ...common,
                type: setting.type,
                min: setting.min,
                max: setting.max,
                step: setting.step,
            } as RxWidgetInfoAttributesField;
        case 'checkbox':
            return { ...common, type: 'checkbox' } as RxWidgetInfoAttributesField;
        case 'color':
            return { ...common, type: 'color' } as RxWidgetInfoAttributesField;
        case 'objectId':
            // `root` has no counterpart in the object browser of vis-2: it only narrows the choice
            return {
                ...common,
                type: 'id',
                filter: setting.types ? { type: setting.types } : undefined,
            } as RxWidgetInfoAttributesField;
        case 'instance':
            return { ...common, type: 'instance', adapter: setting.adapter } as RxWidgetInfoAttributesField;
        case 'select':
            return {
                ...common,
                type: 'select',
                options: (setting.options || []).map(option => ({
                    value: String(option.value),
                    label: translate(option.label, `${name}_${String(option.value)}`) || String(option.value),
                })),
            } as RxWidgetInfoAttributesField;
        default:
            // a type this host cannot show yet: the value can at least be typed in
            console.warn(`Web component setting "${name}" has the unknown type "${(setting as any)?.type}"`);
            return { ...common, type: 'text' } as RxWidgetInfoAttributesField;
    }
}

/**
 * The widget info of a web component and the texts it refers to
 *
 * @param component the loaded component
 */
export function manifestToWidgetInfo(component: LoadedWebComponent): {
    info: RxWidgetInfo;
    translations: WebComponentTranslations;
} {
    const { manifest } = component;
    const keyPrefix = `wc_${manifest.tag}`;
    const translations: WebComponentTranslations = {
        wc_set_label: toAllLanguages({ en: 'Web components', de: 'Web-Komponenten' }),
        [`${keyPrefix}_name`]: toAllLanguages(manifest.name),
    };

    const visAttrs: RxWidgetInfoGroup[] = getSettingsGroups(manifest).map(({ name, label, panel }) => {
        const fields: RxWidgetInfoAttributesField[] = [];
        for (const [fieldName, setting] of Object.entries(panel.items || {})) {
            if (!setting || typeof setting !== 'object') {
                continue;
            }
            if (!DECORATION_TYPES.includes(setting.type) && isReservedSettingName(fieldName)) {
                console.warn(`Web component <${manifest.tag}>: the setting "${fieldName}" is reserved by vis-2`);
                continue;
            }
            const field = toField(fieldName, setting, keyPrefix, translations);
            if (field) {
                fields.push(field);
            }
        }
        let groupLabel: string | undefined;
        if (label) {
            groupLabel = `${keyPrefix}_group_${name}`;
            translations[groupLabel] = toAllLanguages(label);
        }
        return { name, label: groupLabel, fields };
    });

    let visHelp: string | undefined;
    if (manifest.description) {
        visHelp = `${keyPrefix}_description`;
        translations[visHelp] = toAllLanguages(manifest.description);
    }

    const info = {
        id: getWebComponentWidgetType(manifest.tag),
        visSet: WEB_COMPONENT_SET,
        visSetLabel: 'wc_set_label',
        visSetColor: '#7e57c2',
        visSetIcon: WEB_COMPONENT_ICON,
        visName: typeof manifest.name === 'string' ? manifest.name : manifest.name.en,
        visWidgetLabel: `${keyPrefix}_name`,
        visHelp,
        visPrev: resolveManifestUrl(manifest.icon, component.url) || WEB_COMPONENT_ICON,
        visAttrs,
        visDefaultStyle: {
            width: manifest.size?.width || 200,
            height: manifest.size?.height || 120,
        },
        // a component that works in its own size only
        visResizable: manifest.size?.noResize ? false : undefined,
    } as RxWidgetInfo;

    return { info, translations };
}
