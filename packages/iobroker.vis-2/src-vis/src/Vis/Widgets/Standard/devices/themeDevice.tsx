import React from 'react';

import { DarkMode as DarkIcon, LightMode as LightIcon } from '@mui/icons-material';

import type { ThemeName } from '@iobroker/gui-components';

import SlideToggle from '../Base/controls/SlideToggle';
import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface ThemeRxData extends StandardRxData {
    /** What the widget is for: switching, setting one theme, or following the browser */
    mode?: 'toggle' | 'fixed' | 'system';
    /** The theme that is set in `fixed` */
    themeName?: ThemeName;
}

/** The themes the runtime knows, in the two families it has */
const MODERN: ThemeName[] = ['modernDark', 'modernLight'];

/**
 * The theme that is the opposite of this one, in the same family.
 *
 * vis has two pairs of themes - the old `light` and `dark` and the new `modernLight` and `modernDark` - and a
 * switch that threw somebody out of the new pair into the old one on the first press would be a switch nobody
 * would press twice.
 *
 * @param current - the theme the runtime is in
 * @param dark - whether the dark one of the pair is wanted
 */
function counterpart(current: ThemeName, dark: boolean): ThemeName {
    const modern = MODERN.includes(current);
    if (dark) {
        return modern ? 'modernDark' : 'dark';
    }
    return modern ? 'modernLight' : 'light';
}

interface ApplyThemeProps {
    /** `fixed` sets one theme, `system` follows what the browser is set to */
    mode: 'fixed' | 'system';
    /** The theme of `fixed` */
    fixed?: ThemeName;
    /** The theme the runtime is in */
    current: ThemeName;
    setTheme: (themeName: ThemeName) => void;
}

/**
 * The part of the switch that draws nothing: it sets the theme when the page opens.
 *
 * It is a component and not something the widget does while it renders, because setting the theme changes
 * the state of the whole runtime - doing that in the middle of drawing a widget is how React ends up
 * rendering for ever.
 *
 * @param props - which theme is wanted, which one is on, and how to change it
 */
function ApplyTheme(props: ApplyThemeProps): null {
    const { mode, fixed, current } = props;
    const [dark, setDark] = React.useState<boolean | null>(null);

    // the theme is set through a ref rather than out of the props, so that a widget which renders again for
    // its own reasons does not run the change a second time
    const setTheme = React.useRef(props.setTheme);
    React.useEffect(() => {
        setTheme.current = props.setTheme;
    });

    // what the browser is set to, which is only of interest while the widget follows it
    React.useEffect(() => {
        if (mode !== 'system' || !window.matchMedia) {
            return;
        }
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        const read = (): void => setDark(query.matches);
        read();
        query.addEventListener('change', read);

        return () => query.removeEventListener('change', read);
    }, [mode]);

    const wanted = mode === 'fixed' ? fixed : dark === null ? undefined : counterpart(current, dark);

    React.useEffect(() => {
        if (wanted && wanted !== current) {
            setTheme.current(wanted);
        }
    }, [wanted, current]);

    return null;
}

/**
 * The theme switcher: the page in the dark or in the light theme.
 *
 * A dashboard that hangs in a hallway is read in daylight and at night, and which of the two it should be in
 * is not something the project can know. The widget is the switch for it, and what it switches is the runtime
 * itself - not a colour of a widget - so every card, every marker and the menu change with it. The choice is
 * remembered in the browser, so the tablet in the hall keeps it and the phone of the neighbour does not.
 *
 * It has two other uses besides being a switch: a view that must always be dark sets `fixed` and is left
 * alone, and one that should look like everything else on the device follows the browser.
 */
const themeDevice = defineDeviceWidget<ThemeRxData>({
    name: 'Theme',
    label: 'widget_theme',
    help: 'help_theme',
    picture: {
        glyph:
            '<circle cx="12" cy="12" r="8.5" stroke-width="2"/>' +
            '<path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>',
        value: 'Hell',
        toggle: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M16 5a11 11 0 0 1 0 22z" fill="currentColor"/></svg>',
    // no device in the house has anything to do with this one
    deviceTypes: [],
    fields: [
        {
            name: 'mode',
            type: 'select',
            label: 'theme_mode',
            default: 'toggle',
            tooltip: 'theme_mode_tooltip',
            options: [
                { value: 'toggle', label: 'theme_mode_toggle' },
                { value: 'fixed', label: 'theme_mode_fixed' },
                { value: 'system', label: 'theme_mode_system' },
            ],
        },
        {
            name: 'themeName',
            type: 'select',
            label: 'theme_name',
            default: 'dark',
            hidden: "data.mode !== 'fixed'",
            options: [
                { value: 'light', label: 'theme_light' },
                { value: 'dark', label: 'theme_dark' },
                { value: 'modernLight', label: 'theme_modern_light' },
                { value: 'modernDark', label: 'theme_modern_dark' },
            ],
        },
    ],
    tile: { columns: 4, rows: 2, minColumns: 2 },
    markerShape: 'icon',
    box: { width: 60, height: 60 },
    render: context => {
        const { data, theme, accents, t } = context;
        const mode = data.mode || 'toggle';
        const dark = context.themeType === 'dark';

        /** Into the other theme of the pair the runtime is in */
        const toggle = (): void => {
            if (!context.editMode) {
                context.setTheme(counterpart(theme.name, !dark));
            }
        };

        const word = t(dark ? 'theme_is_dark' : 'theme_is_light');

        return {
            accent: dark ? accents.blue : accents.yellow,
            active: false,
            icon: dark ? (
                <DarkIcon style={{ width: '100%', height: '100%' }} />
            ) : (
                <LightIcon style={{ width: '100%', height: '100%' }} />
            ),
            value: word,
            valueColor: theme.palette.text.primary,
            stateText: word,
            control:
                mode === 'toggle' ? (
                    <SlideToggle
                        on={dark}
                        color={accents.blue}
                        offColor={theme.palette.divider}
                        disabled={context.editMode}
                        onChange={toggle}
                    />
                ) : null,
            // in the other two modes the widget is machinery rather than a switch: it sets the theme and a
            // click on it would fight what it was told to do
            onClick: mode === 'toggle' ? toggle : undefined,
            // the editor is not the page this was put on: a widget that sets the theme while somebody is
            // dragging it would change the editor around them
            effect:
                mode === 'toggle' || context.editMode ? null : (
                    <ApplyTheme
                        mode={mode}
                        fixed={data.themeName}
                        current={theme.name}
                        setTheme={name => context.setTheme(name)}
                    />
                ),
        };
    },
});

export default themeDevice;
