import { describe, expect, it } from 'vitest';

import type { Project } from '@iobroker/types-vis-2';

import { getServiceWidgets, type ServiceUser } from './visServiceWidgets';

const userGroups = {
    'system.group.family': { common: { members: ['system.user.anna'] } },
} as unknown as Record<string, ioBroker.Object>;

const anna: ServiceUser = { permissionsName: 'Anna', id: 'anna', userGroups };
const guest: ServiceUser = { permissionsName: 'Guest', id: 'guest', userGroups };

function phone(data: Record<string, unknown> = {}, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return { tpl: 'tplAsteriskPhone', widgetSet: 'intercom', data: { extension: '100', ...data }, style: {}, ...extra };
}

function project(): Project {
    return {
        ___settings: {},
        door: {
            settings: {},
            widgets: {
                w000001: phone(),
                w000002: { tpl: 'tplVis2WidgetsBasicBulb', widgetSet: 'basic', data: {}, style: {} },
            },
        },
        kids: {
            // a view of its own permissions: not for the guest
            settings: { permissions: { Guest: { read: false, write: false } } },
            widgets: {
                w000003: phone({ extension: '101' }),
            },
        },
        office: {
            settings: {},
            widgets: {
                // only for the family, hidden from the others
                w000004: phone({ extension: '102', 'visibility-groups': ['family'] }),
                // only for the family, disabled for the others - a phone that cannot be answered must not ring
                w000005: phone({
                    extension: '103',
                    'visibility-groups': ['family'],
                    'visibility-groups-action': 'disabled',
                }),
                // no read permission of its own
                w000006: phone({ extension: '104' }, { permissions: { Guest: { read: false, write: true } } }),
                // the member of a group goes with its group
                g000001: {
                    tpl: '_tplGroup',
                    widgetSet: null,
                    data: { members: ['w000007'], 'visibility-groups': ['family'] },
                    style: {},
                },
                w000007: phone({ extension: '105' }, { groupid: 'g000001', grouped: true }),
            },
        },
    } as unknown as Project;
}

const extensions = (user: ServiceUser, data = project()): string[] =>
    getServiceWidgets(data, ['intercom'], user).map(widget => widget.data.extension);

describe('getServiceWidgets', () => {
    it('collects the widgets of the set in all views', () => {
        const widgets = getServiceWidgets(project(), ['intercom'], anna);
        expect(widgets.map(widget => widget.data.extension)).toEqual(['100', '101', '102', '103', '104', '105']);
        expect(widgets[0]).toEqual({
            view: 'door',
            id: 'w000001',
            tpl: 'tplAsteriskPhone',
            data: { extension: '100' },
        });
        expect(getServiceWidgets(project(), ['basic'], anna).map(widget => widget.id)).toEqual(['w000002']);
    });

    // #691: a set may be named by its collection, so the widgets of every name of the set count
    it('collects the widgets of every name of the set', () => {
        expect(getServiceWidgets(project(), ['vis2IntercomWidgets'], anna)).toEqual([]);
        expect(getServiceWidgets(project(), ['vis2IntercomWidgets', 'intercom'], anna)).toHaveLength(6);
        expect(getServiceWidgets(project(), ['intercom', 'basic'], anna)).toHaveLength(7);
    });

    it('leaves out what the user may not see', () => {
        // the view, both visibility-groups actions, the widget permission and the group
        expect(extensions(guest)).toEqual(['100']);
    });

    it('gives nothing without read permission for the project', () => {
        const data = project();
        data.___settings.permissions = { Guest: { read: false, write: true } };
        expect(extensions(guest, data)).toEqual([]);
        expect(extensions(anna, data)).toHaveLength(6);
    });
});
