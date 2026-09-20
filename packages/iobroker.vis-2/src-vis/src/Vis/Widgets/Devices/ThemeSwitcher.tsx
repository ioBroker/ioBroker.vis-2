import React from 'react';

import { Button } from '@mui/material';

import type { RxRenderWidgetProps, RxWidgetInfo, WidgetData, VisRxWidgetState } from '@iobroker/types-vis-2';
import { ToggleThemeMenu, I18n, type ThemeName } from '@iobroker/gui-components';

import Generic from './Generic';

interface ThemeSwitcherRxData {
    themeType: 'system' | 'static' | 'variable';
    themeName: ThemeName;
    variant: 'contained' | 'text' | 'outlined';
}

interface ThemeSwitcherState extends VisRxWidgetState {
    themeName: ThemeName;
}

export default class ThemeSwitcher extends Generic<ThemeSwitcherRxData, ThemeSwitcherState> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2ThemeSwitcher',
            visSet: 'devices',
            visSetLabel: 'set_label',
            visSetColor: '#00897b',
            visName: 'Theme switcher',
            visWidgetLabel: 'theme_switcher', // Label of widget
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            label: 'theme_type',
                            type: 'select',
                            options: [
                                { value: 'system', label: 'Browser' },
                                { value: 'static', label: 'Static' },
                                { value: 'variable', label: 'Variable' },
                            ],
                            default: 'system',
                            name: 'themeType',
                        },
                        {
                            name: 'themeName',
                            type: 'select',
                            noTranslation: true,
                            // the modern ones are the successors of dark and light, see ThemeName of the components
                            options: [
                                { value: 'dark', label: 'dark' },
                                { value: 'light', label: 'light' },
                                { value: 'modernDark', label: 'modernDark' },
                                { value: 'modernLight', label: 'modernLight' },
                            ],
                            default: 'light',
                            label: 'theme_name',
                            hidden: (data: WidgetData) => data.themeType === 'system',
                        },
                        {
                            name: 'variant',
                            type: 'select',
                            options: [
                                { value: 'contained', label: 'Contained' },
                                { value: 'text', label: 'Text' },
                                { value: 'outlined', label: 'Outlined' },
                            ],
                            default: 'outlined',
                            label: 'variant',
                            hidden: (data: WidgetData) => data.themeType !== 'variable',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 48,
                height: 48,
                position: 'absolute',
            },
            // one cell of a section is plenty for a button with a sun on it
            visDefaultGrid: {
                columns: 1,
                rows: 1,
                maxColumns: 2,
            },
            visPrev: 'widgets/devices/img/prev_theme_switcher.png',
        };
    }

    /**
     * The theme of the browser, in the family the view already uses.
     *
     * A view that runs on `modernLight` should become `modernDark` when the browser turns dark, not `dark`.
     *
     * @param dark true when the browser asks for a dark theme
     * @returns the name of the theme to set
     */
    browserTheme(dark: boolean): ThemeName {
        const current = this.props.context.themeName;
        const modern = current === 'modernDark' || current === 'modernLight';
        if (dark) {
            return modern ? 'modernDark' : 'dark';
        }
        return modern ? 'modernLight' : 'light';
    }

    componentDidMount(): void {
        super.componentDidMount();
        // get browser theme
        let themeName: ThemeName = this.browserTheme(
            !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
        );

        if (this.state.rxData.themeType === 'system') {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.onThemeChanged);
            this.setState({ themeName }, () => this.setViewTheme(themeName));
        } else if (this.state.rxData.themeType === 'static') {
            // set view theme
            themeName = this.state.rxData.themeName;
        } else if (this.state.rxData.themeType === 'variable') {
            // get the last theme from local storage
            themeName = (window.localStorage.getItem('App.themeName') as ThemeName) || themeName;
        }
        this.setState({ themeName }, () => this.setViewTheme(themeName));
    }

    setViewTheme(themeName: ThemeName): void {
        this.props.context?.toggleTheme?.(themeName || this.state.rxData.themeName);
    }

    onThemeChanged = (event: { matches: boolean }): void => {
        const themeName = this.browserTheme(event.matches);
        this.setState({ themeName }, () => this.setViewTheme(themeName));
    };

    componentWillUnmount(): void {
        if (this.state.rxData.themeType === 'system') {
            window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this.onThemeChanged);
        }
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return ThemeSwitcher.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element[] | React.JSX.Element | null {
        super.renderWidgetBody(props);
        if (this.state.rxData.themeType === 'system' || this.state.rxData.themeType === 'static') {
            if (this.props.editMode) {
                return (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            height: '100%',
                        }}
                    >
                        <ToggleThemeMenu
                            style={{
                                width: '100%',
                                textAlign: 'center',
                            }}
                            themeName={this.state.themeName}
                            toggleTheme={() => {}}
                            t={I18n.t}
                        />
                    </div>
                );
            }
            return null;
        }
        if (this.state.rxData.themeType === 'variable') {
            return (
                <Button
                    variant={this.state.rxData.variant}
                    // the button fills the widget, whatever size it was given
                    style={{
                        minWidth: 0,
                        width: '100%',
                        height: '100%',
                        padding: 0,
                    }}
                    onClick={e => {
                        e.stopPropagation();
                        const themeName = this.state.themeName;

                        // the switch stays in the family: modernLight turns into modernDark, not into dark
                        const newThemeName: ThemeName =
                            themeName === 'modernLight'
                                ? 'modernDark'
                                : themeName === 'modernDark'
                                  ? 'modernLight'
                                  : themeName === 'dark'
                                    ? 'light'
                                    : 'dark';

                        window.localStorage.setItem('App.themeName', newThemeName);
                        this.setState({ themeName: newThemeName }, () => this.setViewTheme(newThemeName));
                    }}
                >
                    <ToggleThemeMenu
                        themeName={this.state.themeName}
                        toggleTheme={() => {}}
                        t={I18n.t}
                    />
                </Button>
            );
        }

        return null;
    }
}
