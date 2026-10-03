import applianceDevice from './devices/applianceDevice';
import blindDevice from './devices/blindDevice';
import buttonDevice from './devices/buttonDevice';
import cameraDevice from './devices/cameraDevice';
import chartDevice from './devices/chartDevice';
import clockDevice from './devices/clockDevice';
import dimmerDevice from './devices/dimmerDevice';
import iframeDevice from './devices/iframeDevice';
import inputDevice from './devices/inputDevice';
import knobDevice from './devices/knobDevice';
import linkDevice from './devices/linkDevice';
import listDevice from './devices/listDevice';
import mediaDevice from './devices/mediaDevice';
import lockDevice from './devices/lockDevice';
import rgbDevice from './devices/rgbDevice';
import securityDevice from './devices/securityDevice';
import sensorDevice from './devices/sensorDevice';
import switchDevice from './devices/switchDevice';
import tableDevice from './devices/tableDevice';
import tankDevice from './devices/tankDevice';
import textDevice from './devices/textDevice';
import themeDevice from './devices/themeDevice';
import thermostatDevice from './devices/thermostatDevice';
import vacuumDevice from './devices/vacuumDevice';
import valueDevice from './devices/valueDevice';
import weatherDevice from './devices/weatherDevice';
import windowDevice from './devices/windowDevice';
import registerStandardWords from './i18n';

// These widgets say `On`, `Closed` or `7 days` on the page itself, so their words belong in both bundles -
// unlike the sets whose catalogs only name attributes, which the editor registers for itself.
registerStandardWords();

/**
 * The two widget sets vis-2 brings for the devices of a house.
 *
 * `relative` is for the grid with sections - a widget is a tile that fills its cell - and `absolute` for a page
 * with a fixed resolution, where a widget is as large as it was dragged. Both show the same devices, in the
 * same style, with every colour out of the theme; a device is described once and comes out twice, see
 * `Base/defineDeviceWidget.tsx`.
 */
const DEVICES = [
    switchDevice,
    dimmerDevice,
    rgbDevice,
    thermostatDevice,
    knobDevice,
    valueDevice,
    inputDevice,
    tankDevice,
    sensorDevice,
    windowDevice,
    weatherDevice,
    securityDevice,
    blindDevice,
    lockDevice,
    cameraDevice,
    vacuumDevice,
    mediaDevice,
    applianceDevice,
    buttonDevice,
    listDevice,
    tableDevice,
    chartDevice,
    clockDevice,
    linkDevice,
    textDevice,
    iframeDevice,
    themeDevice,
];

/**
 * The devices themselves, for whoever needs more than the two classes.
 *
 * The wizard does: it asks which widget shows a kind of device and how to fill it out of what the detector
 * found - see `DeviceWizardMap` and `Wizard/deviceWidgets.ts`. The order is the order of the palette, and it
 * decides who wins where two widgets show the same kind of device.
 */
export const STANDARD_DEVICES = DEVICES;

const STANDARD_WIDGETS = [...DEVICES.map(d => d.Relative), ...DEVICES.map(d => d.Absolute)];

export default STANDARD_WIDGETS;
