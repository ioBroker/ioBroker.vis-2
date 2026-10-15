/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

/**
 * Announces the files of a widget set to the browser before the federation runtime asks for them.
 *
 * A widget set is a federation remote, cut by its bundler into chunks that import each other: the entry, the
 * helpers, the map of the shared modules, the component, its chunks, the shared modules again. Loaded the way the
 * federation runtime does it, every level waits for the one before - measured, ten round trips one after the other
 * for one small set, a second on a tablet.
 *
 * The federation manifest, which vis-2 reads anyway to check the set (see visWidgetSetCompatibility.ts), names all
 * of these files. Announced as `modulepreload` they are fetched and compiled side by side, but nothing of them
 * runs: the federation runtime finds them in the module map once it imports them, in its own order.
 */

import type { FederationManifest } from './visWidgetSetCompatibility';

const preloaded = new Set<string>();

/**
 * Fetch and compile a module without running it
 *
 * @param url - absolute URL of the module, as it will be imported
 */
export function preloadModule(url: string): void {
    if (preloaded.has(url)) {
        return;
    }
    preloaded.add(url);
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.crossOrigin = 'anonymous';
    link.href = url;
    document.head.appendChild(link);
}

/**
 * The URL the federation runtime loads a remote entry from.
 *
 * It resolves a relative entry against the origin, not against the page - that is why the widget sets carry the
 * prefix `./vis-2/` (see `VIS2_URL_PREFIX` in visLoadWidgets.tsx).
 *
 * @param entry - the url of the widget set, as it is registered
 * @returns The absolute URL
 */
export function getRemoteEntryUrl(entry: string): string {
    return new URL(entry, `${window.location.origin}/`).href;
}

/**
 * Announce every file the exposed modules of a widget set are made of
 *
 * @param remoteEntryUrl - absolute URL of the remote entry, see getRemoteEntryUrl
 * @param manifest - the federation manifest of the set
 */
export function preloadWidgetSet(remoteEntryUrl: string, manifest: FederationManifest): void {
    manifest.exposes?.forEach(expose => {
        const js = expose.assets?.js;
        // `async` holds the wrappers of the shared modules, which are always imported, and the own copies of
        // react, MUI, ... of the set, which are only fetched if vis-2 did not provide them - and it always does
        const files = [...(js?.sync || []), ...(js?.async || []).filter(file => file.includes('__loadShare__'))];
        files.forEach(file => preloadModule(new URL(file, remoteEntryUrl).href));
    });
}
