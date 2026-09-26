import React from 'react';

import { PowerSettingsNew as SwitchIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';
import SlideToggle from '../Base/controls/SlideToggle';

interface SwitchRxData extends StandardRxData {
    /** What the device reports, if that is not the state it is switched by */
    oid2?: string;
    /** The value that counts as on; without it anything truthy does */
    onValue?: string;
    readOnly?: boolean | 'true';
}

/** `true`, `1`, `on` - a state that says the device is running */
function isOn(value: unknown, onValue?: string): boolean {
    if (onValue !== undefined && onValue !== '') {
        return value?.toString() === onValue;
    }
    if (typeof value === 'string') {
        return value !== '' && value !== '0' && value.toLowerCase() !== 'false' && value.toLowerCase() !== 'off';
    }
    return !!value;
}

/**
 * The switch: a socket, a lamp, a pump - anything that is on or off.
 *
 * It is also where a kind of device none of the others knows ends up, as long as its state is a boolean. Green
 * is what a switch that is on looks like, as in `ioBroker.aura`.
 */
const switchDevice = defineDeviceWidget<SwitchRxData>({
    name: 'Switch',
    label: 'widget_switch',
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="2" y="9" width="28" height="14" rx="7" fill="currentColor" opacity="0.3"/>' +
        '<circle cx="23" cy="16" r="6" fill="currentColor"/></svg>',
    help: 'help_switch',
    picture: {
        glyph:
            '<path d="M12 4v8" stroke-width="2" stroke-linecap="round"/>' +
            '<path d="M6.3 6.3a8 8 0 1 0 11.4 0" stroke-width="2" stroke-linecap="round"/>',
        toggle: true,
    },
    deviceTypes: [Types.socket, Types.light, Types.fan, Types.pump, Types.airPurifier, Types.unknown],
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        { name: 'oid2', type: 'id', label: 'oid_actual' },
        { name: 'onValue', label: 'on_value' },
        { name: 'readOnly', type: 'checkbox', label: 'read_only' },
    ],
    tile: { columns: 6, rows: 2, minColumns: 3 },
    markerShape: 'icon',
    // a socket, a pump or a gate on a switch is worth a question before it happens
    confirmable: true,
    render: context => {
        const { data, values, t, accents } = context;
        const reported = data.oid2 ? context.valueOf('oid2') : values[`${data.oid}.val`];
        const known = reported !== undefined && reported !== null;
        const on = isOn(reported, data.onValue);
        const readOnly = data.readOnly === true || data.readOnly === 'true';
        const accent = known && on ? accents.green : accents.off;

        const toggle = (): void => {
            if (!readOnly && data.oid) {
                // through `act`, so the widget can ask first where it was told to
                context.act(on ? 'off' : 'on', () => context.setValue(data.oid, !on));
            }
        };

        return {
            accent,
            active: known && on,
            icon: <SwitchIcon style={{ width: '100%', height: '100%' }} />,
            value: known ? t(on ? 'on' : 'off') : '--',
            valueColor: accent,
            stateText: known ? t(on ? 'on' : 'off') : '--',
            control: readOnly ? null : (
                <SlideToggle
                    on={on}
                    disabled={!known}
                    color={accents.green}
                    offColor={context.theme.palette.divider}
                    onChange={toggle}
                />
            ),
            onClick: readOnly ? undefined : toggle,
        };
    },
});

export default switchDevice;
