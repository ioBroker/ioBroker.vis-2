import { store } from '@/Store';

export interface ProjectSettings {
    darkReloadScreen: boolean;
    destroyViewsAfter: number;
    folders: {id: string, name: string, parentId: string}[];
    openedViews: string[];
    reconnectInterval: number;
    reloadOnEdit: boolean;
    reloadOnSleep: number;
    statesDebounceTime: number;
}

interface SingleWidget  {
    data: Record<string, unknown>;
    style: Record<string, unknown>;
    tpl: string;
    widgetSet: string;
}

interface Group extends SingleWidget {
    tpl: '_tplGroup';
    data: {
        members: string[];
        [other: string]: unknown
    }
}

export type Widget = SingleWidget | Group;

export interface View {
    activeWidgets: string[];
    filterList: string[];
    rerender: boolean;
    settings: Record<string, unknown>;
    widgets: Record<string, Widget>;
}

export interface Project {
    // @ts-expect-error this type has bad code-style, we should refactor the views in a views: Record<string, View> attribute
    ___settings: ProjectSettings;
    [view: string]: View;
}

/**
 * Check if passed Widget is a group
 *
 * @param widget widget to check
 */
export function isGroup(widget: Widget): widget is Group {
    return widget.tpl === '_tplGroup';
}

/**
 * Stringify-parse copy with type inference
 *
 * @param object The object which should be cloned
 */
export function deepClone<T extends Record<string, unknown>>(object: T): T {
    return JSON.parse(JSON.stringify(object));
}

/**
 * Get next widgetId as a number
 *
 * @param isWidgetGroup if it is a group of widgets
 * @param project current project
 * @param offset offset if multiple widgets are created and not yet in project
 */
function getNewWidgetIdNumber(isWidgetGroup: boolean, project: Project, offset = 0): number  {
    const widgets: string[] = [];
    project = project || store.getState().visProject;
    Object.keys(project).forEach(view =>
        project[view].widgets && Object.keys(project[view].widgets).forEach(widget =>
            widgets.push(widget)));
    let newKey = 1;
    widgets.forEach(name => {
        const matches = isWidgetGroup ? name.match(/^g([0-9]+)$/) : name.match(/^w([0-9]+)$/);
        if (matches) {
            const num = parseInt(matches[1], 10);
            if (num >= newKey) {
                newKey = num + 1;
            }
        }
    });

    return newKey + offset;
}

/**
 * Get new widget id from the project
 * @param project project to determine next widget id for
 * @param offset offset, if multiple widgets are created and not yet in the project
 * @return {string}
 */
export function getNewWidgetId(project: Project, offset = 0): string {
    const newKey = getNewWidgetIdNumber(false, project, offset);

    return `w${(newKey).toString().padStart(6, '0')}`;
}

/**
 * Get new group id from the project
 * @param project project to determine next group id for
 * @param offset offset, if multiple groups are created and not yet in the project
 */
export function getNewGroupId(project: Project, offset = 0): string {
    const newKey = getNewWidgetIdNumber(true, project, offset);

    return `g${newKey.toString().padStart(6, '0')}`;
}
