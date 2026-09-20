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
                            options: [
                                { value: 'dark', label: 'dark' },
                                { value: 'light', label: 'light' },
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

    componentDidMount(): void {
        super.componentDidMount();
        let themeName: ThemeName;
        // get browser theme
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            // dark mode
            themeName = 'dark';
        } else {
            themeName = 'light';
        }

        if (this.state.rxData.themeType === 'system') {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.onThemeChanged);
            this.setState({ themeName }, () => this.setViewTheme(themeName));
        } else if (this.state.rxData.themeType === 'static') {
            // set view theme
            themeName = this.state.rxData.themeName;
        } else if (this.state.rxData.themeType === 'variable') {
            // get the last theme from local storage
            themeName =
                (window.localStorage.getItem('App.themeName') as ThemeName) ||
                (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
        this.setState({ themeName }, () => this.setViewTheme(themeName));
    }

    setViewTheme(themeName: ThemeName): void {
        this.props.context?.toggleTheme?.(themeName || this.state.rxData.themeName);
    }

    onThemeChanged = (event: { matches: boolean }): void =>
        this.setState({ themeName: event.matches ? 'dark' : 'light' });

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
                    // the button is as wide as the sun and the moon on it, not as wide as the cell it stands in
                    style={{
                        minWidth: 0,
                        width: 'auto',
                        height: '100%',
                        aspectRatio: '1 / 1',
                        padding: 0,
                    }}
                    onClick={e => {
                        e.stopPropagation();
                        const themeName = this.state.themeName;

                        const newThemeName = themeName === 'dark' ? 'light' : 'dark';

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
