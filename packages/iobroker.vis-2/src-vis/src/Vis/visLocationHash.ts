/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

/**
 * Changing the view without loading the page again (#743).
 *
 * The view is in the hash of the address (`#view/path`). Setting `location.hash` - or following a link `#view` - is
 * a navigation, even if the page stays the same. Safari 27 runs a page that comes over plain HTTP (e.g.
 * `http://192.168.1.10:8082/vis-2/`) in a separate "EnhancedSecurity" process, and every navigation of such a page
 * passes a check of Safari, which swaps that process and loads the whole page again: every change of the view took
 * 5 seconds, with the logo and the loading bar. `history.pushState` is no navigation and passes no such check, and a
 * step back between its entries does not either.
 *
 * The page learns about a new view from `hashchange`. `pushState` fires none, so it is sent here, as a task, like the
 * browser sends it after setting `location.hash`.
 */

/** What of `window` is needed to change the hash, so that it can be tested without a browser */
export interface HashWindow {
    location: { href: string };
    history: { state: unknown; pushState(data: unknown, unused: string, url?: string | null): void };
    dispatchEvent(event: Event): boolean;
}

function createHashChangeEvent(oldURL: string, newURL: string): Event {
    if (typeof HashChangeEvent === 'function') {
        return new HashChangeEvent('hashchange', { oldURL, newURL });
    }
    return Object.assign(new Event('hashchange'), { oldURL, newURL });
}

/**
 * Shows another hash in the address, e.g. another view, without a navigation.
 *
 * @param hash - the new hash, e.g. `#view` or `#view/path`, encoded like `VisEngine.buildPath` does it
 * @param win - the window, `window` if not given
 */
export function setLocationHash(hash: string, win: HashWindow = window): void {
    const oldURL = win.location.href;
    // compared as addresses: "#Büro" and "#B%C3%BCro" are the same
    const newURL = new URL(hash.startsWith('#') ? hash : `#${hash}`, oldURL).href;
    if (newURL === oldURL) {
        return;
    }
    try {
        win.history.pushState(win.history.state, '', newURL);
    } catch (e) {
        // a sandboxed frame may not change the history
        console.warn(`Cannot change the address without a navigation: ${e as Error}`);
        win.location.href = newURL;
        return;
    }
    setTimeout(() => win.dispatchEvent(createHashChangeEvent(oldURL, newURL)), 0);
}

/**
 * The hash a link goes to, if it leads to this page with another hash only - else null.
 *
 * @param linkHref - the whole address of the link (`anchor.href`)
 * @param pageHref - the address of the page
 */
export function getHashOfPageLink(linkHref: string, pageHref: string): string | null {
    let link: URL;
    let page: URL;
    try {
        link = new URL(linkHref, pageHref);
        page = new URL(pageHref);
    } catch {
        return null;
    }
    if (
        !link.hash ||
        link.hash === page.hash ||
        link.origin !== page.origin ||
        link.pathname !== page.pathname ||
        link.search !== page.search
    ) {
        return null;
    }
    return link.hash;
}

/**
 * The view a hash names: `#view/path` -> `view`.
 *
 * @param hash - the hash, e.g. `#Wohnzimmer/settings`
 */
export function getViewOfHash(hash: string): string {
    const view = hash.replace(/^#/, '').split('/')[0];
    try {
        return decodeURIComponent(view);
    } catch {
        return view;
    }
}

/**
 * True if the hash names a view of the project. A link like `#top` to a place on the page is left to the browser.
 *
 * @param hash - the hash with its "#", e.g. `#Wohnzimmer`
 * @param project - the views of the project by their names
 */
export function isViewHash(hash: string, project: Record<string, unknown> | null | undefined): boolean {
    if (typeof hash !== 'string' || !hash.startsWith('#')) {
        return false;
    }
    const view = getViewOfHash(hash);
    return !!view && view !== '___settings' && !!project?.[view];
}
