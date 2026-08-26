import type React from 'react';
import { createTheme as muiCreateTheme } from '@mui/material/styles';
import { Theme, type ThemeName } from '@iobroker/gui-components';
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
        // With CSS variables MUI resolves the text color of a `color="default"` Fab from the palette
        // (`--mui-palette-grey-900` resp. `--mui-palette-text-primary`) instead of contrasting it against
        // the grey[300] background the Fab paints for itself. In the dark theme that is light on light.
        // The button variants of the ioBroker theme already contrast explicitly, the Fab did not. See #661.
        const greyBackground = theme.palette.grey?.[300];
        const defaultFabColor = greyBackground ? theme.palette.getContrastText(greyBackground) : undefined;

        theme = muiCreateTheme(
            {
                ...theme,
                // `color-scheme: dark` on `:root` makes the browser paint an opaque canvas (#121212) behind a
                // document that declares itself transparent, so an `iFrame` or `echarts` widget - and the whole
                // runtime embedded in an app - loses its transparency in the dark mode. Measured: with the
                // scheme the embedded document shows #121212, without it the parent shines through. See #661.
                cssVariables: { disableCssColorScheme: true },
            },
            {
                components: {
                    MuiFab: {
                        styleOverrides: {
                            root: ({ ownerState }: { ownerState?: { color?: string } }) =>
                                defaultFabColor && (!ownerState?.color || ownerState.color === 'default')
                                    ? { color: defaultFabColor }
                                    : {},
                        },
                    },
                },
            },
        ) as VisTheme;
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
