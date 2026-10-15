/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { AnyWidgetId, Project, VisServiceWidget } from '@iobroker/types-vis-2';

import { hasProjectAccess, hasViewAccess, hasWidgetAccess } from '@/Utilities/utils';
import { isUserInGroups } from './visSections';

/** Who looks at the runtime, as the two checks of the permissions need it */
export interface ServiceUser {
    /** The name the permissions of the project, the views and the widgets are stored under (`activeUser` of the store) */
    permissionsName: string;
    /** The id without `system.user.`, by which the groups list their members */
    id: string;
    userGroups: Record<string, ioBroker.Object> | null | undefined;
}

/** The user may see the widget: it is rendered for them, neither hidden nor disabled by `visibility-groups` */
function mayUse(project: Project, view: string, id: AnyWidgetId, user: ServiceUser): boolean {
    const widget = project[view].widgets[id];
    return (
        !!widget &&
        hasWidgetAccess({ project, view, wid: id, user: user.permissionsName, editMode: false }) &&
        // not in one of the groups: hidden or disabled - either way not for this user
        isUserInGroups(user.id, widget.data?.['visibility-groups'], user.userGroups)
    );
}

/**
 * The widgets a background service of a widget set gets: those of the set in all views of the project that the user may
 * see, with the same permissions the runtime applies when it renders them.
 *
 * @param project - the project
 * @param adapter - the adapter that brings the set; its widgets carry it as `widgetSet`
 * @param user - who looks at the runtime
 */
export function getServiceWidgets(project: Project, adapter: string, user: ServiceUser): VisServiceWidget[] {
    const result: VisServiceWidget[] = [];
    if (!hasProjectAccess({ project, user: user.permissionsName, editMode: false })) {
        return result;
    }
    for (const view of Object.keys(project)) {
        if (
            view === '___settings' ||
            !project[view]?.widgets ||
            !hasViewAccess({ project, view, user: user.permissionsName, editMode: false })
        ) {
            continue;
        }
        const widgets = project[view].widgets;
        for (const id of Object.keys(widgets) as AnyWidgetId[]) {
            const widget = widgets[id];
            if (widget.widgetSet !== adapter || !mayUse(project, view, id, user)) {
                continue;
            }
            // the member of a group is only rendered with its group
            if (widget.groupid && !mayUse(project, view, widget.groupid, user)) {
                continue;
            }
            result.push({ view, id, tpl: widget.tpl, data: widget.data });
        }
    }
    return result;
}
