import { I18n } from '@iobroker/gui-components';

import translations from './translations';

import Blinds from './Blinds';
import Camera from './Camera';
import Clock from './Clock';
import Lock from './Lock';
import Navigate from './Navigate';
import RGBLight from './RGBLight';
import Security from './Security';
import SimpleState from './SimpleState';
import Static from './Static';
import ThemeSwitcher from './ThemeSwitcher';
import Thermostat from './Thermostat';
import Vacuum from './Vacuum';
import WasherDryer from './WasherDryer';

/**
 * The widgets for the devices of a house: blinds, lamps, a thermostat, a lock and what else a room has.
 *
 * They come from the widget set `vis-2-widgets-material`, whose widgets that need no library of their own moved
 * here and form the set `devices` now. Their `tpl` stayed as it was, so stored projects keep working; their words
 * carry the prefix `vis_2_widgets_devices_` and are registered here the same way the loader of a remote widget set
 * registers them - once, when this module is loaded.
 */
I18n.extendTranslations(translations);

const DEVICE_WIDGETS = [
    Blinds,
    Camera,
    Clock,
    Lock,
    Navigate,
    RGBLight,
    Security,
    SimpleState,
    Static,
    ThemeSwitcher,
    Thermostat,
    Vacuum,
    WasherDryer,
];

export default DEVICE_WIDGETS;
