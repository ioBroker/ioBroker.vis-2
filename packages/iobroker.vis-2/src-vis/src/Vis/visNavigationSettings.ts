import type { Project, ViewSettings } from '@iobroker/types-vis-2';

import { isConditionMet } from './visConditions';
import { DEFAULT_CONDITION } from './visSections';

/**
 * The settings of the menu that a project may hold for all of its views.
 *
 * Which page carries an entry, what it is called and in which order it stands stays with the page -
 * that describes the page. How the menu looks belongs to the project, and before it could be said
 * there it had to be repeated in every single view, because the menu is drawn from the settings of
 * whichever view happens to be open. That is what the "apply to all views" button was invented for.
 */
export const PROJECT_NAVIGATION_KEYS: (keyof ViewSettings)[] = [
    'navigationOrientation',
    'navigationFlat',
    'navigationOnlyIcon',
    'navigationWidth',
    'navigationBackground',
    'navigationColor',
    'navigationSelectedBackground',
    'navigationSelectedColor',
    'navigationHeaderText',
    'navigationHeaderTextColor',
    'navigationChevronColor',
    'navigationButtonBackground',
    'navigationHideOnSelection',
    'navigationNoHide',
    'navigationBar',
    'navigationBarColor',
    'navigationBarHeight',
    'navigationBack',
];

/**
 * The settings the menu is drawn with: what the project says, and what the view says instead.
 *
 * A view wins with every value somebody actually set. Nothing, a null and an empty string - which is
 * how the editor spells a colour that was never chosen - count as "not set". A checkbox that was
 * never touched carries nothing either, so a `false` is a real answer and wins as well: somebody
 * switched that off on purpose.
 *
 * That rule is what makes this safe for a project that was built before it existed. There, every view
 * carries the whole look and the project carries none of it - so the view wins every time, and
 * nothing moves.
 *
 * @param project - the whole project, whose `___settings` may carry the defaults
 * @param viewSettings - the settings of the view that is shown
 */
export function resolveNavigationSettings(project: Project, viewSettings: ViewSettings): ViewSettings {
    const defaults = project?.___settings as unknown as ViewSettings | undefined;
    if (!defaults) {
        return viewSettings;
    }

    let resolved: ViewSettings | null = null;
    for (const key of PROJECT_NAVIGATION_KEYS) {
        const own = viewSettings[key];
        if (own !== undefined && own !== null && own !== '') {
            continue;
        }
        const fromProject = defaults[key];
        if (fromProject === undefined || fromProject === null || fromProject === '') {
            continue;
        }
        // a copy only where there is something to change: this runs on every render of every view
        resolved ||= { ...viewSettings };
        (resolved as Record<string, unknown>)[key] = fromProject;
    }

    return resolved || viewSettings;
}

/** The height of the app bar if none is set, and the limits of one that is (#569) */
export const NAVIGATION_BAR_HEIGHT = { default: 48, min: 24, max: 120 };

/**
 * The height of the app bar in px. A value that is no number takes the default, one out of range the nearest
 * limit: a bar lower than an icon, or higher than a third of a phone screen, is a typo.
 *
 * @param settings - the resolved settings of the menu
 */
export function getNavigationBarHeight(settings: ViewSettings): number {
    const height = parseInt(settings.navigationBarHeight as unknown as string, 10);
    if (Number.isNaN(height)) {
        return NAVIGATION_BAR_HEIGHT.default;
    }
    return Math.min(NAVIGATION_BAR_HEIGHT.max, Math.max(NAVIGATION_BAR_HEIGHT.min, height));
}

/**
 * The states the menu has to listen to: those the entries of the views are shown by (#592)
 *
 * @param project - the whole project
 */
export function getNavigationEntryStateIds(project: Project): string[] {
    const ids: string[] = [];
    Object.keys(project || {}).forEach(view => {
        if (view === '___settings') {
            return;
        }
        const settings = project[view]?.settings;
        const oid = typeof settings?.navigationEntryOid === 'string' ? settings.navigationEntryOid.trim() : '';
        if (settings?.navigation && !settings.navigationHideEntry && oid && !ids.includes(oid)) {
            ids.push(oid);
        }
    });
    return ids;
}

/**
 * Whether the entry of a view is in the menu by its condition. Without a state it always is. While the value of
 * the state is not known yet, the entry is not shown, like a widget, so it does not flash up and vanish.
 *
 * @param viewSettings - the settings of the view the entry stands for
 * @param states - the values of the states, by `<id>.val`
 * @param view - the name of the view, only for the log
 */
export function isNavigationEntryShown(
    viewSettings: ViewSettings,
    states: Record<string, unknown>,
    view: string,
): boolean {
    const oid = typeof viewSettings.navigationEntryOid === 'string' ? viewSettings.navigationEntryOid.trim() : '';
    if (!oid) {
        return true;
    }
    return isConditionMet(
        states,
        oid,
        viewSettings.navigationEntryCond || DEFAULT_CONDITION,
        viewSettings.navigationEntryVal,
        view,
    );
}
