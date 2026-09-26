import { Types } from '@iobroker/type-detector';

import type { WidgetData } from '@iobroker/types-vis-2';

import { DEVICE_ICONS, ICONS } from './deviceIcons';
import type { WizardDevice, WizardDeviceState } from './deviceDetection';

/** Why no widget was made for a device */
export type SkipReason =
    /** No widget of vis-2 shows this kind of device yet */
    | 'no-widget'
    /** The detector found the device, but not a single state that could be shown */
    | 'no-state';

export interface DeviceWidgetSpec {
    tpl: string;
    /** The set the widget belongs to, as it is stored in the project */
    widgetSet: string;
    data: WidgetData;
}

export interface DeviceWidgetOptions {
    /** Give the widget the icon of its device type instead of the icon of its object */
    standardIcons?: boolean;
}

/**
 * The kinds of devices no widget of vis-2 shows.
 *
 * Until the sets `relative` and `absolute` are there, the wizard builds its pages out of the widgets that ship
 * with vis-2 anyway: `Basic` and `jQui`. They show a state, a value and a slider, which covers most of a house -
 * but a colour wheel, a robot vacuum or a media player they do not have, and those are passed over with a word.
 */
const WITHOUT_WIDGET: Types[] = [
    Types.camera,
    Types.chart,
    Types.cie,
    Types.ct,
    Types.hue,
    Types.image,
    Types.info,
    Types.instance,
    Types.location,
    Types.locationOne,
    Types.media,
    Types.rgb,
    Types.rgbSingle,
    Types.rgbwSingle,
    Types.vacuumCleaner,
    Types.warning,
    Types.weatherCurrent,
    Types.weatherForecast,
];

/** The icons a kind of device is shown with when it is on and when it is off */
const SENSOR_ICONS: Partial<Record<Types, { off: string; on?: string }>> = {
    [Types.door]: { off: ICONS.doorClosed, on: ICONS.doorOpened },
    [Types.contact]: { off: ICONS.doorClosed, on: ICONS.doorOpened },
    [Types.window]: { off: ICONS.windowClosed, on: ICONS.windowOpened },
    [Types.windowTilt]: { off: ICONS.windowClosed, on: ICONS.windowTilted },
    [Types.motion]: { off: ICONS.noMotion, on: ICONS.motion },
    [Types.fireAlarm]: { off: ICONS.fire },
    [Types.coAlarm]: { off: ICONS.fire },
    [Types.floodAlarm]: { off: ICONS.flood },
    [Types.socket]: { off: ICONS.socket },
    [Types.volume]: { off: ICONS.volume },
    [Types.volumeGroup]: { off: ICONS.volume },
};

/** The state of a device the detector gave this name, like `SET` or `ACTUAL` */
function state(device: WizardDevice, name: string): WizardDeviceState | undefined {
    return device.states.find(s => s.name === name);
}

/** The first of these states the device has */
function firstOf(device: WizardDevice, ...names: string[]): WizardDeviceState | undefined {
    for (const name of names) {
        const found = state(device, name);
        if (found) {
            return found;
        }
    }
    return undefined;
}

/** Everything a widget carries whatever its type is: its name and where it came from */
function common(device: WizardDevice): WidgetData {
    return {
        name: device.name,
        // the wizard finds its own widgets again by this, to add to a page it built earlier
        wizardId: device.id,
        g_common: true,
    };
}

/** A switch or a sensor: an icon that changes with the state, and toggles it where that is allowed */
function bulb(device: WizardDevice, source: WizardDeviceState, options: DeviceWidgetOptions): DeviceWidgetSpec {
    const icons = SENSOR_ICONS[device.type];
    const data: WidgetData = {
        ...common(device),
        oid: source.id,
        readOnly: source.common?.write === false,
    };

    if (options.standardIcons && DEVICE_ICONS[device.type]) {
        data.icon_off = DEVICE_ICONS[device.type];
    } else if (icons) {
        data.icon_off = icons.off;
        if (icons.on) {
            data.icon_on = icons.on;
        }
    } else if (DEVICE_ICONS[device.type]) {
        data.icon_off = DEVICE_ICONS[device.type];
    }

    return { tpl: 'tplBulbOnOffCtrl', widgetSet: 'basic', data };
}

/** A value that can be set: the slider of jQui, which every installation has */
function slider(device: WizardDevice, source: WizardDeviceState): DeviceWidgetSpec {
    const data: WidgetData = { ...common(device), oid: source.id };
    if (typeof source.common?.min === 'number') {
        data.min = source.common.min;
    }
    if (typeof source.common?.max === 'number') {
        data.max = source.common.max;
    }

    return { tpl: 'tplJquiSlider', widgetSet: 'jqui', data };
}

/** A number to read, with its unit behind it */
function value(device: WizardDevice, source: WizardDeviceState): DeviceWidgetSpec {
    const data: WidgetData = { ...common(device), oid: source.id, digits: 1 };
    if (source.common?.unit) {
        data.html_append = ` ${source.common.unit}`;
    }

    return { tpl: 'tplValueFloat', widgetSet: 'basic', data };
}

/** Whatever else a state holds: its text */
function text(device: WizardDevice, source: WizardDeviceState): DeviceWidgetSpec {
    return { tpl: 'tplValueString', widgetSet: 'basic', data: { ...common(device), oid: source.id } };
}

/**
 * The widget that shows a device, and the data it is filled with.
 *
 * Every widget comes from a set that ships with vis-2, so the wizard needs no other adapter. Which one it is
 * follows from what the state can do, not from the name of the device: something to switch becomes a switch,
 * something to set becomes a slider, something to read becomes a value.
 *
 * @param device - the device a widget is wanted for
 * @param options - how the wizard builds its widgets
 */
export function getDeviceWidget(device: WizardDevice, options: DeviceWidgetOptions = {}): DeviceWidgetSpec | null {
    if (WITHOUT_WIDGET.includes(device.type)) {
        return null;
    }

    // the state that carries the device: what can be set comes before what can only be read
    const source =
        firstOf(device, 'SET', 'ACTUAL', 'PRESS', 'STATE') ||
        device.states.find(s => s.common?.write !== false && s.name !== 'ON_ACTUAL') ||
        device.states[0];
    if (!source) {
        return null;
    }

    const writable = source.common?.write !== false;
    const type = source.common?.type;

    if (type === 'boolean' || (!type && !source.common?.states)) {
        return bulb(device, source, options);
    }
    if (type === 'number') {
        return writable && !source.common?.states ? slider(device, source) : value(device, source);
    }

    return text(device, source);
}

/** Why the wizard passes a device over, or `null` if it does not */
export function getSkipReason(device: WizardDevice): SkipReason | null {
    if (WITHOUT_WIDGET.includes(device.type)) {
        return 'no-widget';
    }
    if (!getDeviceWidget(device)) {
        return 'no-state';
    }
    return null;
}
