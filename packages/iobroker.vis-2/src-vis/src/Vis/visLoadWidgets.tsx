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
import type { ComponentType } from 'react';
import { I18n, type Connection } from '@iobroker/gui-components';
import type { VisRxWidgetState } from '@/Vis/visRxWidget';
import type VisRxWidget from '@/Vis/visRxWidget';
import type { AdditionalIconSet, Branded, VisServiceProps } from '@iobroker/types-vis-2';
import { registerRemotes, loadRemote, init } from '@module-federation/runtime';
import {
    checkWidgetSetCompatibility,
    getIncompatibilityText,
    getWidgetSetManifest,
    type IncompatibleWidgetSet,
} from './visWidgetSetCompatibility';
import { getRemoteEntryUrl, preloadModule, preloadWidgetSet } from './visPreloadWidgetSet';
import { getCollectionSetNames, isCollectionUsed } from './visWidgetSetNames';

export type WidgetSetName = Branded<string, 'WidgetSetName'>;
export type PromiseName = `_promise_${WidgetSetName}`;

/**
 * Prefix a widget set's url gets for `registerRemotes`, which resolves it against the application
 * root. `fetch` does not: it resolves against the current document, which already sits under
 * `/vis-2/`, so anything reading the url back has to strip this first.
 */
const VIS2_URL_PREFIX = './vis-2/';

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

/** A background service of a widget set, see `VisServiceProps` */
export interface VisServiceWithInfo {
    /** Adapter that brings the set */
    adapter: string;
    /** Name of the widget set, the federation remote */
    set: string;
    /** The names the widgets of the set carry as `widgetSet`, see {@link getCollectionSetNames} */
    setNames: string[];
    /** Name of the exposed module, as listed in `services` */
    name: string;
    Component: ComponentType<VisServiceProps>;
}

/** `services` is not in the typings of `common.visWidgets` yet (ioBroker/ioBroker.js-controller#3555) */
type VisWidgetCollection = ioBroker.VisWidget & { services?: string[] };

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
        /**
         * The instances that bring React widgets or icon sets, written into `config.js` by the adapter. Only `_id`
         * and the fields of `common` that the widget sets are loaded with are there. An older adapter does not
         * write it.
         */
        visWidgetInstances?: ioBroker.InstanceObject[];
    }
}

function registerWidgetsLoadIndicator(cb: (process: number, max: number) => void): void {
    window.__widgetsLoadIndicator = cb;
}

interface VisLoadComponentContext {
    visWidgetsCollection: VisWidgetCollection;
    countRef: { count: number; max: number };
    dynamicWidgetInstance: ioBroker.InstanceObject;
    i18nPrefix: string;
    // List of custom React components
    result: VisRxWidgetWithInfo<any>[];
    /** The background services of the sets */
    services: VisServiceWithInfo[];
    /** The names the widgets of the collection carry as `widgetSet` */
    setNames: string[];
    /** Report that the remote of the set failed, see {@link reportLoadError} */
    onLoadError: (error: unknown) => void;
}

/**
 * Note a widget set whose remote failed in `loadRemote()`, so the dialog of the skipped sets names it
 *
 * The manifest check cannot see everything: a set with a correct manifest may still throw while its remote entry
 * is initialized or its modules are evaluated (RUNTIME-015). Its widgets would otherwise just appear as unknown
 * widget types. Every component of the set fails the same way, so the set is noted once only.
 *
 * @param incompatibleSets - the skipped sets collected so far
 * @param name - name of the widget set
 * @param instance - the instance that brings the set
 * @param error - what `loadRemote()` rejected with
 */
function reportLoadError(
    incompatibleSets: IncompatibleWidgetSet[],
    name: string,
    instance: ioBroker.InstanceObject,
    error: unknown,
): void {
    if (incompatibleSets.some(set => set.name === name)) {
        return;
    }
    const skipped: IncompatibleWidgetSet = {
        name,
        adapter: instance._id.substring('system.adapter.'.length).replace(/\.\d*$/, ''),
        problem: 'load',
        error: (error as Error)?.message || String(error),
    };
    incompatibleSets.push(skipped);
    console.error(getIncompatibilityText(skipped));
}

// Must match the `name` configured in vite.config.ts (federation({ name: 'iobroker_vis' })).
// @module-federation/vite (>= 1.9) auto-inits the host under exactly that name — no prefix.
// If we init under any other name, we create a second, empty host instance that overwrites
// the global FederationInstance, so subsequent registerRemotes/loadRemote calls target the
// empty host. Remotes then fall back to their own bundled React/MUI and we get two Reacts
// plus `Cannot read properties of null (reading 'useContext')`.
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
                    console.error(
                        `Cannot load widget ${context.dynamicWidgetInstance._id}: ${e?.stack || e?.toString?.() || e}`,
                    );
                    context.onLoadError(e);
                });

            promises.push(promise);
        })(i, context.visWidgetsCollection);
    }

    // The services come out of the same remote as the widgets, but they are no widgets: they go into a list of
    // their own and never into the catalog
    const adapter = context.dynamicWidgetInstance._id.substring('system.adapter.'.length).replace(/\.\d*$/, '');
    for (const name of context.visWidgetsCollection.services || []) {
        context.countRef.max++;
        promises.push(
            loadRemote<{ default?: ComponentType<VisServiceProps> }>(`${context.visWidgetsCollection.name}/${name}`)
                .then(module => {
                    context.countRef.count++;
                    if (module?.default) {
                        context.services.push({
                            adapter,
                            set: context.visWidgetsCollection.name,
                            setNames: context.setNames,
                            name,
                            Component: module.default,
                        });
                    } else {
                        console.error(
                            `Cannot load service ${name} of ${context.dynamicWidgetInstance._id}. No default found`,
                        );
                    }
                    window.__widgetsLoadIndicator?.(context.countRef.count, context.countRef.max);
                })
                .catch((e: any) => {
                    console.error(
                        `Cannot load service ${name} of ${context.dynamicWidgetInstance._id}: ${e?.stack || e?.toString?.() || e}`,
                    );
                    context.onLoadError(e);
                }),
        );
    }

    return Promise.all(promises);
}

/** The adapter of an instance, e.g. `vis-2-widgets-material` for `system.adapter.vis-2-widgets-material.0` */
function getAdapterName(instance: ioBroker.InstanceObject): string {
    return instance._id.substring('system.adapter.'.length).replace(/\.\d*$/, '');
}

function getText(text: string | ioBroker.StringOrTranslated): string {
    if (typeof text === 'object') {
        return text[I18n.getLanguage()] || text.en || '';
    }
    return (text || '').toString();
}

/**
 * The instances that bring widgets or icon sets
 *
 * @param socket Socket connection
 * @param fromConfig Take the list the adapter wrote into `config.js`, if there is one. Reading all instances
 *   instead costs 1 MB on an ordinary system and comes before the first widget set can be asked for. The editor
 *   reads them anyway: the developer mode of a widget set changes an instance and reloads at once.
 */
function readWidgetInstances(socket: Connection, fromConfig: boolean): Promise<ioBroker.InstanceObject[]> {
    if (fromConfig && window.visWidgetInstances) {
        // the instances are written to below (the url of a set), so they must be copies
        return Promise.resolve(JSON.parse(JSON.stringify(window.visWidgetInstances)));
    }

    let getObjectViewSystem: typeof socket.getObjectViewSystem = socket.getObjectViewSystem.bind(socket);
    if (socket.getObjectViewSystemCached) {
        getObjectViewSystem = socket.getObjectViewSystemCached.bind(socket);
    }

    return getObjectViewSystem('instance', 'system.adapter.', 'system.adapter.香').then(objects =>
        Object.values(objects),
    );
}

/**
 * Load all remote widgets from instances
 *
 * !Do not make this funktion async because it is optimized to simultaneously load the widget sets
 *
 * @param socket Socket connection
 * @param onlyWidgetSets If array of names, load only these widget sets
 * @param fromConfig Take the instances from `config.js`, see {@link readWidgetInstances}
 */
function getRemoteWidgets(
    socket: Connection,
    onlyWidgetSets?: false | string[],
    fromConfig?: boolean,
): Promise<
    | undefined
    | {
          widgetSets: VisRxWidgetWithInfo<any>[];
          /** Background services of the widget sets, see `VisServiceProps` */
          services: VisServiceWithInfo[];
          additionalSets: AdditionalIconSet;
          /** Widget sets that were skipped because they were built for an older react */
          incompatibleSets: IncompatibleWidgetSet[];
      }
> {
    return readWidgetInstances(socket, !!fromConfig)
        .then(instances => {
            const result: VisRxWidgetWithInfo<any>[] = [];
            const services: VisServiceWithInfo[] = [];
            const additionalSets: AdditionalIconSet = {};
            const incompatibleSets: IncompatibleWidgetSet[] = [];
            const countRef = { count: 0, max: 0 };
            const dynamicWidgetInstances: ioBroker.InstanceObject[] = instances.filter(obj => {
                if (!obj.common.visWidgets && !obj.common.visIconSets) {
                    return false;
                }
                if (obj.common.visWidgets) {
                    // @ts-expect-error deprecated, but we still check it
                    const ignoreVersions: number[] = obj.common.visWidgets.ignoreInVersions || [];
                    if (ignoreVersions.includes(2)) {
                        return false;
                    }
                    if (!onlyWidgetSets || onlyWidgetSets.includes(getText(obj.common.name))) {
                        return true;
                    }
                    // a set may be named by its collection too, not only by the adapter (#691)
                    const visWidgets = obj.common.visWidgets as Record<string, VisWidgetCollection>;
                    return Object.keys(visWidgets).some(
                        key =>
                            key !== 'i18n' &&
                            isCollectionUsed(
                                getCollectionSetNames(getAdapterName(obj), key, visWidgets[key]?.name),
                                onlyWidgetSets,
                            ),
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
                        const visWidgetsCollection: VisWidgetCollection =
                            dynamicWidgetInstance.common.visWidgets[widgetSetName];

                        if (
                            Array.isArray(visWidgetsCollection.ignoreInVersions) &&
                            visWidgetsCollection.ignoreInVersions.includes(2)
                        ) {
                            continue;
                        }

                        const setNames = getCollectionSetNames(
                            getAdapterName(dynamicWidgetInstance),
                            widgetSetName,
                            visWidgetsCollection.name,
                        );
                        // of an adapter with several sets, only those the project uses (#691). A project that uses
                        // the adapter itself as the set gets all of them, as before
                        if (
                            onlyWidgetSets &&
                            !onlyWidgetSets.includes(getText(dynamicWidgetInstance.common.name)) &&
                            !isCollectionUsed(setNames, onlyWidgetSets)
                        ) {
                            continue;
                        }

                        if (!visWidgetsCollection.url?.startsWith('http')) {
                            visWidgetsCollection.url = `${VIS2_URL_PREFIX}widgets/${visWidgetsCollection.url}`;
                        }

                        registerRemotes(
                            [
                                {
                                    name: visWidgetsCollection.name,
                                    entry: visWidgetsCollection.url,
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

                                    // `collection.url` carries VIS2_URL_PREFIX for registerRemotes, which resolves
                                    // it against the application root. `fetch` resolves against the current
                                    // document instead, and that already sits under /vis-2/ - with the prefix the
                                    // manifest and the language files were asked for under /vis-2/vis-2/... and
                                    // always answered 404
                                    const fetchUrl = collection.url.startsWith(VIS2_URL_PREFIX)
                                        ? collection.url.substring(VIS2_URL_PREFIX.length)
                                        : collection.url;

                                    // A widget set built for an older react throws while its module is
                                    // evaluated, deep inside `loadRemote()` - no widget exists yet, so the error
                                    // boundary around the widgets cannot catch it and the message points at
                                    // nothing. Ask the federation manifest of the set beforehand instead
                                    const compatibility = checkWidgetSetCompatibility(fetchUrl);
                                    // ...and what the manifest cannot tell shows up only when the remote fails
                                    const onLoadError = (error: unknown): void =>
                                        reportLoadError(incompatibleSets, collection.name, instance, error);

                                    // The files of the set travel side by side instead of one level after the
                                    // other, see visPreloadWidgetSet.ts. The entry already while the manifest is
                                    // read - preloading runs nothing, so an incompatible set is no danger yet.
                                    const remoteEntryUrl = getRemoteEntryUrl(collection.url);
                                    preloadModule(remoteEntryUrl);
                                    void compatibility.then(async problem => {
                                        const manifest = problem ? null : await getWidgetSetManifest(fetchUrl);
                                        if (manifest) {
                                            preloadWidgetSet(remoteEntryUrl, manifest);
                                        }
                                    });

                                    const loadComponentsIfCompatible = (): Promise<void[] | void> =>
                                        compatibility.then(problem => {
                                            if (!problem) {
                                                return _loadComponentHelper({
                                                    visWidgetsCollection: collection,
                                                    countRef,
                                                    dynamicWidgetInstance: instance,
                                                    i18nPrefix,
                                                    result,
                                                    services,
                                                    setNames,
                                                    onLoadError,
                                                });
                                            }
                                            const skipped: IncompatibleWidgetSet = {
                                                name: collection.name,
                                                adapter: instance._id
                                                    .substring('system.adapter.'.length)
                                                    .replace(/\.\d*$/, ''),
                                                problem,
                                            };
                                            incompatibleSets.push(skipped);
                                            console.error(getIncompatibilityText(skipped));
                                            return undefined;
                                        });

                                    // 1. Load language file ------------------
                                    // instance.common.visWidgets.i18n is deprecated
                                    if (collection.url && collection.i18n === true) {
                                        // load i18n from files
                                        const pos = fetchUrl.lastIndexOf('/');
                                        let i18nURL: string;
                                        if (pos !== -1) {
                                            i18nURL = fetchUrl.substring(0, pos);
                                        } else {
                                            i18nURL = fetchUrl;
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
                                        // the translations come out of the same remote as the widgets, so this
                                        // would already run into the crash the check is there to avoid
                                        i18nPromiseWait = compatibility.then(problem => {
                                            if (problem) {
                                                return null;
                                            }
                                            return loadRemote<any>(`${collection.name as WidgetSetName}/translations`)
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
                                                .catch((error: string) => {
                                                    console.log(`Cannot load i18n "${collection.name}": ${error}`);
                                                    onLoadError(error);
                                                });
                                        });
                                    } else if (collection.i18n && typeof collection.i18n === 'object') {
                                        try {
                                            I18n.extendTranslations(collection.i18n);
                                        } catch (error) {
                                            console.error(`Cannot import i18n: ${error as Error}`);
                                        }
                                    }

                                    // 2. Load all components ------------------
                                    if (collection.components) {
                                        if (i18nPromiseWait instanceof Promise) {
                                            // we must wait for it as the flag i18nPrefix will be used in the component
                                            promises.push(i18nPromiseWait.then(() => loadComponentsIfCompatible()));
                                        } else {
                                            // do not wait for languages
                                            promises.push(loadComponentsIfCompatible());
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
                services,
                additionalSets,
                incompatibleSets,
            }));
        })
        .catch((e: unknown): undefined => {
            console.error('Cannot read instances', e);
            return undefined;
        });
}

export { getRemoteWidgets, registerWidgetsLoadIndicator };
