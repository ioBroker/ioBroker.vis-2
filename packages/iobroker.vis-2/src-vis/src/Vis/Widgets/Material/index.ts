import { I18n } from '@iobroker/gui-components';

import translations from './translations';

import Blinds from './Blinds';
import Camera from './Camera';
import Clock from './Clock';
import Lock from './Lock';
import Navigate from './Navigate';
import Security from './Security';
import SimpleState from './SimpleState';
import Static from './Static';
import ThemeSwitcher from './ThemeSwitcher';
import Thermostat from './Thermostat';
import Vacuum from './Vacuum';
import WasherDryer from './WasherDryer';

/**
 * The widgets that came from the widget set `vis-2-widgets-material`, see Generic.tsx.
 *
 * Their words carry the prefix of that set, and they are registered here the same way the loader of a remote widget
 * set registers them - once, when this module is loaded.
 */
I18n.extendTranslations(translations);

const MATERIAL_WIDGETS = [
    Blinds,
    Camera,
    Clock,
    Lock,
    Navigate,
    Security,
    SimpleState,
    Static,
    ThemeSwitcher,
    Thermostat,
    Vacuum,
    WasherDryer,
];

export default MATERIAL_WIDGETS;
