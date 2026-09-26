import React from 'react';

import {
    DirectionsRun as MotionIcon,
    DoorFront as DoorIcon,
    LocalFireDepartment as SmokeIcon,
    NotificationsActive as AlarmIcon,
    Sensors as GenericIcon,
    Water as WaterIcon,
    WbSunny as BrightIcon,
    Window as WindowIcon,
} from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

/** What kind of thing the sensor watches, which decides its symbol and its two words */
type SensorKind = 'contact' | 'window' | 'door' | 'motion' | 'smoke' | 'water' | 'light' | 'generic';

interface SensorRxData extends StandardRxData {
    kind?: SensorKind;
    /** The state says the opposite of what it means */
    inverted?: boolean | 'true';
    /** What it is called while it is true; without it the word of its kind */
    textOn?: string;
    /** What it is called while it is false */
    textOff?: string;
    /** This is something to be alarmed about, not something to know */
    alarm?: boolean | 'true';
}

/** The two words of each kind, as they stand in the i18n of these sets */
const WORDS: Record<SensorKind, { on: string; off: string }> = {
    contact: { on: 'open', off: 'closed' },
    window: { on: 'open', off: 'closed' },
    door: { on: 'open', off: 'closed' },
    motion: { on: 'motion', off: 'no_motion' },
    smoke: { on: 'smoke', off: 'sensor_quiet' },
    water: { on: 'water', off: 'sensor_dry' },
    light: { on: 'bright', off: 'dark' },
    generic: { on: 'on', off: 'off' },
};

/** The symbol of each kind */
const ICONS: Record<SensorKind, React.ReactNode> = {
    contact: <WindowIcon style={{ width: '100%', height: '100%' }} />,
    window: <WindowIcon style={{ width: '100%', height: '100%' }} />,
    door: <DoorIcon style={{ width: '100%', height: '100%' }} />,
    motion: <MotionIcon style={{ width: '100%', height: '100%' }} />,
    smoke: <SmokeIcon style={{ width: '100%', height: '100%' }} />,
    water: <WaterIcon style={{ width: '100%', height: '100%' }} />,
    light: <BrightIcon style={{ width: '100%', height: '100%' }} />,
    generic: <GenericIcon style={{ width: '100%', height: '100%' }} />,
};

/**
 * The sensor: a state that is only ever one of two things, and a card that says which.
 *
 * A window, a door, a motion detector, a smoke alarm, a water sensor - the same widget for all of them, and
 * what it is called is the only difference between them. `alarm` is what turns one into the other: a window
 * that is open is worth knowing, a smoke detector that has gone off is worth a red card that pulses, and
 * whether a given device is the one or the other is the user's judgement, not the widget's. A contact on a
 * garden gate at night is an alarm; the same contact on the kitchen window in July is not.
 *
 * Where the state is logged, a click opens its history - drawn as a step curve, which is how a thing that
 * jumps between two values actually behaves.
 */
const sensorDevice = defineDeviceWidget<SensorRxData>({
    name: 'Sensor',
    label: 'widget_sensor',
    help: 'help_sensor',
    picture: {
        glyph:
            '<path d="M12 3v5M12 16v5M3 12h5M16 12h5" stroke-width="2" stroke-linecap="round"/>' +
            '<circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>',
        value: 'Offen',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="5" y="5" width="22" height="22" rx="3" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="16" cy="16" r="4" fill="currentColor"/></svg>',
    deviceTypes: [
        Types.window,
        Types.windowTilt,
        Types.door,
        Types.motion,
        Types.fireAlarm,
        Types.floodAlarm,
        Types.coAlarm,
        Types.contact,
        Types.buttonSensor,
    ],
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        {
            name: 'kind',
            type: 'select',
            label: 'sensor_kind',
            default: 'contact',
            options: [
                { value: 'contact', label: 'sensor_contact' },
                { value: 'window', label: 'sensor_window' },
                { value: 'door', label: 'sensor_door' },
                { value: 'motion', label: 'sensor_motion' },
                { value: 'smoke', label: 'sensor_smoke' },
                { value: 'water', label: 'sensor_water' },
                { value: 'light', label: 'sensor_light' },
                { value: 'generic', label: 'sensor_generic' },
            ],
        },
        { name: 'alarm', type: 'checkbox', label: 'sensor_alarm', tooltip: 'sensor_alarm_tooltip' },
        { name: 'inverted', type: 'checkbox', label: 'inverted' },
        { name: 'textOn', label: 'text_on' },
        { name: 'textOff', label: 'text_off' },
    ],
    tile: { columns: 6, rows: 2, minColumns: 3 },
    markerShape: 'icon',
    render: context => {
        const { data, accents, t } = context;
        const kind: SensorKind = data.kind || 'contact';
        const raw = context.valueOf('oid');
        const known = raw !== undefined && raw !== null;

        // a state that says `false`, `0` or nothing at all is the quiet one
        const truthy = raw === true || raw === 1 || raw === 'true' || raw === '1' || raw === 'on';
        const inverted = data.inverted === true || data.inverted === 'true';
        const active = known && (inverted ? !truthy : truthy);
        const alarming = (data.alarm === true || data.alarm === 'true') && active;

        const word = active ? data.textOn || t(WORDS[kind].on) : data.textOff || t(WORDS[kind].off);
        const accent = !known ? accents.off : alarming ? accents.red : active ? accents.yellow : accents.off;

        return {
            accent,
            // an alarm fills its card and its marker; an open window colours the ring and leaves it at that
            active: alarming,
            icon: alarming ? <AlarmIcon style={{ width: '100%', height: '100%' }} /> : ICONS[kind],
            value: known ? word : '--',
            valueColor: accent,
            stateText: known ? word : '--',
            // a state that jumps between two values is worth looking at over time: when did the window open
            chart: { attrs: ['oid'] },
        };
    },
});

export default sensorDevice;
