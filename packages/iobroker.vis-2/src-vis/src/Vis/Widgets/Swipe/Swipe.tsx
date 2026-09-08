/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2024-2025 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

import React from 'react';

import { I18n } from '@iobroker/gui-components';
import type { RxRenderWidgetProps, RxWidgetInfo, WidgetData } from '@iobroker/types-vis-2';
import VisRxWidget from '../../visRxWidget';
import InstallSwipe from './InstallSwipe';

interface RxData extends WidgetData {
    left_nav_view: string;
    right_nav_view: string;
    up_nav_view: string;
    down_nav_view: string;
    hideIndication: boolean;
    threshold: number;
}

/** The four ways to swipe, in the order the preview lists them */
const DIRECTIONS: { field: keyof RxData; arrow: string; label: string }[] = [
    { field: 'left_nav_view', arrow: '←', label: 'vis_2_widgets_swipe_left_view' },
    { field: 'right_nav_view', arrow: '→', label: 'vis_2_widgets_swipe_right_view' },
    { field: 'up_nav_view', arrow: '↑', label: 'vis_2_widgets_swipe_up_view' },
    { field: 'down_nav_view', arrow: '↓', label: 'vis_2_widgets_swipe_down_view' },
];

class Swipe extends VisRxWidget<RxData> {
    private swipeable: InstallSwipe | null = null;

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplSwipe',
            visSet: 'swipe',
            visName: 'Swipe Navigation',
            visSetLabel: 'vis_2_widgets_widgets_swipe_label', // label of the widget set
            visPrev: 'widgets/swipe/img/Prev_Swipe.png',
            visWidgetLabel: 'vis_2_widgets_widgets_swipe_label', // Label of widget
            visHelp: 'help_swipe', // Description in the palette
            visSetIcon: 'widgets/swipe/img/Prev_Swipe.png', // Icon of a widget set
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        // Without a label of its own every one of these reads "Viewname": the name falls
                        // back to the dictionary of the vis-1 widget set, and that translated all of them
                        // the same way. Which side a view sits on is the only thing worth saying here.
                        {
                            name: 'left_nav_view',
                            label: 'vis_2_widgets_swipe_left_view',
                            type: 'select-views',
                            multiple: false,
                        },
                        {
                            name: 'right_nav_view',
                            label: 'vis_2_widgets_swipe_right_view',
                            type: 'select-views',
                            multiple: false,
                        },
                        {
                            name: 'up_nav_view',
                            label: 'vis_2_widgets_swipe_up_view',
                            type: 'select-views',
                            multiple: false,
                        },
                        {
                            name: 'down_nav_view',
                            label: 'vis_2_widgets_swipe_down_view',
                            type: 'select-views',
                            multiple: false,
                        },
                        {
                            name: 'hideIndication',
                            label: 'vis_2_widgets_swipe_hide_indication_label', // 'Hide indication',
                            type: 'checkbox',
                        },
                        {
                            name: 'threshold',
                            label: 'vis_2_widgets_swipe_threshold_label', // 'Hide indication',
                            type: 'number',
                            default: 30,
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 200,
                height: 116,
            },
        } as const;
    }

    componentDidMount(): void {
        super.componentDidMount();

        this.swipeable ||= new InstallSwipe({
            onSwipeLeft: () => {
                if (this.state.rxData.left_nav_view) {
                    this.props.context.changeView(this.state.rxData.left_nav_view);
                }
            },
            onSwipeRight: () => {
                if (this.state.rxData.right_nav_view) {
                    this.props.context.changeView(this.state.rxData.right_nav_view);
                }
            },
            onSwipeUp: () => {
                if (this.state.rxData.up_nav_view) {
                    this.props.context.changeView(this.state.rxData.up_nav_view);
                }
            },
            onSwipeDown: () => {
                if (this.state.rxData.down_nav_view) {
                    this.props.context.changeView(this.state.rxData.down_nav_view);
                }
            },
        });
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return Swipe.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | null {
        super.renderWidgetBody(props);

        if (this.props.editMode) {
            this.swipeable?.destroy();

            // In the editor nothing can be swiped, so the widget says instead what it would do: one line per
            // direction, the arrow first and the view behind it. A direction without a view stays in the
            // list, greyed out - that it is free is the thing worth seeing while a page is being built.
            return (
                <div
                    className="vis-widget-body"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        padding: 8,
                        height: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
                        {I18n.t('vis_2_widgets_widgets_swipe_label')}
                    </div>
                    {DIRECTIONS.map(direction => {
                        const view = this.state.rxData[direction.field] as string;
                        return (
                            <div
                                key={direction.field}
                                title={I18n.t(direction.label)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    opacity: view ? 1 : 0.4,
                                }}
                            >
                                <span style={{ width: 14, textAlign: 'center', flexShrink: 0 }}>{direction.arrow}</span>
                                <span
                                    style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontStyle: view ? undefined : 'italic',
                                    }}
                                >
                                    {view || I18n.t('vis_2_widgets_swipe_no_view')}
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        }

        const viewEl = this.props.refParent?.current;
        if (this.swipeable && viewEl) {
            this.swipeable.install(viewEl, {
                hideIndication: this.state.rxData.hideIndication,
                indicationRight: this.state.rxData.right_nav_view
                    ? this.props.context.views[this.state.rxData.right_nav_view]?.name ||
                      this.state.rxData.right_nav_view
                    : '',
                indicationLeft: this.state.rxData.left_nav_view
                    ? this.props.context.views[this.state.rxData.left_nav_view]?.name || this.state.rxData.left_nav_view
                    : '',
                indicationUp: this.state.rxData.up_nav_view
                    ? this.props.context.views[this.state.rxData.up_nav_view]?.name || this.state.rxData.up_nav_view
                    : '',
                indicationDown: this.state.rxData.down_nav_view
                    ? this.props.context.views[this.state.rxData.down_nav_view]?.name || this.state.rxData.down_nav_view
                    : '',
                swipeThreshold: this.state.rxData.threshold || 30,
            });
        }

        return null;
    }
}

export default Swipe;
