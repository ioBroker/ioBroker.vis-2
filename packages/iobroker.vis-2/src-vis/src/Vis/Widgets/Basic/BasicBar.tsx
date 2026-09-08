import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget from '@/Vis/visRxWidget';

type RxData = {
    oid: string;
    min?: number;
    max?: number;
    orientation?: 'horizontal' | 'vertical';
    color?: string;
    border?: string;
    shadow?: string;
    reverse?: boolean;
    mui?: boolean;
};

export default class BasicBar extends VisRxWidget<RxData> {
    /**
     * Returns the widget info which is rendered in the edit mode
     */
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplValueFloatBar',
            visSet: 'basic',
            visName: 'Bar',
            visPrev: 'widgets/basic/img/Prev_ValueFloatBar.png',
            visHelp: 'help_value_float_bar', // Description in the palette
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'oid',
                            type: 'id',
                        },
                        {
                            name: 'min',
                            type: 'number',
                            default: 0,
                        },
                        {
                            name: 'max',
                            type: 'number',
                            default: 100,
                        },
                        {
                            name: 'orientation',
                            type: 'select',
                            default: 'horizontal',
                            options: [
                                { value: 'horizontal', label: 'horizontal' },
                                { value: 'vertical', label: 'vertical' },
                            ],
                        },
                        {
                            name: 'color',
                            type: 'color',
                            default: 'blue',
                        },
                        {
                            name: 'border',
                            type: 'text',
                        },
                        {
                            name: 'shadow',
                            type: 'text',
                        },
                        {
                            name: 'reverse',
                            type: 'checkbox',
                        },
                        /*
                         * The look of the bar. `default: true` is what makes this a change for new widgets
                         * only: the defaults of the fields are written into the data when a widget is placed
                         * (see `Editor.addWidget`) and are never filled in while rendering. A bar that is
                         * already on a page therefore has no `mui` at all, which is not `true`, and keeps the
                         * look it was built with - while a new one is drawn the new way and can be turned
                         * back here.
                         */
                        {
                            name: 'mui',
                            label: 'vis_2_widgets_basic_mui',
                            type: 'checkbox',
                            default: true,
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 200,
                height: 130,
            },
        } as const;
    }

    /**
     * Enables calling widget info on the class instance itself
     */
    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicBar.getWidgetInfo();
    }

    /**
     * Calculate the width or height of the bar w.r.t. to the border
     *
     * @param css the border css attribute
     * @param multiplier number of borders, normally 2
     */
    // eslint-disable-next-line class-methods-use-this
    extractWidth(css: string, multiplier: number): number | string | undefined {
        // extract from "2px solid #aabbcc" => 2px
        const m = css.match(/([0-9]+)(px|em)?/);
        if (m) {
            if (m[1] && m[2]) {
                return parseInt(m[1], 10) * (multiplier || 1) + m[2];
            }
            return parseInt(m[1], 10) * (multiplier || 1);
        }

        return undefined;
    }

    /**
     * Calculate the length of the bar
     */
    getCalc(): string {
        const min = this.state.rxData.min || this.state.rxData.min === 0 ? Number(this.state.rxData.min) : 0;
        const max = this.state.rxData.max || this.state.rxData.max === 0 ? Number(this.state.rxData.max) : 100;
        let val = parseFloat(this.state.values[`${this.state.rxData.oid}.val`]) || 0;
        val = (val - min) / (max - min);
        return this.state.rxData.border
            ? `calc(${Math.round(val * 100)}% - ${this.extractWidth(this.state.rxData.border, 2)})`
            : `${Math.round(val * 100)}%`;
    }

    /** How full the bar is, 0 to 100 - a value outside min..max cannot make it longer than its track */
    getPercent(): number {
        const min = this.state.rxData.min || this.state.rxData.min === 0 ? Number(this.state.rxData.min) : 0;
        const max = this.state.rxData.max || this.state.rxData.max === 0 ? Number(this.state.rxData.max) : 100;
        const value = parseFloat(this.state.values[`${this.state.rxData.oid}.val`]) || 0;
        if (max === min) {
            return 0;
        }
        return Math.min(100, Math.max(0, Math.round(((value - min) / (max - min)) * 100)));
    }

    /**
     * The bar as MUI draws a progress bar: a track that stays visible where the bar has not reached yet,
     * both ends rounded, and a value that slides to its new place instead of jumping.
     */
    renderMuiBody(): React.JSX.Element {
        const theme = this.props.context.theme;
        const vertical = this.state.rxData.orientation === 'vertical';
        const percent = this.getPercent();
        const radius = typeof theme.shape.borderRadius === 'number' ? theme.shape.borderRadius : 4;

        const track: React.CSSProperties = {
            position: 'relative',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            borderRadius: radius,
            // the same wash MUI puts under a progress bar, so the bar reads as the filled part of something
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.13)' : 'rgba(0, 0, 0, 0.09)',
            overflow: 'hidden',
        };
        if (this.state.rxData.border) {
            track.border = this.state.rxData.border;
        }
        if (this.state.rxData.shadow) {
            track.boxShadow = this.state.rxData.shadow;
        }

        const bar: React.CSSProperties = {
            position: 'absolute',
            borderRadius: radius,
            backgroundColor: this.state.rxData.color || theme.palette.primary.main,
            transition: 'width 0.4s ease-out, height 0.4s ease-out',
            // which end it grows from stays what it was, so the switch changes the look and nothing else
            ...(vertical
                ? {
                      left: 0,
                      right: 0,
                      height: `${percent}%`,
                      ...(this.state.rxData.reverse ? { bottom: 0 } : { top: 0 }),
                  }
                : {
                      top: 0,
                      bottom: 0,
                      width: `${percent}%`,
                      ...(this.state.rxData.reverse ? { right: 0 } : { left: 0 }),
                  }),
        };

        return (
            <div className="vis-widget-body">
                <div style={track}>
                    <div
                        data-oid={this.state.rxData.oid}
                        style={bar}
                    ></div>
                </div>
            </div>
        );
    }

    /**
     * Renders the widget
     *
     * @param props props passed to the parent classes render method
     */
    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // a binding may hand the flag over as a string
        if (this.state.rxData.mui === true || (this.state.rxData.mui as unknown as string) === 'true') {
            return this.renderMuiBody();
        }

        let style: React.CSSProperties;

        if (this.state.rxData.orientation === 'vertical') {
            style = { height: this.getCalc() };
            if (this.state.rxData.reverse) {
                style = {
                    ...style,
                    left: 0,
                    position: 'absolute',
                    bottom: '0',
                };
            }

            if (this.state.rxData.border) {
                style = {
                    ...style,
                    border: this.state.rxData.border,
                    width: `calc(100% - ${this.extractWidth(this.state.rxData.border, 2)}`,
                };
            }
        } else {
            style = { width: this.getCalc() };
            if (this.state.rxData.reverse) {
                style = {
                    ...style,
                    float: 'right',
                };
            }

            if (this.state.rxData.border) {
                style = {
                    ...style,
                    border: this.state.rxData.border,
                    height: `calc(100% - ${this.extractWidth(this.state.rxData.border, 2)}`,
                };
            }
        }

        if (this.state.rxData.shadow) {
            style = { ...style, boxShadow: this.state.rxData.shadow };
        }

        if (this.state.rxData.color) {
            style = { ...style, backgroundColor: this.state.rxData.color };
        }

        return (
            <div className="vis-widget-body">
                <div
                    data-oid={this.state.rxData.oid}
                    className="vis-widget-body"
                    style={style}
                ></div>
            </div>
        );
    }
}
