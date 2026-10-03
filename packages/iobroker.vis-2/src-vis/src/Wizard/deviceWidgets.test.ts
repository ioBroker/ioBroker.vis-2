import { describe, expect, it } from 'vitest';

import { Types } from '@iobroker/type-detector';

import { STANDARD_DEVICES } from '@/Vis/Widgets/Standard';

import type { WizardDevice } from './deviceDetection';
import { getDeviceWidget, getSkipReason } from './deviceWidgets';

/** A device as the detector hands it over: a type, and states under the names the detector gave them */
function device(type: Types, states: [string, string, Partial<ioBroker.StateCommon>?][]): WizardDevice {
    return {
        id: 'hm.0.device',
        type,
        name: 'Lamp',
        roomId: 'enum.rooms.living',
        functionId: '',
        states: states.map(([name, id, common]) => ({
            id,
            name,
            common: { name: id, type: 'boolean', role: 'state', read: true, write: true, ...common },
        })),
    };
}

/** A device that carries the first state of every field a map asks for */
function device_(type: Types, wizard: { states: Readonly<Record<string, string | readonly string[]>> }): WizardDevice {
    const states = Object.values(wizard.states).map((names): [string, string] => {
        const name = typeof names === 'string' ? names : names[0];
        return [name, `hm.0.${type}.${name}`];
    });
    return device(type, states);
}

describe('getDeviceWidget', () => {
    it('makes a switch of a lamp and names it after the device', () => {
        const widget = getDeviceWidget(device(Types.light, [['SET', 'hm.0.lamp.SET']]));

        expect(widget?.tpl).toBe('tplRelSwitch');
        expect(widget?.widgetSet).toBe('relative');
        expect(widget?.data.oid).toBe('hm.0.lamp.SET');
        expect(widget?.data.widgetTitle).toBe('Lamp');
        expect(widget?.data.wizardId).toBe('hm.0.device');
    });

    it('takes the widget of the other set for a page that is laid out freely', () => {
        const widget = getDeviceWidget(device(Types.light, [['SET', 'hm.0.lamp.SET']]), { absolute: true });

        expect(widget?.tpl).toBe('tplAbsSwitch');
        expect(widget?.widgetSet).toBe('absolute');
    });

    it('fills every field the device has a state for', () => {
        const widget = getDeviceWidget(
            device(Types.blind, [
                ['SET', 'hm.0.blind.LEVEL', { type: 'number' }],
                ['ACTUAL', 'hm.0.blind.ACTUAL', { type: 'number', write: false }],
                ['STOP', 'hm.0.blind.STOP'],
                ['OPEN', 'hm.0.blind.OPEN'],
                ['CLOSE', 'hm.0.blind.CLOSE'],
            ]),
        );

        expect(widget?.tpl).toBe('tplRelBlind');
        expect(widget?.data.oid).toBe('hm.0.blind.LEVEL');
        expect(widget?.data.oidActual).toBe('hm.0.blind.ACTUAL');
        expect(widget?.data.oidUp).toBe('hm.0.blind.OPEN');
        expect(widget?.data.oidDown).toBe('hm.0.blind.CLOSE');
        expect(widget?.data.oidStop).toBe('hm.0.blind.STOP');
    });

    it('leaves out the fields the device has nothing for', () => {
        const widget = getDeviceWidget(device(Types.blind, [['SET', 'hm.0.blind.LEVEL', { type: 'number' }]]));

        expect(widget?.data.oid).toBe('hm.0.blind.LEVEL');
        expect(widget?.data.oidUp).toBeUndefined();
        expect(widget?.data.oidStop).toBeUndefined();
    });

    it('takes the first name a field offers that the device actually has', () => {
        const only = getDeviceWidget(device(Types.thermostat, [['ACTUAL', 'hm.0.heat.ACTUAL', { type: 'number' }]]));
        expect(only?.data.oid).toBeUndefined();
        expect(only?.data.oidActual).toBe('hm.0.heat.ACTUAL');

        const both = getDeviceWidget(
            device(Types.thermostat, [
                ['SET_HEATING', 'hm.0.heat.SET_HEATING', { type: 'number' }],
                ['ACTUAL', 'hm.0.heat.ACTUAL', { type: 'number' }],
            ]),
        );
        expect(both?.data.oid).toBe('hm.0.heat.SET_HEATING');
    });

    it('writes what the kind of device already decided', () => {
        const door = getDeviceWidget(device(Types.door, [['ACTUAL', 'hm.0.door.ACTUAL', { write: false }]]));
        expect(door?.tpl).toBe('tplRelWindow');
        expect(door?.data.kind).toBe('door');

        const window_ = getDeviceWidget(device(Types.window, [['ACTUAL', 'hm.0.win.ACTUAL', { write: false }]]));
        expect(window_?.data.kind).toBeUndefined();

        const smoke = getDeviceWidget(device(Types.fireAlarm, [['ACTUAL', 'hm.0.fire.ACTUAL', { write: false }]]));
        expect(smoke?.tpl).toBe('tplRelSensor');
        expect(smoke?.data.kind).toBe('smoke');
        expect(smoke?.data.alarm).toBe(true);
    });

    it('sends a window to the widget that draws one, not to the sensor that could also show it', () => {
        expect(getDeviceWidget(device(Types.window, [['ACTUAL', 'hm.0.win.ACTUAL']]))?.tpl).toBe('tplRelWindow');
        expect(getDeviceWidget(device(Types.motion, [['ACTUAL', 'hm.0.pir.ACTUAL']]))?.tpl).toBe('tplRelSensor');
    });

    it('has a widget for every kind of device the old wizard passed over', () => {
        const cases: [Types, string, string][] = [
            [Types.rgb, 'RED', 'tplRelRgb'],
            [Types.vacuumCleaner, 'POWER', 'tplRelVacuum'],
            [Types.media, 'STATE', 'tplRelMedia'],
            [Types.camera, 'URL', 'tplRelCamera'],
            [Types.chart, 'CHART', 'tplRelChart'],
            [Types.weatherCurrent, 'ACTUAL', 'tplRelWeather'],
            [Types.fillLevel, 'ACTUAL', 'tplRelTank'],
            [Types.lock, 'SET', 'tplRelLock'],
        ];

        for (const [type, state, tpl] of cases) {
            expect(getDeviceWidget(device(type, [[state, `hm.0.${type}.${state}`]]))?.tpl).toBe(tpl);
        }
    });

    it('passes over what neither set draws', () => {
        for (const type of [Types.location, Types.warning, Types.weatherForecast]) {
            const passed = device(type, [['ACTUAL', 'some.0.device.ACTUAL']]);
            expect(getDeviceWidget(passed)).toBeNull();
            expect(getSkipReason(passed)).toBe('no-widget');
        }
    });

    it('passes over a device whose states the widget cannot use', () => {
        // the detector found a blind, but nothing it hands over is a level, an end or a stop
        const odd = device(Types.blind, [['DIRECTION', 'hm.0.blind.DIRECTION', { write: false }]]);

        expect(getDeviceWidget(odd)).toBeNull();
        expect(getSkipReason(odd)).toBe('no-state');
    });

    it('names widgets that really exist in both sets', () => {
        // the wizard builds the id out of the name of the device, so the two have to agree
        for (const device of STANDARD_DEVICES) {
            if (!device.definition.wizard) {
                continue;
            }
            expect((device.Relative as any).getWidgetInfo().id).toBe(`tplRel${device.definition.name}`);
            expect((device.Absolute as any).getWidgetInfo().id).toBe(`tplAbs${device.definition.name}`);
        }
    });

    it('has a widget for every kind of device a wizard map names', () => {
        for (const device of STANDARD_DEVICES) {
            const wizard = device.definition.wizard;
            if (!wizard) {
                continue;
            }
            for (const type of wizard.types || device.definition.deviceTypes) {
                // whoever the wizard picks for this type, it must pick somebody
                expect(getSkipReason(device_(type, wizard))).not.toBe('no-widget');
            }
        }
    });

    it('takes the symbol of the device kind when that is asked for, and the icon of the object otherwise', () => {
        const lamp = { ...device(Types.light, [['SET', 'hm.0.lamp.SET']]), icon: 'data:image/svg+xml;base64,AAA' };

        expect(getDeviceWidget(lamp, { standardIcons: true })?.data.icon).toBeUndefined();
        expect(getDeviceWidget(lamp)?.data.icon).toBe('data:image/svg+xml;base64,AAA');
    });
});
