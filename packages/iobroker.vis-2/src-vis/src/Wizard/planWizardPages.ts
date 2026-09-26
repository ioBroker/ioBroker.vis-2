import type {
    AnyWidgetId,
    Project,
    SingleWidget,
    SingleWidgetId,
    ViewSection,
    ViewSettings,
    WidgetStyle,
} from '@iobroker/types-vis-2';

import type { GridCellSpan } from '@/Vis/visGridLayout';

import { NO_GROUP_ID, type WizardDevice, type WizardEnum } from './deviceDetection';
import { getDeviceWidget, getSkipReason, type DeviceWidgetOptions, type SkipReason } from './deviceWidgets';

/** Whether the devices are grouped by the rooms they are in or by what they do */
export type WizardGrouping = 'room' | 'function';

/** Whether everything lands on one page or every group gets a page of its own */
export type WizardPages = 'single' | 'perGroup';

export interface WizardPlanOptions extends DeviceWidgetOptions {
    grouping: WizardGrouping;
    pages: WizardPages;
    /** The groups the devices are sorted into, in the order their sections appear */
    groups: WizardEnum[];
    /** The name of the section - and of the page - the devices without a room or function land in */
    withoutGroupName: string;
    /** The name of the page, if everything lands on one */
    pageName: string;
    /** The names of the views that exist already, so the pages get names of their own */
    existingNames: string[];
    /** The number the first widget gets its id from; see `getNewWidgetId` */
    firstWidgetNumber: number;
    /** How many cells a widget of this type occupies; see `getDefaultGridSpan` */
    getSpan: (tpl: string) => GridCellSpan;
    /** The look of the sections: a card, or nothing around the widgets */
    sectionVariant?: 'panel' | 'plain';
}

export interface WizardPlanPage {
    /** The name the view gets, unique within the project */
    name: string;
    settings: ViewSettings;
    widgets: Record<SingleWidgetId, SingleWidget>;
}

export interface WizardPlanSkip {
    device: WizardDevice;
    reason: SkipReason;
}

export interface WizardPlan {
    pages: WizardPlanPage[];
    skipped: WizardPlanSkip[];
    /** How many widgets the plan creates */
    widgetCount: number;
    /** How many sections the plan creates */
    sectionCount: number;
}

/** The devices of one group, in the order they are shown */
interface PlannedGroup {
    group: WizardEnum;
    devices: WizardDevice[];
}

/** `Kitchen`, `Kitchen 2`, `Kitchen 3`: a name no view of the project carries yet */
function uniqueName(name: string, taken: string[]): string {
    const wanted = (name || '').trim() || 'view';
    if (!taken.includes(wanted)) {
        return wanted;
    }
    let index = 2;
    while (taken.includes(`${wanted} ${index}`)) {
        index++;
    }
    return `${wanted} ${index}`;
}

/** An icon of a section is stored as an `icon64`, so only one that is in the project itself can be taken over */
function icon64(icon: string | undefined): string | undefined {
    return icon?.startsWith('data:') ? icon : undefined;
}

/**
 * Sort the devices into their groups.
 *
 * The groups keep the order they are given - the order of the enumeration - and the devices the order they were
 * found in. Everything that is in no group of the grouping lands in one group at the end, so nothing is lost.
 *
 * @param devices - the devices to sort
 * @param options - what is grouped by, and the groups themselves
 */
export function groupDevices(devices: WizardDevice[], options: WizardPlanOptions): PlannedGroup[] {
    const byId = new Map<string, PlannedGroup>();
    const result: PlannedGroup[] = [];

    const add = (group: WizardEnum): PlannedGroup => {
        let planned = byId.get(group.id);
        if (!planned) {
            planned = { group, devices: [] };
            byId.set(group.id, planned);
            result.push(planned);
        }
        return planned;
    };

    // the groups first, so their order is the one of the enumeration and not the one the devices came in
    options.groups.forEach(add);

    for (const device of devices) {
        const groupId = options.grouping === 'room' ? device.roomId : device.functionId;
        const group = options.groups.find(g => g.id === groupId) || { id: NO_GROUP_ID, name: options.withoutGroupName };
        add(group).devices.push(device);
    }

    return result.filter(planned => planned.devices.length);
}

/** The style that puts a widget into a cell of a section */
function gridStyle(span: GridCellSpan): WidgetStyle {
    return {
        position: 'relative',
        gridColumns: span.columns,
        gridRows: span.rows,
    };
}

/**
 * Work out the pages the wizard is going to create, without touching the project.
 *
 * What comes back is exactly what the preview shows and exactly what is written when the user says yes - the
 * planning happens once, not twice. It is plain data and pure, so its tests need neither a socket nor a view.
 *
 * @param devices - the devices the user picked
 * @param options - how the pages are built
 */
export function planWizardPages(devices: WizardDevice[], options: WizardPlanOptions): WizardPlan {
    const skipped: WizardPlanSkip[] = [];
    const taken = [...options.existingNames];
    const pages: WizardPlanPage[] = [];
    let widgetNumber = options.firstWidgetNumber;
    let sectionCount = 0;
    let widgetCount = 0;

    const newPage = (name: string, wizardId?: string): WizardPlanPage => {
        const page: WizardPlanPage = {
            name: uniqueName(name, taken),
            settings: { style: {}, layout: 'grid', sections: [], order: [] },
            widgets: {},
        };
        if (wizardId) {
            page.settings.wizardId = wizardId;
        }
        taken.push(page.name);
        pages.push(page);
        return page;
    };

    const single = options.pages === 'single' ? newPage(options.pageName) : null;

    for (const planned of groupDevices(devices, options)) {
        const page = single || newPage(planned.group.name || options.withoutGroupName, planned.group.id);

        const section: ViewSection = {
            id: `s${(page.settings.sections?.length || 0) + 1}`,
            widgets: [],
            title: planned.group.name || options.withoutGroupName,
            variant: options.sectionVariant || 'panel',
        };
        const groupIcon = icon64(planned.group.icon);
        if (groupIcon) {
            section.icon = groupIcon;
        }
        if (planned.group.color) {
            section.iconColor = planned.group.color;
        }
        if (planned.group.id) {
            section.wizardId = planned.group.id;
        }

        for (const device of planned.devices) {
            const spec = getDeviceWidget(device, options);
            if (!spec) {
                skipped.push({ device, reason: getSkipReason(device) || 'no-widget' });
                continue;
            }

            const wid: SingleWidgetId = `w${widgetNumber.toString().padStart(6, '0')}`;
            widgetNumber++;
            widgetCount++;

            page.widgets[wid] = {
                tpl: spec.tpl,
                widgetSet: spec.widgetSet,
                data: { ...spec.data, bindings: [] },
                style: { ...gridStyle(options.getSpan(spec.tpl)), bindings: [] },
            };

            section.widgets.push(wid);
            (page.settings.order as AnyWidgetId[]).push(wid);
        }

        if (!section.widgets.length) {
            continue;
        }

        page.settings.sections!.push(section);
        sectionCount++;

        // a page of its own for a room is reached through the navigation, so it brings its entry along
        if (!single) {
            page.settings.navigation = true;
            page.settings.navigationTitle = planned.group.name || options.withoutGroupName;
            if (groupIcon) {
                page.settings.navigationIcon = groupIcon;
            }
            if (planned.group.color) {
                page.settings.navigationColor = planned.group.color;
            }
        }
    }

    // a page without a single widget helps nobody
    return {
        pages: pages.filter(page => page.settings.sections?.length),
        skipped,
        widgetCount,
        sectionCount,
    };
}

/**
 * Write the planned pages into a project.
 *
 * The project it is given is the one that is stored afterwards, so everything the wizard creates is one change
 * and one step of the undo. The pages are opened as tabs as well, the way a page added by hand is.
 *
 * @param project - the project the pages are written into; it is changed, so hand over a copy
 * @param plan - what `planWizardPages` worked out
 */
export function applyWizardPlan(project: Project, plan: WizardPlan): Project {
    for (const page of plan.pages) {
        project[page.name] = {
            name: page.name,
            parentId: undefined,
            settings: page.settings,
            widgets: page.widgets,
            activeWidgets: [],
            filterList: [],
            rerender: false,
        };

        const opened = project.___settings.openedViews;
        if (opened && !opened.includes(page.name)) {
            opened.push(page.name);
        }
    }

    return project;
}
