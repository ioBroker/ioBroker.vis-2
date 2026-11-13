/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { Project } from '@iobroker/types-vis-2';

/**
 * The widgets of a project that nothing installed can draw.
 *
 * A project travels: it is imported from the forum, copied from another installation, restored from a backup. Its
 * widgets name the set they come from, and where that set is not installed they are drawn as a striped box with
 * "Unknown widget type" in it - on every page, one after the other, with nothing that says what to do about it.
 * The editor gathers them by set instead, and the set names the adapter that brings it.
 */

/** One widget set the project uses and that is not there */
export interface MissingWidgetSet {
    /** The name the widgets give their set, `widgetSet` of the widget; empty where they give none */
    set: string;
    /** How many widgets of the project belong to it */
    count: number;
    /** The views they stand on */
    views: string[];
    /** Some of the widget types, to say what is missing where the set has no name */
    types: string[];
}

/**
 * The widget sets of a project that are not installed.
 *
 * @param project - the project
 * @param isKnown - whether a widget type can be drawn: a React widget, the template of a vis-1 widget, a group
 * @returns the sets, the one with the most widgets first
 */
export function findMissingWidgetSets(
    project: Project | null | undefined,
    isKnown: (tpl: string) => boolean,
): MissingWidgetSet[] {
    const bySet: Record<string, MissingWidgetSet> = {};
    if (!project) {
        return [];
    }
    for (const view of Object.keys(project)) {
        if (view === '___settings') {
            continue;
        }
        const widgets = project[view]?.widgets || {};
        for (const widget of Object.values(widgets)) {
            const tpl = widget?.tpl;
            if (!tpl || tpl === '_tplGroup' || isKnown(tpl)) {
                continue;
            }
            const set = widget.widgetSet || widget.set || widget.wSet || '';
            const missing = (bySet[set] ||= { set, count: 0, views: [], types: [] });
            missing.count++;
            if (!missing.views.includes(view)) {
                missing.views.push(view);
            }
            if (missing.types.length < 3 && !missing.types.includes(tpl)) {
                missing.types.push(tpl);
            }
        }
    }
    return Object.values(bySet).sort((a, b) => b.count - a.count);
}

/**
 * The adapters that may bring a widget set, the likeliest first.
 *
 * A set of the React widgets is named after its adapter, `vis-2-widgets-material`; one of vis-1 by itself,
 * `hqwidgets`, and its adapter is `vis-hqwidgets`. Some adapters name their sets by a key of their own, so the
 * name with the prefix of vis-2 is tried as well.
 *
 * @param set - the name the widgets give their set
 */
export function adapterCandidates(set: string): string[] {
    const name = set
        .trim()
        .toLowerCase()
        .replace(/^iobroker\./, '');
    if (!name || !/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
        return [];
    }
    const candidates = [name, `vis-2-widgets-${name}`, `vis-${name}`];
    return candidates.filter((candidate, index) => candidates.indexOf(candidate) === index);
}

/**
 * The adapter that brings a widget set, out of the repository.
 *
 * @param set - the name the widgets give their set
 * @param repository - the adapters of the repository, by their names; without one only a set that is named like
 *   an adapter of widgets, `vis-…`, is taken for the name of its adapter - anything else would be a guess
 */
export function findWidgetAdapter(set: string, repository: Record<string, unknown> | null): string | null {
    const candidates = adapterCandidates(set);
    if (repository) {
        return candidates.find(candidate => !!repository[candidate]) || null;
    }
    return candidates[0]?.startsWith('vis-') ? candidates[0] : null;
}

/**
 * Who a list of missing sets is, for remembering that the user saw it.
 *
 * The dialog stays away as long as the same sets are missing, and comes back as soon as another one is.
 *
 * @param names - the names of the sets or adapters
 */
export function missingKey(names: string[]): string {
    return [...names].sort().join(',');
}
