import { I18n, type Connection } from '@iobroker/gui-components';

import type { AnyWidgetId, Project, SingleWidgetId, ViewSection, WidgetData, WidgetStyle } from '@iobroker/types-vis-2';

import { store } from '@/Store';
import { deepClone, getNewWidgetIdNumber } from '@/Utilities/utils';
import { getWidgetTypes } from '@/Vis/visWidgetsCatalog';

import type { AiToolDefinition } from './aiTypes';

/**
 * What the assistant can do in the editor.
 *
 * Everything it knows about the installation and everything it changes goes through one of these. A
 * tool is a small, named thing with a schema, which is the only way a model can be relied on to hit
 * the target: "put a switch on the page" is a wish, `add_widget({view, tpl, data})` is an instruction
 * that either works or says why not.
 *
 * Two rules hold for all of them. The reading tools answer short - a model that is handed nine
 * thousand objects spends its whole context on them and gets worse, not better - and the writing
 * tools go through the same project copy as every other change of the editor, so undo works and the
 * project is saved once at the end rather than after every widget.
 */

/** What a tool needs from the editor to do its work */
export interface AiToolContext {
    socket: Connection;
    /** The project as it is now; a tool changes this copy */
    project: Project;
    /** Something was changed and the project has to be stored */
    changed: () => void;
    /** Show this view in the editor */
    openView: (view: string) => void;
    /** Select these widgets in the editor, so the user sees what was done */
    select: (view: string, widgets: AnyWidgetId[]) => void;
    /** The view the user is looking at */
    selectedView: string;
}

/** What a tool call gives back: text for the model, and a line for the user */
export interface AiToolResult {
    /** What the model is told; JSON in all but the simplest cases */
    content: string;
    /** What the panel shows the user, like `Seite Küche angelegt` */
    action?: string;
}

export const AI_TOOLS: AiToolDefinition[] = [
    {
        type: 'function',
        function: {
            name: 'list_views',
            description:
                'All pages of the project with their layout, their number of widgets and their sections. Start here.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'read_view',
            description:
                'Everything on one page: its settings, its sections and every widget with its type and its set attributes.',
            parameters: {
                type: 'object',
                properties: { view: { type: 'string', description: 'The name of the page' } },
                required: ['view'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_widget_types',
            description:
                'The widget types that can be placed, by set. Without a set only the sets and how many types each holds.',
            parameters: {
                type: 'object',
                properties: {
                    set: {
                        type: 'string',
                        description:
                            'The set to list, like `relative`, `absolute` or `basic`. Leave it out for the overview.',
                    },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'describe_widget_type',
            description:
                'Every attribute of one widget type: its name, what it is for, and which values it takes. Read this before placing a type you have not used yet.',
            parameters: {
                type: 'object',
                properties: { tpl: { type: 'string', description: 'The type, like `tplRelSwitch`' } },
                required: ['tpl'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'search_objects',
            description:
                'States of the installation by name, id or role. Use this to find the datapoint a widget should show.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Part of an id, of a name, or of a role' },
                    role: { type: 'string', description: 'Only states of this role, like `switch` or `level.dimmer`' },
                    limit: { type: 'number', description: 'At most this many, 30 by default' },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_state',
            description: 'What a state holds at the moment.',
            parameters: {
                type: 'object',
                properties: { id: { type: 'string', description: 'The id of the state' } },
                required: ['id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_view',
            description: 'A new page. `grid` is the layout with sections that arranges itself; `absolute` is a plan.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'The name of the page' },
                    layout: { type: 'string', enum: ['grid', 'absolute'], description: 'grid by default' },
                    navigation: { type: 'boolean', description: 'The page gets an entry in the navigation' },
                },
                required: ['name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'add_section',
            description: 'A section of a page with the layout `grid`: a group of widgets under a heading.',
            parameters: {
                type: 'object',
                properties: {
                    view: { type: 'string' },
                    title: { type: 'string', description: 'The heading of the section' },
                },
                required: ['view', 'title'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'add_widget',
            description:
                'Put a widget on a page. On a page with sections it goes into a section; on a plan it needs a position in its style.',
            parameters: {
                type: 'object',
                properties: {
                    view: { type: 'string' },
                    tpl: { type: 'string', description: 'The type, like `tplRelSwitch`' },
                    data: { type: 'object', description: 'The attributes, like {"oid": "hue.0.lamp.on"}' },
                    style: {
                        type: 'object',
                        description: 'For a plan: left, top, width, height. Leave it out on a page with sections.',
                    },
                    section: { type: 'number', description: 'Which section, counted from 0; the last one by default' },
                },
                required: ['view', 'tpl'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_widget',
            description: 'Change the attributes or the position of a widget that is already there.',
            parameters: {
                type: 'object',
                properties: {
                    view: { type: 'string' },
                    id: { type: 'string', description: 'The id of the widget, like `w000012`' },
                    data: { type: 'object', description: 'The attributes to change; the others stay' },
                    style: { type: 'object', description: 'The style to change' },
                },
                required: ['view', 'id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_widget',
            description: 'Take a widget off a page.',
            parameters: {
                type: 'object',
                properties: { view: { type: 'string' }, id: { type: 'string' } },
                required: ['view', 'id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'open_view',
            description: 'Show a page in the editor, so the user sees what was built.',
            parameters: {
                type: 'object',
                properties: { view: { type: 'string' } },
                required: ['view'],
            },
        },
    },
];

/** The text of a name that may be given in several languages */
function getText(text: ioBroker.StringOrTranslated | undefined): string {
    if (!text) {
        return '';
    }
    return typeof text === 'object' ? text[I18n.getLanguage()] || text.en || '' : text;
}

/** The widgets of a view, short enough for a model to read */
function describeWidgets(project: Project, view: string): unknown[] {
    const widgets = project[view]?.widgets || {};
    return Object.keys(widgets).map(id => {
        const widget = widgets[id as AnyWidgetId];
        // only what was actually set: a widget carries every attribute it knows, mostly empty
        const data: Record<string, unknown> = {};
        Object.keys(widget.data || {}).forEach(key => {
            const value = widget.data[key];
            if (value !== '' && value !== undefined && value !== null && key !== 'bindings') {
                data[key] = value;
            }
        });
        return { id, tpl: widget.tpl, data, style: widget.style };
    });
}

/** A name that is not taken yet */
function uniqueViewName(project: Project, wanted: string): string {
    const name = wanted.trim() || 'View';
    if (!project[name]) {
        return name;
    }
    let index = 2;
    while (project[`${name} ${index}`]) {
        index++;
    }
    return `${name} ${index}`;
}

/**
 * Do what the model asked for.
 *
 * Everything that can go wrong is answered as text rather than thrown: a model that is told
 * `View "Kitchen" does not exist` tries the right name next, one that gets an exception gets nothing.
 *
 * @param name - which tool
 * @param args - what it was called with
 * @param context - what the tool may use and change
 */
export async function runTool(name: string, args: Record<string, any>, context: AiToolContext): Promise<AiToolResult> {
    const { project } = context;

    switch (name) {
        case 'list_views': {
            const views = Object.keys(project)
                .filter(view => view !== '___settings')
                .map(view => ({
                    name: view,
                    layout: project[view].settings?.layout || 'absolute',
                    widgets: Object.keys(project[view].widgets || {}).length,
                    sections: (project[view].settings?.sections || []).map((section: ViewSection) => section.title),
                    navigation: !!project[view].settings?.navigation,
                }));
            return { content: JSON.stringify({ views, open: context.selectedView }) };
        }

        case 'read_view': {
            const view = args.view as string;
            if (!project[view]) {
                return { content: `There is no page "${view}"` };
            }
            return {
                content: JSON.stringify({
                    name: view,
                    settings: project[view].settings,
                    widgets: describeWidgets(project, view),
                }),
            };
        }

        case 'list_widget_types': {
            const types = getWidgetTypes();
            if (!args.set) {
                const sets: Record<string, number> = {};
                types.forEach(type => {
                    const set = type.set || 'unknown';
                    sets[set] = (sets[set] || 0) + 1;
                });
                return {
                    content: JSON.stringify({
                        sets,
                        hint: 'The sets `relative` (tiles for a page with sections) and `absolute` (markers for a plan) are the ones to build with.',
                    }),
                };
            }
            const list = types
                .filter(type => type.set === args.set)
                .map(type => ({
                    tpl: type.name,
                    label: type.label ? I18n.t(type.label) : type.title,
                    help: type.help ? I18n.t(type.help) : undefined,
                }));
            return { content: JSON.stringify(list) };
        }

        case 'describe_widget_type': {
            const type = getWidgetTypes().find(one => one.name === args.tpl);
            if (!type) {
                return { content: `There is no widget type "${args.tpl}"` };
            }
            const groups = Array.isArray(type.params) ? type.params : [];
            const fields = groups.flatMap(group =>
                (group.fields || []).map((field: any) => ({
                    name: field.name,
                    type: field.type || 'text',
                    label: field.label ? I18n.t(field.label) : undefined,
                    options: Array.isArray(field.options)
                        ? field.options.map((option: any) => (typeof option === 'string' ? option : option.value))
                        : undefined,
                    default: field.default,
                })),
            );
            return { content: JSON.stringify({ tpl: type.name, set: type.set, fields }) };
        }

        case 'search_objects': {
            const query = (args.query || '').toString().toLowerCase();
            const role = (args.role || '').toString().toLowerCase();
            const limit = Math.min(Number(args.limit) || 30, 100);

            const objects = await context.socket.getObjectViewSystem('state', '', '香');
            const found: unknown[] = [];
            for (const id of Object.keys(objects)) {
                const obj = objects[id];
                const common = obj?.common;
                if (!common) {
                    continue;
                }
                const objectName = getText(common.name).toLowerCase();
                const objectRole = (common.role || '').toLowerCase();
                if (role && objectRole !== role) {
                    continue;
                }
                if (
                    query &&
                    !id.toLowerCase().includes(query) &&
                    !objectName.includes(query) &&
                    !objectRole.includes(query)
                ) {
                    continue;
                }
                found.push({
                    id,
                    name: getText(common.name),
                    type: common.type,
                    role: common.role,
                    unit: common.unit,
                    min: common.min,
                    max: common.max,
                    write: common.write,
                    states: common.states,
                });
                if (found.length >= limit) {
                    break;
                }
            }
            return { content: JSON.stringify({ found: found.length, states: found }) };
        }

        case 'get_state': {
            const state = await context.socket.getState(args.id as string);
            return { content: JSON.stringify({ id: args.id, value: state?.val ?? null, ack: state?.ack }) };
        }

        case 'create_view': {
            const view = uniqueViewName(project, args.name as string);
            const grid = args.layout !== 'absolute';
            project[view] = {
                name: view,
                parentId: undefined,
                settings: {
                    style: {},
                    ...(grid ? { layout: 'grid', sections: [], order: [] } : {}),
                    ...(args.navigation ? { navigation: true, navigationTitle: view } : {}),
                },
                widgets: {},
                activeWidgets: [],
                filterList: [],
                rerender: false,
            } as any;

            const opened = project.___settings.openedViews;
            if (opened && !opened.includes(view)) {
                opened.push(view);
            }
            context.changed();
            return { content: `The page "${view}" was created`, action: `Seite „${view}" angelegt` };
        }

        case 'add_section': {
            const view = args.view as string;
            if (!project[view]) {
                return { content: `There is no page "${view}"` };
            }
            const settings = project[view].settings as any;
            if (settings.layout !== 'grid') {
                return { content: `The page "${view}" has no sections: it is a plan, not a grid` };
            }
            settings.sections ||= [];
            const section: ViewSection = {
                id: `s${settings.sections.length + 1}`,
                widgets: [],
                title: args.title as string,
                variant: 'panel',
            };
            settings.sections.push(section);
            context.changed();
            return {
                content: `The section "${section.title}" was added as number ${settings.sections.length - 1}`,
                action: `Abschnitt „${section.title}" angelegt`,
            };
        }

        case 'add_widget': {
            const view = args.view as string;
            if (!project[view]) {
                return { content: `There is no page "${view}"` };
            }
            const type = getWidgetTypes().find(one => one.name === args.tpl);
            if (!type) {
                return { content: `There is no widget type "${args.tpl}"` };
            }

            const id: SingleWidgetId = `w${getNewWidgetIdNumber(false, project).toString().padStart(6, '0')}`;
            const settings = project[view].settings as any;
            const grid = settings.layout === 'grid';

            project[view].widgets[id] = {
                tpl: type.name,
                widgetSet: type.set,
                data: { ...(args.data || {}), bindings: [] } as WidgetData,
                style: {
                    // a tile of a grid takes its place from the section; a widget on a plan needs one
                    ...(grid ? {} : { position: 'absolute', width: 200, height: 120, left: 20, top: 20 }),
                    ...(type.style || {}),
                    ...((args.style as WidgetStyle) || {}),
                    bindings: [],
                } as WidgetStyle,
            } as any;

            if (grid) {
                settings.sections ||= [];
                if (!settings.sections.length) {
                    settings.sections.push({ id: 's1', widgets: [], title: view, variant: 'panel' });
                }
                const index =
                    args.section === undefined
                        ? settings.sections.length - 1
                        : Math.max(0, Math.min(Number(args.section), settings.sections.length - 1));
                settings.sections[index].widgets.push(id);
                settings.order ||= [];
                settings.order.push(id);
            }

            context.changed();
            return {
                content: `The widget was added as "${id}"`,
                action: `${type.label ? I18n.t(type.label) : type.name} auf „${view}" gesetzt`,
            };
        }

        case 'update_widget': {
            const view = args.view as string;
            const id = args.id as AnyWidgetId;
            const widget = project[view]?.widgets?.[id];
            if (!widget) {
                return { content: `There is no widget "${id}" on the page "${view}"` };
            }
            if (args.data) {
                Object.assign(widget.data, args.data);
            }
            if (args.style) {
                Object.assign(widget.style, args.style);
            }
            context.changed();
            return { content: `The widget "${id}" was changed`, action: `Widget ${id} geändert` };
        }

        case 'delete_widget': {
            const view = args.view as string;
            const id = args.id as AnyWidgetId;
            if (!project[view]?.widgets?.[id]) {
                return { content: `There is no widget "${id}" on the page "${view}"` };
            }
            delete project[view].widgets[id];
            const settings = project[view].settings as any;
            (settings.sections || []).forEach((section: ViewSection) => {
                section.widgets = section.widgets.filter(one => one !== id);
            });
            if (settings.order) {
                settings.order = settings.order.filter((one: AnyWidgetId) => one !== id);
            }
            context.changed();
            return { content: `The widget "${id}" was removed`, action: `Widget ${id} entfernt` };
        }

        case 'open_view': {
            const view = args.view as string;
            if (!project[view]) {
                return { content: `There is no page "${view}"` };
            }
            context.openView(view);
            return { content: `The page "${view}" is now open in the editor` };
        }

        default:
            return { content: `There is no tool called "${name}"` };
    }
}

/**
 * A copy of the project to work on.
 *
 * Every tool of one turn changes the same copy, and it is stored once at the end: a page with twelve
 * widgets is one step of the undo, not thirteen.
 */
export function projectCopy(): Project {
    return deepClone(store.getState().visProject);
}
