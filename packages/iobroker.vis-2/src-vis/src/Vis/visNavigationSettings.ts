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
 * The settings of the menu that only the project has: they are the same on every page with a menu.
 *
 * The picture in front of the header text is the logo of the whole installation. A logo that is there on one
 * page and missing on the next one looks like a fault, so a page cannot have its own: the editor stores it in
 * the project, and a value a page still carries is not used.
 */
export const PROJECT_ONLY_NAVIGATION_KEYS: (keyof ViewSettings)[] = ['navigationHeaderIcon', 'navigationHeaderImage'];

function isSet(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
}

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
 * The settings of PROJECT_ONLY_NAVIGATION_KEYS are the exception: they are always those of the project.
 *
 * @param project - the whole project, whose `___settings` may carry the defaults
 * @param viewSettings - the settings of the view that is shown
 */
export function resolveNavigationSettings(project: Project, viewSettings: ViewSettings): ViewSettings {
    const defaults = (project?.___settings || {}) as unknown as ViewSettings;

    // a copy only where there is something to change: this runs on every render of every view
    let resolved: ViewSettings | null = null;

    for (const key of PROJECT_ONLY_NAVIGATION_KEYS) {
        const fromProject = isSet(defaults[key]) ? defaults[key] : undefined;
        if (viewSettings[key] !== fromProject) {
            resolved ||= { ...viewSettings };
            if (fromProject === undefined) {
                delete resolved[key];
            } else {
                (resolved as Record<string, unknown>)[key] = fromProject;
            }
        }
    }

    for (const key of PROJECT_NAVIGATION_KEYS) {
        if (isSet(viewSettings[key])) {
            continue;
        }
        const fromProject = defaults[key];
        if (!isSet(fromProject)) {
            continue;
        }
        resolved ||= { ...viewSettings };
        (resolved as Record<string, unknown>)[key] = fromProject;
    }

    return resolved || viewSettings;
}

/** How many entries the menu at the bottom edge shows side by side; what is more goes behind "More" */
export const BOTTOM_MENU_ENTRIES = 5;

/**
 * The entries of the menu at the bottom edge, and those behind its "More".
 *
 * About five entries fit across a phone. With more than that the bar used to scroll, and an entry that is
 * scrolled out of sight is an entry nobody finds - so a project with nine pages had to build a page of its own
 * with buttons to the other five. Now the bar shows four of them and a fifth button that lists the rest, which
 * is what the apps on the same phone do. Five pages or fewer are shown as they are: a "More" with one page
 * behind it would only be a longer way to it.
 *
 * @param items - the entries in the order of the menu
 * @param max - how many fit side by side
 */
export function splitBottomMenu<T>(items: T[], max: number = BOTTOM_MENU_ENTRIES): { shown: T[]; more: T[] } {
    if (items.length <= max) {
        return { shown: items, more: [] };
    }
    return { shown: items.slice(0, max - 1), more: items.slice(max - 1) };
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

/** How wide the menu at the side is */
export type MenuWidth = 'full' | 'narrow' | 'hidden';

/**
 * The width the menu is drawn with on this view.
 *
 * Open, narrow or closed is one state for the whole runtime (`vis.menuWidth`), but a view whose menu hides
 * itself after a selection knows only two of them: closed, or open over the page. It gives its page the whole
 * width and lays the menu on top. A narrow menu that another view left behind stayed there for good and covered
 * the left edge of the page - the first column of relative widgets, or whatever stood within 56 px of it.
 *
 * @param menuWidth - the state of the menu
 * @param settings - the resolved settings of the menu
 */
export function getMenuWidth(menuWidth: MenuWidth, settings: ViewSettings): MenuWidth {
    if (settings.navigationHideOnSelection && menuWidth === 'narrow') {
        return 'hidden';
    }
    return menuWidth;
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

/** How high the menu at the bottom edge is, in px: the height of the bottom navigation of MUI */
export const BOTTOM_MENU_HEIGHT = 56;

/**
 * How much of the bottom of the page the menu at the bottom edge covers, in px.
 *
 * That menu lies over the page - it is fixed to the bottom of the window - so a page that is scrolled to its end
 * still had its last 56 px behind it: the buttons of the last card on a phone could not be reached. The page
 * keeps that much room free at its bottom instead, see `VisView.render()`.
 *
 * @param settings - the resolved settings of the menu
 */
export function getBottomMenuInset(settings: ViewSettings | null | undefined): number {
    return settings?.navigation && settings.navigationOrientation === 'bottom' ? BOTTOM_MENU_HEIGHT : 0;
}
