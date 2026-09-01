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

    // No radius override: the editor keeps square corners - rounded panels read as dated here.
    // "trennt, umrandet aber nicht" - the kit separates with a hairline instead of framing with a border.
    // The value is the one of the dark sheet; in the light theme that light blue would be invisible, so
    // there the MUI divider stays. It is applied where it is needed rather than as `palette.divider`: with
    // `cssVariables` MUI builds --mui-palette-divider from `colorSchemes`, so neither a later assignment
    // nor a palette override in createTheme would reach it.
    const hairline = themeName === 'dark' || theme.palette.mode === 'dark' ? 'rgba(126, 195, 240, 0.14)' : theme.palette.divider;

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
    } else {
        // a nested theme must not emit the variables again, but it has to look the same
        theme = muiCreateTheme({ ...theme }) as VisTheme;
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
            fontWeight: 600,
            textAlign: 'left',
            marginTop: '8px',
            borderRadius: '2px',
            padding: '8px 12px',
        },
        viewTabs: {
            minHeight: 0,
        },
        viewTab: {
            minWidth: 0,
            minHeight: 0,
        },
        lightedPanel: {
            // Careful: this is applied to whole panels AND to single rows (the accordion summaries of the
            // palette). A frame with a card radius turns a list into a row of capsules, so this stays a
            // surface tint. The card look is built where an actual card is built.
            backgroundColor: theme.palette.background.paper,
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
