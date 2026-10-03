import { describe, expect, it } from 'vitest';

import { Types } from '@iobroker/type-detector';

import type { Project } from '@iobroker/types-vis-2';

import type { WizardDevice, WizardEnum } from './deviceDetection';
import { applyWizardPlan, planWizardPages, type WizardPlanOptions } from './planWizardPages';

const ROOMS: WizardEnum[] = [
    { id: 'enum.rooms.living', name: 'Living room', color: '#123456', icon: 'data:image/svg+xml;base64,AAA' },
    { id: 'enum.rooms.kitchen', name: 'Kitchen' },
];

function device(id: string, type: Types, roomId: string, functionId = ''): WizardDevice {
    return {
        id,
        type,
        name: id.split('.').pop() as string,
        roomId,
        functionId,
        states: [
            {
                id,
                name: 'SET',
                common: { name: id, type: 'boolean', role: 'switch', read: true, write: true },
            },
        ],
    };
}

const DEVICES: WizardDevice[] = [
    device('hm.0.living.lamp', Types.light, 'enum.rooms.living', 'enum.functions.light'),
    device('hm.0.living.socket', Types.socket, 'enum.rooms.living'),
    device('hm.0.kitchen.lamp', Types.light, 'enum.rooms.kitchen', 'enum.functions.light'),
    device('hm.0.cellar.lamp', Types.light, ''),
];

function options(overrides?: Partial<WizardPlanOptions>): WizardPlanOptions {
    return {
        grouping: 'room',
        pages: 'single',
        groups: ROOMS,
        withoutGroupName: 'Without room',
        pageName: 'Devices',
        existingNames: [],
        firstWidgetNumber: 1,
        getSpan: () => ({ columns: 6, rows: 2 }),
        ...overrides,
    };
}

describe('planWizardPages', () => {
    it('puts every room into a section of one page', () => {
        const plan = planWizardPages(DEVICES, options());

        expect(plan.pages).toHaveLength(1);
        expect(plan.pages[0].name).toBe('Devices');
        expect(plan.pages[0].settings.layout).toBe('grid');
        expect(plan.sectionCount).toBe(3);
        expect(plan.widgetCount).toBe(4);

        const sections = plan.pages[0].settings.sections!;
        expect(sections.map(section => section.title)).toEqual(['Living room', 'Kitchen', 'Without room']);
        expect(sections.map(section => section.widgets.length)).toEqual([2, 1, 1]);
        expect(sections[0].wizardId).toBe('enum.rooms.living');
        expect(sections[0].iconColor).toBe('#123456');
        expect(sections[2].wizardId).toBeUndefined();
    });

    it('gives every widget a cell and the id it gets in the project', () => {
        const plan = planWizardPages(DEVICES, options());
        const page = plan.pages[0];

        expect(Object.keys(page.widgets)).toEqual(['w000001', 'w000002', 'w000003', 'w000004']);
        expect(page.widgets.w000001.style.position).toBe('relative');
        expect(page.widgets.w000001.style.gridColumns).toBe(6);
        expect(page.widgets.w000001.style.gridRows).toBe(2);
        expect(page.widgets.w000001.widgetSet).toBe('relative');
        expect(page.settings.order).toEqual(['w000001', 'w000002', 'w000003', 'w000004']);
        // the sections name the widgets they hold, in the order they are shown
        expect(page.settings.sections![0].widgets).toEqual(['w000001', 'w000002']);
    });

    it('starts the widget ids where the project ends', () => {
        const plan = planWizardPages(DEVICES, options({ firstWidgetNumber: 42 }));

        expect(Object.keys(plan.pages[0].widgets)[0]).toBe('w000042');
    });

    it('makes a page per room and lets it into the navigation', () => {
        const plan = planWizardPages(DEVICES, options({ pages: 'perGroup' }));

        expect(plan.pages.map(page => page.name)).toEqual(['Living room', 'Kitchen', 'Without room']);
        expect(plan.pages[0].settings.wizardId).toBe('enum.rooms.living');
        expect(plan.pages[0].settings.navigation).toBe(true);
        expect(plan.pages[0].settings.navigationTitle).toBe('Living room');
        expect(plan.pages[0].settings.navigationIcon).toBe('data:image/svg+xml;base64,AAA');
        expect(plan.pages[0].settings.navigationColor).toBe('#123456');
        // every page holds the one section of its room
        expect(plan.pages[1].settings.sections!.map(section => section.title)).toEqual(['Kitchen']);
    });

    it('does not take a name a view of the project already has', () => {
        const plan = planWizardPages(DEVICES, options({ pages: 'perGroup', existingNames: ['Kitchen'] }));

        expect(plan.pages.map(page => page.name)).toEqual(['Living room', 'Kitchen 2', 'Without room']);
    });

    it('groups by function when that is asked for', () => {
        const functions: WizardEnum[] = [{ id: 'enum.functions.light', name: 'Light' }];
        const plan = planWizardPages(DEVICES, options({ grouping: 'function', groups: functions }));

        const sections = plan.pages[0].settings.sections!;
        expect(sections.map(section => section.title)).toEqual(['Light', 'Without room']);
        expect(sections[0].widgets).toHaveLength(2);
    });

    it('leaves out the rooms nothing was picked from', () => {
        const plan = planWizardPages([DEVICES[2]], options());

        expect(plan.pages[0].settings.sections!.map(section => section.title)).toEqual(['Kitchen']);
    });

    it('names what it passed over, and why', () => {
        // a position on a map is the kind of device neither of the two sets draws
        const where = device('gps.0.car', Types.location, 'enum.rooms.living');
        const plan = planWizardPages([DEVICES[0], where], options());

        expect(plan.widgetCount).toBe(1);
        expect(plan.skipped).toHaveLength(1);
        expect(plan.skipped[0].device.id).toBe('gps.0.car');
        expect(plan.skipped[0].reason).toBe('no-widget');
    });

    it('plans nothing when nothing is left to plan', () => {
        const plan = planWizardPages([], options());

        expect(plan.pages).toHaveLength(0);
        expect(plan.widgetCount).toBe(0);
    });
});

describe('planWizardPages into a page that is there already', () => {
    it('puts everything on that page and numbers its sections after the ones it has', () => {
        const plan = planWizardPages(DEVICES, options({ into: { name: 'Living room', sections: 2 } }));

        expect(plan.pages).toHaveLength(1);
        expect(plan.pages[0].name).toBe('Living room');
        expect(plan.pages[0].existing).toBe(true);
        expect(plan.pages[0].settings.sections!.map(section => section.id)).toEqual(['s3', 's4', 's5']);
    });

    it('leaves the navigation of that page alone', () => {
        const plan = planWizardPages(
            DEVICES,
            options({ pages: 'perGroup', into: { name: 'Living room', sections: 0 } }),
        );

        expect(plan.pages).toHaveLength(1);
        expect(plan.pages[0].settings.navigation).toBeUndefined();
        expect(plan.pages[0].settings.navigationTitle).toBeUndefined();
    });
});

describe('applyWizardPlan', () => {
    it('writes the pages into the project and opens them', () => {
        const project = {
            ___settings: { openedViews: ['Start'] },
            Start: { name: 'Start', settings: {}, widgets: {}, activeWidgets: [], filterList: [], rerender: false },
        } as unknown as Project;

        const plan = planWizardPages(DEVICES, options({ pages: 'perGroup', existingNames: ['Start'] }));
        applyWizardPlan(project, plan);

        expect(Object.keys(project)).toEqual(['___settings', 'Start', 'Living room', 'Kitchen', 'Without room']);
        expect(project['Living room'].widgets.w000001.tpl).toBe('tplRelSwitch');
        expect(project.___settings.openedViews).toEqual(['Start', 'Living room', 'Kitchen', 'Without room']);
    });

    it('adds to a page that is there already instead of writing over it', () => {
        const project = {
            ___settings: { openedViews: ['Start'] },
            Start: {
                name: 'Start',
                settings: {
                    layout: 'grid',
                    navigation: true,
                    navigationTitle: 'Home',
                    sections: [{ id: 's1', widgets: ['w000100'], title: 'Already there' }],
                    order: ['w000100'],
                },
                widgets: { w000100: { tpl: 'tplRelText', data: {}, style: {} } },
                activeWidgets: [],
                filterList: [],
                rerender: false,
            },
        } as unknown as Project;

        const plan = planWizardPages(
            [DEVICES[0]],
            options({ existingNames: ['Start'], into: { name: 'Start', sections: 1 }, firstWidgetNumber: 200 }),
        );
        applyWizardPlan(project, plan);

        // no second page, and the one that was there keeps its name, its navigation and what stood on it
        expect(Object.keys(project)).toEqual(['___settings', 'Start']);
        expect(project.Start.settings.navigationTitle).toBe('Home');
        expect(project.Start.settings.sections!.map(s => s.id)).toEqual(['s1', 's2']);
        expect(project.Start.settings.sections![0].title).toBe('Already there');
        expect(Object.keys(project.Start.widgets)).toEqual(['w000100', 'w000200']);
        expect(project.Start.settings.order).toEqual(['w000100', 'w000200']);
        expect(project.___settings.openedViews).toEqual(['Start']);
    });
});
