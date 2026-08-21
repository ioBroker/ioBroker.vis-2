import type React from 'react';
import { createTheme as muiCreateTheme } from '@mui/material/styles';
import { Theme, type ThemeName } from '@iobroker/adapter-react-v5';
import type { VisTheme } from '@iobroker/types-vis-2';

export default function createTheme(
    themeName: ThemeName,
    overrides?: Record<string, any>,
    /**
     * Generate the MUI CSS variables (`--mui-palette-*`), so the colors can be adjusted via CSS.
     * Only the topmost theme may do that, as all variables are written to `:root`
     * and nested themes would overwrite each other.
     */
    cssVariables = true,
): VisTheme {
    const danger = '#dd5325';
    const success = '#73b6a8';
    let theme: VisTheme = Theme(themeName, overrides) as VisTheme;
    if (cssVariables) {
        theme = muiCreateTheme({
            ...theme,
            // `color-scheme: dark` on `:root` makes the browser paint an opaque background behind an iframe
            // whose document does not carry the same scheme, so an `iFrame` or `echarts` widget lost its
            // transparency in the dark mode
            cssVariables: { disableCssColorScheme: true },
            components: {
                ...theme.components,
                MuiCssBaseline: {
                    styleOverrides: {
                        // `CssBaseline` switches the whole document to `border-box`. The widgets - the built-in
                        // ones and those of other adapters alike - are laid out for the default `content-box`
                        // and get their content cut off by it
                        '*, *::before, *::after': { boxSizing: 'initial' },
                    },
                },
                MuiFab: {
                    styleOverrides: {
                        // MUI writes `var(--mui-palette-text-primary)` as soon as the CSS variables are
                        // generated - white in the dark mode - while the background stays `grey[300]`.
                        // Without the variables it is the contrast text of that background.
                        root: { '&.MuiFab-default': { color: 'rgba(0, 0, 0, 0.87)' } },
                    },
                },
            },
        }) as VisTheme;
    }
    theme.palette.text.danger = {
        color: danger,
    };
    theme.palette.text.success = {
        color: success,
    };

    const classes: {
        blockHeader: React.CSSProperties;
        viewTabs: React.CSSProperties;
        viewTab: React.CSSProperties;
        lightedPanel: React.CSSProperties;
        toolbar: React.CSSProperties;
        viewManageBlock: React.CSSProperties;
        viewManageButtonActions: React.CSSProperties;
    } = {
        blockHeader: {
            fontSize: 16,
            textAlign: 'left',
            marginTop: '8px',
            borderRadius: '2px',
            paddingLeft: '8px',
        },
        viewTabs: {
            minHeight: 0,
        },
        viewTab: {
            minWidth: 0,
            minHeight: 0,
        },
        lightedPanel: {
            backgroundColor: theme.palette.mode === 'dark' ? 'hsl(0deg 0% 20%)' : 'hsl(0deg 0% 90%)',
        },
        toolbar: {
            display: 'flex',
            alignItems: 'center',
            paddingTop: '10px',
            paddingBottom: '10px',
        },
        viewManageBlock: {
            display: 'flex',
            alignItems: 'center',
        },
        viewManageButtonActions: {
            textAlign: 'right',
            flex: 1,
        },
    };

    if (!theme.classes) {
        theme.classes = classes;
    } else {
        Object.assign(theme.classes, classes);
    }

    return theme;
}
