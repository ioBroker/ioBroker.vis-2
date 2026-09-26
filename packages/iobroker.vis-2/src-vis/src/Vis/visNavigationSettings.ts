import type { Project, ViewSettings } from '@iobroker/types-vis-2';

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
