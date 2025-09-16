/**
 *  ioBroker.vis
 *  https://github.com/ioBroker/ioBroker.vis
 *
 *  Copyright (c) 2024-2025 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */
import { I18n, type LegacyConnection } from '@iobroker/adapter-react-v5';
import type { VisRxWidgetState } from '@/Vis/visRxWidget';
// eslint-disable-next-line no-duplicate-imports
import type VisRxWidget from '@/Vis/visRxWidget';
import type { AdditionalIconSet, Branded } from '@iobroker/types-vis-2';
import { registerRemotes, loadRemote, init } from '@module-federation/runtime';

export type WidgetSetName = Branded<string, 'WidgetSetName'>;
export type PromiseName = `_promise_${WidgetSetName}`;

export interface VisRxWidgetWithInfo<
    TRxData extends Record<string, any>,
    TState extends Partial<VisRxWidgetState> = VisRxWidgetState,
> extends VisRxWidget<TRxData, TState> {
    // Widget set name
    adapter: string;
    // Widget set version
    version: string;
    url: string;
    i18nPrefix?: string;
    // Widget set icon
    setIcon: string;
}

interface WidgetSetStruct {
    __initialized: boolean;
    get: (module: string) => Promise<() => { default: VisRxWidgetWithInfo<any> }>;
    init?: (shareScope: string) => Promise<void>;
}

interface VisIconSet {
    name?: ioBroker.StringOrTranslated;
    url: string;
    /** If set, this is not a widget set, but icon set. url, name and icon are required */
    icon?: string; // base 64 string for iconSet (not used for widgetSets)
    /** The vis icon set does not support the listed major versions of vis */
    ignoreInVersions?: number[];
}

declare global {
    interface Window {
        [promiseName: PromiseName]: Promise<any>;
        [widgetSetName: WidgetSetName]: WidgetSetStruct;
    }
}

function registerWidgetsLoadIndicator(cb: (process: number, max: number) => void): void {
    window.__widgetsLoadIndicator = cb;
}

interface VisLoadComponentContext {
    visWidgetsCollection: ioBroker.VisWidget;
    countRef: { count: number; max: number };
    dynamicWidgetInstance: ioBroker.InstanceObject;
    i18nPrefix: string;
    // List of custom React components
    result: VisRxWidgetWithInfo<any>[];
}

init({
    name: 'iobroker_vis',
    remotes: [],
});

function _loadComponentHelper(context: VisLoadComponentContext): Promise<void[]> {
    // expected in context
    // visWidgetsCollection
    // countRef
    // dynamicWidgetInstance
    // i18nPrefix
    // result
    const promises: Promise<void>[] = [];

    for (let i = 0; i < context.visWidgetsCollection.components.length; i++) {
        ((index: number, _visWidgetsCollection) => {
            context.countRef.max++;

            const promise: Promise<void> = loadRemote<any>(
                `${context.visWidgetsCollection.name}/${_visWidgetsCollection.components[index]}`,
            )
                .then(CustomComponent => {
                    if (CustomComponent) {
                        context.countRef.count++;

                        if (CustomComponent.default) {
                            CustomComponent.default.adapter = context.dynamicWidgetInstance._id
                                .substring('system.adapter.'.length)
                                .replace(/\.\d*$/, '');
                            CustomComponent.default.version = context.dynamicWidgetInstance.common.version;
                            CustomComponent.default.setIcon = context.dynamicWidgetInstance.common.icon;
                            CustomComponent.default.url = _visWidgetsCollection.url;
                            if (context.i18nPrefix) {
                                CustomComponent.default.i18nPrefix = context.i18nPrefix;
                            }
                            context.result.push(CustomComponent.default);
                        } else {
                            console.error(`Cannot load widget ${context.dynamicWidgetInstance._id}. No default found`);
                        }
                        window.__widgetsLoadIndicator?.(context.countRef.count, context.countRef.max);
                    }
                })
                .catch((e: any) => {
                    console.error(`Cannot load widget ${context.dynamicWidgetInstance._id}: ${e.toString()}`);
                    console.error(`Cannot load widget ${context.dynamicWidgetInstance._id}: ${JSON.stringify(e)}`);
                });

            promises.push(promise);
        })(i, context.visWidgetsCollection);
    }

    return Promise.all(promises);
}

function getText(text: string | ioBroker.StringOrTranslated): string {
    if (typeof text === 'object') {
        return text[I18n.getLanguage()] || text.en || '';
    }
    return (text || '').toString();
}

const cloudVersions: Record<string, undefined | 'module'> = {
    echarts: undefined,
    eventlist: undefined,
    fullcalendar: undefined,
    openweathermap: undefined,
    scenes: undefined,
    scheduler: 'module',
    'vis-2-widgets-energy': undefined,
    'vis-2-widgets-gauges': 'module',
    'vis-2-widgets-jaeger-design': 'module',
    'vis-2-widgets-material': undefined,
};
/**
 * We have a problem, that cloud have specific versions of widgets, and they must be loaded sometimes as bundlerType no matter what has the user
 */
function fixCloudBundlerType(adapterName: string, visWidgetsCollection: ioBroker.VisWidget): void {
    if (window.location.hostname.includes('iobroker.')) {
        // fix possible wrong bundlerType
        if (adapterName in cloudVersions) {
            //@ts-expect-error implemented in js-controller objects
            visWidgetsCollection.bundlerType = cloudVersions[adapterName];
        }
    }
}

/**
 * Load all remote widgets from instances
 *
 * !Do not make this funktion async because it is optimized to simultaneously load the widget sets
 *
 * @param socket Socket connection
 * @param onlyWidgetSets If array of names, load only these widget sets
 */
function getRemoteWidgets(
    socket: LegacyConnection,
    onlyWidgetSets?: false | string[],
): Promise<
    | undefined
    | {
          widgetSets: VisRxWidgetWithInfo<any>[];
          additionalSets: AdditionalIconSet;
      }
> {
    let getObjectViewSystem: typeof socket.getObjectViewSystem = socket.getObjectViewSystem.bind(socket);
    // @ts-expect-error implemented in socket-client
    if (socket.getObjectViewSystemCached) {
        // @ts-expect-error implemented in socket-client
        getObjectViewSystem = socket.getObjectViewSystemCached.bind(socket);
    }

    return getObjectViewSystem('instance', 'system.adapter.', 'system.adapter.\u9999')
        .then(objects => {
            const result: VisRxWidgetWithInfo<any>[] = [];
            const additionalSets: AdditionalIconSet = {};
            const countRef = { count: 0, max: 0 };
            const instances: ioBroker.InstanceObject[] = Object.values(
                objects as Record<string, ioBroker.InstanceObject>,
            );
            const dynamicWidgetInstances: ioBroker.InstanceObject[] = instances.filter(obj => {
                // @ts-expect-error defined in js-controller@7.0.8
                if (!obj.common.visWidgets && !obj.common.visIconSets) {
                    return false;
                }
                if (obj.common.visWidgets) {
                    // @ts-expect-error deprecated, but we still check it
                    const ignoreVersions: number[] = obj.common.visWidgets.ignoreInVersions || [];
                    return (
                        !ignoreVersions.includes(2) &&
                        (!onlyWidgetSets || onlyWidgetSets.includes(getText(obj.common.name)))
                    );
                }
                // It is only icon set, and they must not be loaded in runtime
                return !onlyWidgetSets;
            });

            const promises: Promise<void[] | void | null>[] = [];
            for (let i = 0; i < dynamicWidgetInstances.length; i++) {
                const dynamicWidgetInstance = dynamicWidgetInstances[i];
                for (const widgetSetName in dynamicWidgetInstance.common.visWidgets) {
                    // deprecated
                    if (widgetSetName === 'i18n') {
                        // ignore
                        // find first widget set that is not i18n
                        const _widgetSetName = Object.keys(dynamicWidgetInstance.common.visWidgets).find(
                            name => name !== 'i18n',
                        );
                        console.warn(
                            `common.visWidgets.i18n is deprecated. Use common.visWidgets.${_widgetSetName}.i18n instead.`,
                        );
                    } else {
                        const visWidgetsCollection: ioBroker.VisWidget =
                            dynamicWidgetInstance.common.visWidgets[widgetSetName];

                        if (
                            Array.isArray(visWidgetsCollection.ignoreInVersions) &&
                            visWidgetsCollection.ignoreInVersions.includes(2)
                        ) {
                            continue;
                        }

                        if (!visWidgetsCollection.url?.startsWith('http')) {
                            visWidgetsCollection.url = `./vis-2/widgets/${visWidgetsCollection.url}`;
                        }

                        fixCloudBundlerType(dynamicWidgetInstance.common.name, visWidgetsCollection);

                        registerRemotes(
                            [
                                {
                                    name: visWidgetsCollection.name,
                                    entry: visWidgetsCollection.url,
                                    //@ts-expect-error implemented in js-controller objects
                                    type: visWidgetsCollection.bundlerType || undefined,
                                },
                            ],
                            // force: true // may be needed to side-load remotes after the fact.
                        );
                        if (visWidgetsCollection.components) {
                            ((collection, instance) => {
                                try {
                                    let i18nPrefix = '';
                                    let i18nPromiseWait: Promise<void | null> | undefined;

                                    // 1. Load language file ------------------
                                    // instance.common.visWidgets.i18n is deprecated
                                    if (collection.url && collection.i18n === true) {
                                        // load i18n from files
                                        const pos = collection.url.lastIndexOf('/');
                                        let i18nURL: string;
                                        if (pos !== -1) {
                                            i18nURL = collection.url.substring(0, pos);
                                        } else {
                                            i18nURL = collection.url;
                                        }
                                        const lang = I18n.getLanguage();

                                        i18nPromiseWait = fetch(`${i18nURL}/i18n/${lang}.json`)
                                            .then(data => data.json())
                                            .then(json => {
                                                countRef.count++;
                                                I18n.extendTranslations(json, lang);
                                                window.__widgetsLoadIndicator?.(countRef.count, promises.length);
                                            })
                                            .catch(error => {
                                                if (lang !== 'en') {
                                                    // try to load English
                                                    return fetch(`${i18nURL}/i18n/en.json`)
                                                        .then(data => data.json())
                                                        .then(json => {
                                                            countRef.count++;
                                                            I18n.extendTranslations(json, lang);
                                                            window.__widgetsLoadIndicator?.(
                                                                countRef.count,
                                                                promises.length,
                                                            );
                                                        })
                                                        .catch(_error =>
                                                            console.log(
                                                                `Cannot load i18n "${i18nURL}/i18n/${lang}.json": ${_error}`,
                                                            ),
                                                        );
                                                }
                                                console.log(
                                                    `Cannot load i18n "${i18nURL}/i18n/${lang}.json": ${error}`,
                                                );
                                                return null;
                                            });
                                        promises.push(i18nPromiseWait);
                                    } else if (collection.url && collection.i18n === 'component') {
                                        // instance.common.visWidgets.i18n is deprecated
                                        i18nPromiseWait = loadRemote<any>(
                                            `${collection.name as WidgetSetName}/translations`,
                                        )
                                            .then((translations: any) => {
                                                countRef.count++;

                                                // add automatic prefix to all translations
                                                if (translations.default.prefix === true) {
                                                    translations.default.prefix = `${instance.common.name}_`;
                                                }
                                                i18nPrefix = translations.default.prefix;

                                                I18n.extendTranslations(translations.default);
                                                window.__widgetsLoadIndicator?.(countRef.count, promises.length);
                                            })
                                            .catch((error: string) =>
                                                console.log(`Cannot load i18n "${collection.name}": ${error}`),
                                            );
                                    } else if (collection.i18n && typeof collection.i18n === 'object') {
                                        try {
                                            I18n.extendTranslations(collection.i18n);
                                        } catch (error) {
                                            console.error(`Cannot import i18n: ${error}`);
                                        }
                                    }

                                    // 2. Load all components ------------------
                                    if (collection.components) {
                                        if (i18nPromiseWait instanceof Promise) {
                                            // we must wait for it as the flag i18nPrefix will be used in the component
                                            promises.push(
                                                i18nPromiseWait.then(() =>
                                                    _loadComponentHelper({
                                                        visWidgetsCollection: collection,
                                                        countRef,
                                                        dynamicWidgetInstance: instance,
                                                        i18nPrefix,
                                                        result,
                                                    }),
                                                ),
                                            );
                                        } else {
                                            // do not wait for languages
                                            promises.push(
                                                _loadComponentHelper({
                                                    visWidgetsCollection: collection,
                                                    countRef,
                                                    dynamicWidgetInstance: instance,
                                                    i18nPrefix,
                                                    result,
                                                }),
                                            );
                                        }
                                    } else if (i18nPromiseWait instanceof Promise) {
                                        promises.push(i18nPromiseWait);
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            })(visWidgetsCollection, dynamicWidgetInstance);
                        }
                    }
                }
                if (!onlyWidgetSets) {
                    // @ts-expect-error defined in js-controller@7.0.8
                    const visIconSets: { [name: string]: VisIconSet } = dynamicWidgetInstance.common.visIconSets || {};

                    for (const iconSetName in visIconSets) {
                        const visIconSetCollection = visIconSets[iconSetName];

                        if (
                            Array.isArray(visIconSetCollection.ignoreInVersions) &&
                            visIconSetCollection.ignoreInVersions.includes(2)
                        ) {
                            continue;
                        }
                        if (!visIconSetCollection.url) {
                            console.warn(
                                `Icon set "${iconSetName}" of ${dynamicWidgetInstance._id} ignored: url missing`,
                            );
                            continue;
                        }

                        if (
                            !visIconSetCollection.url.startsWith('http://') &&
                            !visIconSetCollection.url.startsWith('https://') &&
                            !visIconSetCollection.url.startsWith('file://')
                        ) {
                            visIconSetCollection.url = `widgets/${visIconSetCollection.url}`;
                        }

                        // Collect icon sets only if editor
                        additionalSets[iconSetName] = {
                            name: visIconSetCollection.name,
                            url: visIconSetCollection.url,
                            icon: visIconSetCollection.icon,
                        };
                    }
                }
            }

            return Promise.all(promises).then(() => ({
                widgetSets: result,
                additionalSets,
            }));
        })
        .catch((e: unknown): undefined => {
            console.error('Cannot read instances', e);
            return undefined;
        });
}

export { getRemoteWidgets, registerWidgetsLoadIndicator };
