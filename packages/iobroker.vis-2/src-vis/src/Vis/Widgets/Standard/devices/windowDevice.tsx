import React from 'react';

import { DoorFront as DoorIcon, Window as WindowIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import WindowGlass, { type WindowState } from '../Base/controls/WindowGlass';
import { asText } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

interface WindowRxData extends StandardRxData {
    /** `window` or `door`, which decides the symbol */
    kind?: 'window' | 'door';
    /** The side the handle is on; the leaf is hinged on the other one */
    handle?: 'left' | 'right';
    /** The state says the opposite of what it means */
    inverted?: boolean | 'true';
    /** The value that means tilted, where the state knows three positions */
    tiltValue?: string;
}

/**
 * The values a state can carry, in the order the object lists them.
 *
 * `common.states` comes in two shapes: a list of words, whose values are the places in it, and a map of the
 * value to the word. Only the second one was read here, so a window that listed its three positions as a list
 * was drawn open as soon as it was tilted.
 *
 * @param states - what the object says about the values of the state
 */
function stateValues(states: ioBroker.StateCommon['states']): string[] {
    if (!states) {
        return [];
    }

    return Array.isArray(states) ? states.map((_word, index) => `${index}`) : Object.keys(states);
}

/**
 * What the window is doing, out of the one state it has.
 *
 * ioBroker knows two kinds of window: one that is open or closed, and one that can also be tilted - the
 * detector calls the second `windowTilt` and it usually carries 0, 1 and 2. Which of the two this is does not
 * have to be set: a state with three values in `common.states` is the second kind, and the middle of them is
 * the tilted one. `tiltValue` is there for the window that says it in another way.
 *
 * @param context - the widget, its states and its settings
 */
function windowState(context: DeviceContext<WindowRxData>): WindowState | null {
    const raw = context.valueOf('oid');
    if (raw === undefined || raw === null) {
        return null;
    }
    const inverted = context.data.inverted === true || context.data.inverted === 'true';

    // the value the user named as the tilted one, or the middle of three
    const values = stateValues(context.commonOf('oid')?.states);
    const tilt = context.data.tiltValue || (values.length === 3 ? values[1] : undefined);
    const text = asText(raw);
    if (tilt !== undefined && text === `${tilt}`) {
        return 'tilted';
    }

    const truthy = raw === true || raw === 1 || raw === 'true' || raw === '1' || raw === 'open';
    // where the object says what the values are, the last of them is open and everything else is closed
    const open = values.length ? text === values[values.length - 1] : truthy;

    return (inverted ? !open : open) ? 'open' : 'closed';
}

/**
 * The window or the door: the thing itself, drawn as it stands.
 *
 * The sensor widget can say the same in a word, and for a list of twenty contacts that is the better widget.
 * This one is for the card on the wall: the shape of a window standing open is recognised across a room,
 * before anybody reads anything, and a window that is only tilted looks different again.
 */
const windowDevice = defineDeviceWidget<WindowRxData>({
    name: 'Window',
    label: 'widget_window',
    help: 'help_window',
    picture: {
        glyph:
            '<rect x="3.5" y="4" width="17" height="16" rx="2" stroke-width="2"/>' +
            '<path d="M12 4v16" stroke-width="2"/>',
        value: 'Offen',
        window: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="4" y="5" width="24" height="22" rx="2" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M16 5v22" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M16 7l10 -2v22l-10 -2z" fill="currentColor" opacity="0.4"/></svg>',
    deviceTypes: [Types.window, Types.windowTilt, Types.door],
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        {
            name: 'kind',
            type: 'select',
            label: 'sensor_kind',
            default: 'window',
            options: [
                { value: 'window', label: 'sensor_window' },
                { value: 'door', label: 'sensor_door' },
            ],
        },
        {
            name: 'handle',
            type: 'select',
            label: 'window_handle',
            default: 'right',
            tooltip: 'window_handle_tooltip',
            options: [
                { value: 'right', label: 'window_handle_right' },
                { value: 'left', label: 'window_handle_left' },
            ],
        },
        { name: 'tiltValue', label: 'tilt_value', tooltip: 'tilt_value_tooltip' },
        { name: 'inverted', type: 'checkbox', label: 'inverted' },
    ],
    tile: { columns: 6, rows: 4, minColumns: 3, minRows: 3 },
    markerShape: 'icon',
    render: context => {
        const { accents, theme, t } = context;
        const state = windowState(context);
        const known = state !== null;
        const open = state === 'open';
        const tilted = state === 'tilted';
        const accent = !known ? accents.off : open ? accents.yellow : tilted ? accents.blue : accents.green;
        const word = !known ? '--' : t(open ? 'open' : tilted ? 'tilted' : 'closed');

        return {
            accent,
            active: false,
            icon:
                context.data.kind === 'door' ? (
                    <DoorIcon style={{ width: '100%', height: '100%' }} />
                ) : (
                    <WindowIcon style={{ width: '100%', height: '100%' }} />
                ),
            body: (
                <WindowGlass
                    state={state || 'closed'}
                    kind={context.data.kind === 'door' ? 'door' : 'window'}
                    handle={context.data.handle === 'left' ? 'left' : 'right'}
                    accent={accent}
                    outline={theme.palette.text.disabled}
                    background={theme.palette.background.default}
                />
            ),
            value: word,
            valueColor: accent,
            stateText: word,
            chart: { attrs: ['oid'] },
        };
    },
});

export default windowDevice;
