import type { VisLegacy } from '@iobroker/types-vis-2';

/**
 * The scripts of the vis-1 widget sets run only once and register themselves in `vis.binds` (and some put more
 * on `vis`). A new engine - e.g. after a view change in the editor - must take these over, or their widgets
 * cannot be rendered anymore (#741).
 */
export function takeOverLegacyBinds(oldVis: VisLegacy | undefined): VisLegacy['binds'] {
    const binds: VisLegacy['binds'] = oldVis?.binds || ({} as VisLegacy['binds']);
    (['basic', 'table', 'jqplot', 'jqueryui', 'swipe'] as const).forEach(key => {
        if (!(key in binds)) {
            binds[key] = null;
        }
    });
    return binds;
}

/** Keep what the widget sets hung on `vis` themselves, but never replace a function or field of the engine */
export function takeOverLegacyProperties(vis: VisLegacy, oldVis: VisLegacy | undefined): VisLegacy {
    if (oldVis && oldVis !== vis) {
        Object.keys(oldVis).forEach(key => {
            if (!(key in vis)) {
                (vis as Record<string, any>)[key] = (oldVis as Record<string, any>)[key];
            }
        });
    }
    return vis;
}
