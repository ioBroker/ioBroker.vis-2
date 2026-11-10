/**
 * Moving views, sections and widgets from one place to another: copying them inside the project, and exporting and
 * importing them as JSON.
 *
 * The ID of a widget is unique in the whole project, so whatever is put somewhere gets new IDs for its widgets, and
 * everything that refers to a widget by its ID follows: the members of the groups, a widget that another one shows in
 * itself, the sections of the grid layout and the order of the relative widgets.
 */
import type { AnyWidgetId, GroupWidget, Project, View, ViewSection, Widget } from '@iobroker/types-vis-2';
import { deepClone, getNewWidgetId, isGroup, pasteGroup } from '@/Utilities/utils';
import { newSectionId } from '@/Vis/visGridLayout';

/** The views a text to import holds, by name - or why it holds none */
export type ViewImport = { views: Record<string, View>; error?: undefined } | { views?: undefined; error: string };

/** What is copied, exported and imported of a section of the grid layout */
export interface SectionTransfer {
    section: ViewSection;
    /** The widgets of the section, the members of their groups and the widgets they show in themselves */
    widgets: Record<string, Widget>;
}

/** The sections a text to import holds, by a name to show - or why it holds none */
export type SectionImport =
    | { sections: Record<string, SectionTransfer>; error?: undefined }
    | { sections?: undefined; error: string };

function isPlainObject(value: unknown): value is Record<string, any> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isView(value: unknown): value is View {
    return isPlainObject(value) && isPlainObject(value.widgets);
}

function isSectionTransfer(value: unknown): value is SectionTransfer {
    return (
        isPlainObject(value) &&
        isPlainObject(value.section) &&
        isPlainObject(value.widgets) &&
        // a view has widgets too, but its sections are in the settings
        !isPlainObject(value.settings)
    );
}

/**
 * A widget the editor shows in a view only because another view shares it ("multi-views"). It lives in the project
 * only while the editor shows it and is not saved, see syncMultipleWidgets() - so it is never copied.
 *
 * @param wid - the ID of the widget
 */
function isMultiViewCopy(wid: string): boolean {
    return wid.includes('_');
}

/** The sections of the grid layout of a view, as they are stored */
function getSections(view: View | undefined | null): ViewSection[] {
    const sections = view?.settings?.sections;
    return Array.isArray(sections) ? sections.filter(section => isPlainObject(section)) : [];
}

/**
 * The name of the file something is exported to.
 *
 * @param name - the name of what is exported
 */
export function getViewFileName(name: string): string {
    // the characters that Windows does not allow in a file name
    const fileName = name.replace(/[\\/:*?"<>|]+/g, '_').trim();
    return `${fileName || 'view'}.json`;
}

/**
 * The widgets that come along when these widgets are copied: themselves, the members of their groups, and the
 * widgets they show in themselves - in an attribute `widget`, `widget1`... that holds an ID, see findWidgetUsages().
 *
 * @param widgets - the widgets of the view
 * @param ids - the widgets to copy
 */
export function collectWidgets(widgets: Record<string, Widget>, ids: string[]): string[] {
    const result: string[] = [];
    const queue = [...ids];
    while (queue.length) {
        const wid = queue.shift()!;
        const widget = widgets[wid];
        if (result.includes(wid) || !isPlainObject(widget) || isMultiViewCopy(wid)) {
            continue;
        }
        result.push(wid);
        if (isGroup(widget) && Array.isArray(widget.data?.members)) {
            queue.push(...widget.data.members);
        }
        if (isPlainObject(widget.data)) {
            for (const [attr, value] of Object.entries(widget.data)) {
                if (attr.startsWith('widget') && typeof value === 'string' && isPlainObject(widgets[value])) {
                    queue.push(value);
                }
            }
        }
    }
    return result;
}

/**
 * Copy widgets into a view, each with a new ID, together with what comes along with them, see collectWidgets().
 * The members of a copied group belong to the copy of the group, and a widget that says it is in a group, which
 * is not copied or does not list it, becomes a widget of its own.
 *
 * @param project - the project with the view; it is changed
 * @param viewName - the view to copy the widgets into
 * @param source - the widgets to copy from; they are not changed
 * @param ids - the widgets to copy
 * @returns the new ID of every copied widget, by its old one
 */
export function copyWidgetsInto(
    project: Project,
    viewName: string,
    source: Record<string, Widget>,
    ids: string[],
): Record<string, AnyWidgetId> {
    const target = project[viewName].widgets as Record<string, Widget>;
    const copied = collectWidgets(source, ids);

    // the members of the copied groups; they are copied together with their group
    const members = new Set<string>();
    for (const wid of copied) {
        const widget = source[wid];
        if (isGroup(widget) && Array.isArray(widget.data?.members)) {
            widget.data.members.forEach(member => members.add(member));
        }
    }

    const newIds: Record<string, AnyWidgetId> = {};
    for (const wid of copied) {
        const widget = deepClone(source[wid]);
        if (isGroup(widget)) {
            const group: GroupWidget = widget;
            group.data = isPlainObject(group.data) ? group.data : ({} as GroupWidget['data']);
            const oldMembers = (Array.isArray(group.data.members) ? group.data.members : []).filter(
                member => isPlainObject(source[member]) && !isMultiViewCopy(member),
            );
            // `pasteGroup` puts the new IDs into this list, in the same order
            group.data.members = [...oldMembers];
            newIds[wid] = pasteGroup({ group, widgets: target, groupMembers: source, project });
            oldMembers.forEach((member, i) => (newIds[member] = group.data.members[i]));
        } else if (!members.has(wid)) {
            delete widget.groupid;
            delete widget.grouped;
            const newId = getNewWidgetId(project);
            target[newId] = widget;
            newIds[wid] = newId;
        }
    }

    // a widget that shows another one in itself shows the copy of it
    for (const newId of Object.values(newIds)) {
        const data = target[newId]?.data as Record<string, unknown> | undefined;
        if (isPlainObject(data)) {
            for (const [attr, value] of Object.entries(data)) {
                if (attr.startsWith('widget') && typeof value === 'string' && newIds[value]) {
                    data[attr] = newIds[value];
                }
            }
        }
    }

    return newIds;
}

/**
 * The IDs in a list that were copied, by their new IDs; the others are dropped.
 *
 * @param list - a list of widget IDs, as it is stored
 * @param newIds - the new IDs, by the old ones
 */
function mapIds(list: unknown, newIds: Record<string, AnyWidgetId>): AnyWidgetId[] {
    return Array.isArray(list) ? list.map(wid => newIds[wid as string]).filter(Boolean) : [];
}

// ---------------------------------------------------------------------------------------------------- views

/**
 * What is exported of a view: the view without what only means something in its project - the folder it is in,
 * the widgets that are selected and the widgets shared from other views - but with its name, so that the import
 * can offer it again.
 *
 * @param project - the project with the view
 * @param viewName - the name of the view
 */
export function getViewExport(project: Project, viewName: string): View {
    const { parentId: _parentId, activeWidgets: _activeWidgets, name: _name, ...view } = deepClone(project[viewName]);
    for (const wid of Object.keys(view.widgets || {})) {
        if (isMultiViewCopy(wid)) {
            delete view.widgets[wid as AnyWidgetId];
        }
    }
    return { name: viewName, ...view, activeWidgets: [] };
}

/**
 * Read the views out of a text to import.
 *
 * It is a single view, as the export writes it, or a whole project, like the `vis-views.json` of a project export,
 * from which every view can be taken. A view the export of an older version wrote has no name; it is listed under
 * an empty one.
 *
 * The error is an English sentence to translate, empty if there is no text at all.
 *
 * @param text - the JSON to import
 */
export function parseViewImport(text: string): ViewImport {
    if (!text.trim()) {
        return { error: '' };
    }

    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return { error: 'The text is not valid JSON' };
    }

    if (isView(data)) {
        return { views: { [typeof data.name === 'string' ? data.name : '']: data } };
    }

    if (Array.isArray(data)) {
        // what the export of widgets writes
        return { error: 'These are widgets. Import them with "Import widgets" into a view.' };
    }

    if (isPlainObject(data)) {
        const views: Record<string, View> = {};
        for (const [name, view] of Object.entries(data)) {
            if (!name.startsWith('___') && isView(view)) {
                views[name] = view;
            }
        }
        if (Object.keys(views).length) {
            return { views };
        }
    }

    return { error: 'No view found in the text' };
}

/**
 * Put a view into the project under a name, with new IDs for all its widgets. A view of that name is replaced.
 * What refers to a widget the view does not have is dropped.
 *
 * @param project - the project to put the view into; it is changed
 * @param viewName - the name of the view in the project
 * @param source - the view; it is not changed
 * @param parentId - the folder to put the view into, the root if not given
 */
export function insertView(project: Project, viewName: string, source: View, parentId?: string | null): void {
    const original = deepClone(source);
    const sourceWidgets: Record<string, Widget> = isPlainObject(original.widgets) ? original.widgets : {};

    const view: View = {
        ...original,
        name: viewName,
        settings: isPlainObject(original.settings) ? original.settings : { style: {} },
        widgets: {},
        activeWidgets: [],
        filterList: Array.isArray(original.filterList) ? original.filterList : [],
    };
    if (parentId) {
        view.parentId = parentId;
    } else {
        delete view.parentId;
    }
    // in the project before the first new ID is taken: every ID taken is then counted for the next one
    project[viewName] = view;

    const newIds = copyWidgetsInto(project, viewName, sourceWidgets, Object.keys(sourceWidgets));

    if (Array.isArray(view.settings.sections)) {
        view.settings.sections = view.settings.sections
            .filter(section => isPlainObject(section))
            .map(section => ({ ...section, widgets: mapIds(section.widgets, newIds) }));
    }
    if (Array.isArray(view.settings.order)) {
        view.settings.order = mapIds(view.settings.order, newIds);
    }
}

// ---------------------------------------------------------------------------------------------------- sections

/**
 * The name a section is shown with: its title, or its ID if it has none.
 *
 * @param section - the section
 */
export function getSectionLabel(section: ViewSection): string {
    return (typeof section.title === 'string' && section.title.trim()) || section.id;
}

/** Where a widget is in the grid layout: its section, and its place in the list of the section */
export interface SectionPlace {
    section: string;
    index: number;
}

/**
 * The section of the grid layout of a view that lists a widget, and where in that list it is.
 *
 * @param view - the view
 * @param wid - the widget
 */
export function findSectionPlace(view: View | undefined | null, wid: string): SectionPlace | null {
    for (const section of getSections(view)) {
        const index = Array.isArray(section.widgets) ? section.widgets.indexOf(wid as AnyWidgetId) : -1;
        if (index !== -1) {
            return { section: section.id, index };
        }
    }
    return null;
}

/**
 * The section of the grid layout of a view that lists a widget.
 *
 * @param view - the view
 * @param wid - the widget
 */
export function findSectionOf(view: View | undefined | null, wid: string): string | null {
    return findSectionPlace(view, wid)?.section ?? null;
}

/**
 * Put widgets into a section of the grid layout of a view: after a widget of the section, at a place in its list,
 * or at its end. The section stops listing the widgets the view does not have any more.
 *
 * @param view - the view; it is changed
 * @param sectionId - the section
 * @param wids - the widgets to put there
 * @param place - the widget to put them after, or their place in the list; at the end if not given or not there
 * @returns false if the view has no such section
 */
export function addToSection(
    view: View,
    sectionId: string,
    wids: AnyWidgetId[],
    place?: AnyWidgetId | number | null,
): boolean {
    const section = getSections(view).find(one => one.id === sectionId);
    if (!section) {
        return false;
    }
    const list = (Array.isArray(section.widgets) ? section.widgets : []).filter(
        wid => !wids.includes(wid) && view.widgets[wid],
    );
    let pos = list.length;
    if (typeof place === 'number') {
        pos = Math.max(0, Math.min(place, list.length));
    } else if (place && list.includes(place)) {
        pos = list.indexOf(place) + 1;
    }
    list.splice(pos, 0, ...wids);
    section.widgets = list;
    return true;
}

/**
 * Put the copies of widgets into the sections of their originals: after the original that comes last there, or -
 * if the originals were cut - where the first of them was.
 *
 * @param view - the view with the sections and the copies; it is changed
 * @param copies - for every copy: its original, itself, and where the original was
 */
export function placeCopiesInSections(
    view: View,
    copies: { from: string; to: AnyWidgetId; place: SectionPlace }[],
): void {
    const bySection = new Map<string, typeof copies>();
    for (const copy of copies) {
        bySection.set(copy.place.section, [...(bySection.get(copy.place.section) || []), copy]);
    }
    for (const [sectionId, list] of bySection) {
        // in the order of the originals, not in the order they were selected in
        list.sort((a, b) => a.place.index - b.place.index);
        const listed = getSections(view).find(one => one.id === sectionId)?.widgets || [];
        const after = [...listed].reverse().find(wid => list.some(copy => copy.from === wid));
        addToSection(
            view,
            sectionId,
            list.map(copy => copy.to),
            after ?? list[0].place.index,
        );
    }
}

/**
 * Take deleted widgets out of the sections of the grid layout and out of the order of the relative widgets. Their
 * IDs are given to new widgets again, which would otherwise turn up there.
 *
 * @param view - the view; it is changed
 * @param wids - the widgets that were deleted
 */
export function forgetWidgets(view: View, wids: string[]): void {
    const gone = new Set(wids);
    for (const section of getSections(view)) {
        if (Array.isArray(section.widgets) && section.widgets.some(wid => gone.has(wid))) {
            section.widgets = section.widgets.filter(wid => !gone.has(wid));
        }
    }
    if (Array.isArray(view.settings?.order) && view.settings.order.some(wid => gone.has(wid))) {
        view.settings.order = view.settings.order.filter(wid => !gone.has(wid));
    }
}

/**
 * What is copied or exported of a section of the grid layout: the section and the widgets that come along with it,
 * see collectWidgets().
 *
 * @param view - the view with the section
 * @param sectionId - the section
 */
export function getSectionTransfer(view: View | undefined | null, sectionId: string): SectionTransfer | null {
    const section = getSections(view).find(one => one.id === sectionId);
    if (!view || !section) {
        return null;
    }
    const widgets: Record<string, Widget> = isPlainObject(view.widgets) ? view.widgets : {};
    const result: Record<string, Widget> = {};
    collectWidgets(widgets, Array.isArray(section.widgets) ? section.widgets : []).forEach(
        wid => (result[wid] = deepClone(widgets[wid])),
    );
    return { section: deepClone(section), widgets: result };
}

/**
 * Put a section into the grid layout of a view, with a new ID and with new IDs for its widgets.
 *
 * @param project - the project with the view; it is changed
 * @param viewName - the view
 * @param transfer - the section and its widgets; they are not changed
 * @param index - where the section goes in the list of the sections; at the end if not given
 * @returns the ID of the new section
 */
export function insertSection(project: Project, viewName: string, transfer: SectionTransfer, index?: number): string {
    const view = project[viewName];
    if (!isPlainObject(view.settings)) {
        view.settings = { style: {} };
    }
    const sections: ViewSection[] = Array.isArray(view.settings.sections) ? view.settings.sections : [];
    const source = deepClone(transfer);
    const ids = Array.isArray(source.section.widgets) ? source.section.widgets : [];
    const newIds = copyWidgetsInto(project, viewName, isPlainObject(source.widgets) ? source.widgets : {}, ids);

    const section: ViewSection = { ...source.section, id: newSectionId(sections), widgets: mapIds(ids, newIds) };
    // the wizard finds the sections it built by this, and the copy is not one of them
    delete section.wizardId;

    const at = index === undefined || index < 0 || index > sections.length ? sections.length : index;
    sections.splice(at, 0, section);
    view.settings.sections = sections;
    return section.id;
}

/**
 * Remove a section of the grid layout of a view together with the widgets that came along when it was copied, see
 * getSectionTransfer(). A widget outside the section that showed one of them shows nothing any more.
 *
 * @param project - the project with the view; it is changed
 * @param viewName - the view
 * @param sectionId - the section
 */
export function removeSection(project: Project, viewName: string, sectionId: string): void {
    const view = project[viewName];
    const transfer = getSectionTransfer(view, sectionId);
    if (!transfer) {
        return;
    }
    const removed = new Set(Object.keys(transfer.widgets));
    removed.forEach(wid => delete view.widgets[wid as AnyWidgetId]);
    view.settings.sections = (view.settings.sections || []).filter(
        section => !isPlainObject(section) || section.id !== sectionId,
    );
    for (const widget of Object.values(view.widgets)) {
        if (isPlainObject(widget?.data)) {
            for (const [attr, value] of Object.entries(widget.data)) {
                if (attr.startsWith('widget') && typeof value === 'string' && removed.has(value)) {
                    widget.data[attr] = '';
                }
            }
        }
    }
}

/**
 * Read the sections out of a text to import.
 *
 * It is a single section, as the export writes it, a view, as its export writes it, or a whole project, like the
 * `vis-views.json` of a project export: every section of them can be taken. The error is an English sentence to
 * translate, empty if there is no text at all.
 *
 * @param text - the JSON to import
 */
export function parseSectionImport(text: string): SectionImport {
    if (!text.trim()) {
        return { error: '' };
    }

    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return { error: 'The text is not valid JSON' };
    }

    if (isSectionTransfer(data)) {
        return { sections: { [getSectionLabel(data.section)]: data } };
    }

    const sections: Record<string, SectionTransfer> = {};
    const addSectionsOf = (view: View, prefix: string): void => {
        for (const section of getSections(view)) {
            const transfer = getSectionTransfer(view, section.id);
            if (transfer) {
                let label = `${prefix}${getSectionLabel(section)}`;
                if (sections[label]) {
                    label = `${label} (${section.id})`;
                }
                sections[label] = transfer;
            }
        }
    };

    if (isView(data)) {
        addSectionsOf(data, '');
    } else if (isPlainObject(data)) {
        for (const [name, view] of Object.entries(data)) {
            if (!name.startsWith('___') && isView(view)) {
                addSectionsOf(view, `${name} / `);
            }
        }
    }
    if (Object.keys(sections).length) {
        return { sections };
    }

    if (Array.isArray(data)) {
        return { error: 'These are widgets. Import them with "Import widgets" into a view.' };
    }
    return { error: 'No section found in the text' };
}
