import { describe, expect, it } from 'vitest';

import { Types } from '@iobroker/type-detector';

import type { WizardDevice } from './deviceDetection';
import { getDeviceWidget, getSkipReason } from './deviceWidgets';

function device(type: Types, states: [string, Partial<ioBroker.StateCommon>?][]): WizardDevice {
    return {
        id: states[0]?.[0] || 'test.0.device',
        type,
        name: 'Lamp',
        roomId: 'enum.rooms.living',
        functionId: '',
        states: states.map(([id, common]) => ({
            id,
            name: id.split('.').pop() as string,
            common: {
                name: id,
                type: 'boolean',
                role: 'state',
                read: true,
                write: true,
                ...common,
            },
        })),
    };
}

describe('getDeviceWidget', () => {
    it('makes a switch of a lamp and names it after the device', () => {
        const widget = getDeviceWidget(device(Types.light, [['hm.0.lamp.SET']]));

        expect(widget?.tpl).toBe('tplBulbOnOffCtrl');
        expect(widget?.widgetSet).toBe('basic');
        expect(widget?.data.oid).toBe('hm.0.lamp.SET');
        expect(widget?.data.name).toBe('Lamp');
        expect(widget?.data.wizardId).toBe('hm.0.lamp.SET');
        expect(widget?.data.readOnly).toBe(false);
    });

    it('marks a sensor as read only and gives it the icons of its kind', () => {
        const widget = getDeviceWidget(device(Types.door, [['hm.0.door.ACTUAL', { write: false }]]));

        expect(widget?.tpl).toBe('tplBulbOnOffCtrl');
        expect(widget?.data.readOnly).toBe(true);
        expect(widget?.data.icon_off).toBeTruthy();
        expect(widget?.data.icon_on).toBeTruthy();
        expect(widget?.data.icon_off).not.toBe(widget?.data.icon_on);
    });

    it('gives a fire alarm one icon, because it has only one state worth showing', () => {
        const widget = getDeviceWidget(device(Types.fireAlarm, [['hm.0.fire.ACTUAL', { write: false }]]));

        expect(widget?.data.icon_off).toBeTruthy();
        expect(widget?.data.icon_on).toBeUndefined();
    });

    it('makes a slider of what can be set, with the limits of the object', () => {
        const widget = getDeviceWidget(
            device(Types.dimmer, [['hm.0.dimmer.SET', { type: 'number', min: 0, max: 255 }]]),
        );

        expect(widget?.tpl).toBe('tplJquiSlider');
        expect(widget?.widgetSet).toBe('jqui');
        expect(widget?.data.oid).toBe('hm.0.dimmer.SET');
        expect(widget?.data.min).toBe(0);
        expect(widget?.data.max).toBe(255);
    });

    it('sets the target of a thermostat, which is all Basic and jQui can do for one', () => {
        const widget = getDeviceWidget(
            device(Types.thermostat, [
                ['hm.0.heating.SET', { type: 'number', min: 5, max: 30 }],
                ['hm.0.heating.ACTUAL', { type: 'number', write: false }],
            ]),
        );

        expect(widget?.tpl).toBe('tplJquiSlider');
        expect(widget?.data.oid).toBe('hm.0.heating.SET');
    });

    it('shows a measured value with its unit behind it', () => {
        const widget = getDeviceWidget(
            device(Types.temperature, [['hm.0.sensor.ACTUAL', { type: 'number', write: false, unit: '°C' }]]),
        );

        expect(widget?.tpl).toBe('tplValueFloat');
        expect(widget?.data.html_append).toBe(' °C');
    });

    it('writes out a state that is neither a number nor a switch', () => {
        const widget = getDeviceWidget(device(Types.unknown, [['hm.0.mode.SET', { type: 'string' }]]));

        expect(widget?.tpl).toBe('tplValueString');
        expect(widget?.data.oid).toBe('hm.0.mode.SET');
    });

    it('shows a number with named states as a value, not as a slider', () => {
        const widget = getDeviceWidget(
            device(Types.unknown, [['hm.0.mode.SET', { type: 'number', states: { 0: 'off', 1: 'on' } }]]),
        );

        expect(widget?.tpl).toBe('tplValueFloat');
    });

    it('passes over what no widget of vis-2 shows yet', () => {
        for (const type of [Types.rgb, Types.vacuumCleaner, Types.media, Types.camera]) {
            const passed = device(type, [['some.0.device.STATE']]);
            expect(getDeviceWidget(passed)).toBeNull();
            expect(getSkipReason(passed)).toBe('no-widget');
        }
    });

    it('passes over a device the detector found without a single state', () => {
        const empty: WizardDevice = {
            id: 'hm.0.nothing',
            type: Types.light,
            name: 'Nothing',
            roomId: '',
            functionId: '',
            states: [],
        };

        expect(getDeviceWidget(empty)).toBeNull();
        expect(getSkipReason(empty)).toBe('no-state');
    });

    it('takes the icon of the device type when that is asked for', () => {
        const door = device(Types.door, [['hm.0.door.ACTUAL', { write: false }]]);

        expect(getDeviceWidget(door, { standardIcons: true })?.data.icon_off).toMatch(/^data:image\/svg/);
        expect(getDeviceWidget(door, { standardIcons: true })?.data.icon_on).toBeUndefined();
    });
});
