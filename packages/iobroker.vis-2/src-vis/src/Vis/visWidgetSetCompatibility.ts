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
 * Detects widget sets that cannot run in the react version of this vis-2 anymore.
 *
 * A widget set that was built before `react/jsx-runtime` was added to the shared modules bundles its own copy of
 * the JSX runtime. That copy pulls react itself out of the share scope - so there is no second react - but it was
 * compiled against react 18 and does two things that react 19 does not survive:
 *
 * 1. it reads `react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner`, which react 19
 *    renamed to `__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`. The property is `undefined`
 *    and the line throws while the MODULE is evaluated - before any widget renders, so the error boundary around
 *    the widgets never sees it and the whole set dies in `loadRemote()`.
 * 2. it stamps every element it creates with `Symbol.for('react.element')`, while react 19 expects
 *    `Symbol.for('react.transitional.element')`. Such an element fails `isValidElement()` and rendering it ends
 *    in "Objects are not valid as a React child".
 *
 * Neither can be repaired from here: the JSX runtime is baked into the bundle of the widget set and the host has
 * no hook into it. The only fix is to build the widget set again against a `@iobroker/types-vis-2` that shares
 * `react/jsx-runtime`. So instead of letting it fail with an error that points at nothing, the set is recognized
 * beforehand and reported.
 *
 * The decision is made on the federation manifest that every widget set ships next to its remote entry. It lists
 * the shared modules the set was built with, which is exactly the information needed - no guessing from version
 * numbers of the adapter.
 *
 * As long as vis-2 itself runs on react 18 nothing is skipped: those widget sets work here, and the check exits
 * on the first line.
 */

import { version as reactVersion } from 'react';

/** Why a widget set cannot be loaded */
export type WidgetSetIncompatibility =
    /** Does not share react at all, so it would bring a second react into the page */
    | 'react'
    /** Shares react but not the JSX runtime, so it creates elements of the wrong react version */
    | 'jsx-runtime';

export interface IncompatibleWidgetSet {
    /** Name of the widget set, e.g. `vis2materialWidgets` */
    name: string;
    /** Adapter the widget set belongs to, e.g. `vis-2-widgets-material` */
    adapter: string;
    /** What is wrong with it */
    problem: WidgetSetIncompatibility;
}

// TEMPORARY, switched off on request to try whether the widget sets load anyway. Set back to `false` - with
// `true` nothing is checked and a widget set built for react 18 takes the whole set down while it is loaded.
const DETECTION_DISABLED = true;

/** Major of the react this vis-2 was built with */
const HOST_REACT_MAJOR = parseInt(reactVersion, 10);

/** First react major that rejects the elements of an older one */
const BREAKING_REACT_MAJOR = 19;

/** The two names the federation manifest is written under, depending on the bundler of the widget set */
const MANIFEST_FILES = ['mf-manifest.json', 'mf-stats.json'];

interface FederationManifest {
    shared?: { name: string }[];
}

/** One request per widget set, no matter how many components it has */
const manifestCache: Record<string, Promise<FederationManifest | null>> = {};

/**
 * Read the federation manifest that belongs to a remote entry
 *
 * @param remoteEntryUrl - URL of the remote entry, e.g. `./vis-2/widgets/vis-2-widgets-material/customWidgets.js`
 * @returns The manifest, or null if the widget set does not ship one
 */
async function readManifest(remoteEntryUrl: string): Promise<FederationManifest | null> {
    const pos = remoteEntryUrl.lastIndexOf('/');
    const directory = pos === -1 ? '.' : remoteEntryUrl.substring(0, pos);

    for (const fileName of MANIFEST_FILES) {
        try {
            const response = await fetch(`${directory}/${fileName}`);
            if (response.ok) {
                return (await response.json()) as FederationManifest;
            }
        } catch {
            // not this one - a missing manifest is answered with an HTML page by some web servers, so a failing
            // json() is just as good an answer as a 404
        }
    }

    return null;
}

/**
 * Can a widget set be loaded by this vis-2?
 *
 * @param remoteEntryUrl - URL of the remote entry of the widget set
 * @returns What is wrong with the widget set, or null if it can be loaded
 */
export function checkWidgetSetCompatibility(remoteEntryUrl: string): Promise<WidgetSetIncompatibility | null> {
    // widget sets built against react 18 run fine in a react 18 host, which is the only case that exists today
    if (DETECTION_DISABLED || HOST_REACT_MAJOR < BREAKING_REACT_MAJOR) {
        return Promise.resolve(null);
    }

    manifestCache[remoteEntryUrl] ||= readManifest(remoteEntryUrl);

    return manifestCache[remoteEntryUrl].then(manifest => {
        // Without a manifest there is nothing to judge on. Let the widget set try - a set that works must not be
        // locked out because its bundler writes the manifest somewhere else
        if (!manifest?.shared?.length) {
            return null;
        }

        const shared: string[] = manifest.shared.map(entry => entry.name);

        if (!shared.includes('react')) {
            return 'react';
        }
        if (!shared.includes('react/jsx-runtime')) {
            return 'jsx-runtime';
        }

        return null;
    });
}

/**
 * Text for the log and for the user
 *
 * @param set - the widget set that was skipped
 * @returns One sentence naming the widget set and what has to be done about it
 */
export function getIncompatibilityText(set: IncompatibleWidgetSet): string {
    if (set.problem === 'react') {
        return (
            `The widget set "${set.adapter}" does not share react and would load a second copy of it. ` +
            `It has to be built again for vis-2 with react ${HOST_REACT_MAJOR}.`
        );
    }
    return (
        `The widget set "${set.adapter}" was built for react 18 and cannot run in vis-2 with react ` +
        `${HOST_REACT_MAJOR}. The adapter has to be updated.`
    );
}
