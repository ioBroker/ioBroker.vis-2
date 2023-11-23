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
