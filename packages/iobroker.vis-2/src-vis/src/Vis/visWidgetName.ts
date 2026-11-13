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
 * The name a widget has in the editor, and where it is kept.
 *
 * The editor keeps the name of a widget in `data.name`, as vis-1 did. A widget is free to have an attribute of its
 * own called `name` - the person a greeting is for, the name of a calendar - and then both are one value: the name
 * typed in the editor became the content of the widget ("Good day, Greeting (heading),"), and what was typed as the
 * content became the name of the widget in every list of the editor.
 *
 * A widget with an attribute `name` of its own keeps its name in the editor in `data.widgetName` instead. Every other
 * widget keeps it where it always was, so nothing moves in the projects that exist.
 */

/** Where the name is kept for a widget that has an attribute `name` of its own */
export const OWN_NAME_ATTR = 'widgetName';

/**
 * The name of a widget in the editor: in the lists, on its name plate, in the menu.
 *
 * @param data - the data of the widget
 * @returns the name, or an empty string if it has none
 */
export function getWidgetName(data: Record<string, any> | null | undefined): string {
    const name = data?.[OWN_NAME_ATTR] || data?.name;
    return typeof name === 'string' ? name : name ? `${name}` : '';
}

/**
 * Whether the attributes of a widget have one called `name`, which then is not the name of the widget.
 *
 * @param groups - the groups of attributes of the widget, as the editor parsed them
 */
export function hasOwnNameAttribute(groups: { fields?: { name?: string }[] }[] | null | undefined): boolean {
    return !!groups?.some(group => group.fields?.some(field => field.name === 'name'));
}

/**
 * Where the editor keeps the name of a widget.
 *
 * @param ownName - the widget has an attribute `name` of its own, see {@link hasOwnNameAttribute}
 */
export function widgetNameAttr(ownName: boolean): string {
    return ownName ? OWN_NAME_ATTR : 'name';
}
