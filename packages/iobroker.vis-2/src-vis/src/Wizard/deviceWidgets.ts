import type { Types } from '@iobroker/type-detector';

import type { WidgetData } from '@iobroker/types-vis-2';

import { STANDARD_DEVICES } from '@/Vis/Widgets/Standard';
import type { DeviceWizardMap } from '@/Vis/Widgets/Standard/Base/defineDeviceWidget';

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
    /** Give the widget the symbol of its device type instead of the icon of its object */
    standardIcons?: boolean;
    /** The page is laid out freely, so the widget comes from the set `absolute` rather than `relative` */
    absolute?: boolean;
}

/** One of the two widgets a device description produces, and how to fill it */
interface StandardChoice {
    /** What stands behind `tplRel` and `tplAbs` */
    name: string;
    wizard: DeviceWizardMap;
}

/**
 * The widget of the sets `relative` and `absolute` that shows this kind of device.
 *
 * The devices say it themselves - which types they show, and which state of such a device belongs in which
 * field. The wizard only asks; it holds no table of its own that would go stale the moment a widget is added.
 * Where two widgets show the same kind of device - a window is both a sensor and a window - the one whose
 * `wizard.types` names it wins, and otherwise the one that stands first in the palette.
 *
 * @param type - the kind of device the detector found
 */
function choiceFor(type: Types): StandardChoice | null {
    let general: StandardChoice | null = null;

    for (const device of STANDARD_DEVICES) {
        const wizard = device.definition.wizard;
        if (!wizard) {
            continue;
        }
        if (wizard.types) {
            if (wizard.types.includes(type)) {
                return { name: device.definition.name, wizard };
            }
            continue;
        }
        if (!general && device.definition.deviceTypes.includes(type)) {
            general = { name: device.definition.name, wizard };
        }
    }

    return general;
}

/** The state of a device the detector gave this name, like `SET` or `ACTUAL` */
function state(device: WizardDevice, name: string): WizardDeviceState | undefined {
    return device.states.find(s => s.name === name);
}

/** The first of these states the device has */
function firstOf(device: WizardDevice, names: string | readonly string[]): WizardDeviceState | undefined {
    for (const name of typeof names === 'string' ? [names] : names) {
        const found = state(device, name);
        if (found) {
            return found;
        }
    }
    return undefined;
}

/**
 * The widget that shows a device, and the data it is filled with.
 *
 * Every widget comes from the two sets vis-2 ships itself, so the wizard needs no other adapter: one widget
 * per device, drawn the way that device is read - a blind as a window one can pull, a fill level as a tank, a
 * measured value with its history behind it. What goes where is the device description's business, see
 * {@link DeviceWizardMap}.
 *
 * @param device - the device a widget is wanted for
 * @param options - how the wizard builds its widgets
 */
export function getDeviceWidget(device: WizardDevice, options: DeviceWidgetOptions = {}): DeviceWidgetSpec | null {
    const choice = choiceFor(device.type);
    if (!choice) {
        return null;
    }

    const data: WidgetData = {
        widgetTitle: device.name,
        // the wizard finds its own widgets again by this, to add to a page it built earlier
        wizardId: device.id,
        g_common: true,
        ...choice.wizard.data?.[device.type],
    };

    let any = false;
    for (const [attr, names] of Object.entries(choice.wizard.states)) {
        const found = firstOf(device, names);
        if (found) {
            data[attr] = found.id;
            any = true;
        }
    }

    // a device the detector found but whose states this widget cannot use is no widget at all
    if (!any) {
        return null;
    }

    /*
     * The symbol of a device kind is what these widgets draw anyway.
     *
     * So "take the icon of the device type" means leaving the field empty, and the other way round the icon
     * the object carries is written into it - the lamp of the adapter rather than the lamp of the set.
     */
    if (!options.standardIcons && device.icon) {
        data.icon = device.icon;
    }

    return {
        tpl: `tpl${options.absolute ? 'Abs' : 'Rel'}${choice.name}`,
        widgetSet: options.absolute ? 'absolute' : 'relative',
        data,
    };
}

/** Why the wizard passes a device over, or `null` if it does not */
export function getSkipReason(device: WizardDevice): SkipReason | null {
    if (!choiceFor(device.type)) {
        return 'no-widget';
    }
    if (!getDeviceWidget(device)) {
        return 'no-state';
    }
    return null;
}
