/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2023-2025 Denis Haev https://github.com/GermanBluefox,
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

import type { TextFieldVariants } from '@mui/material';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget from '../../visRxWidget';

// the picker brings `@mui/x-date-pickers` and dayjs along, see DateTimePickers.tsx
const VisDatePicker = React.lazy(() => import('./DateTimePickers').then(m => ({ default: m.VisDatePicker })));

type RxData = {
    oid: string;
    variant: TextFieldVariants;
    autoFocus: boolean;
    clearable: boolean;
    widgetTitle: string;
    disableFuture: boolean;
    disablePast: boolean;
    asFullDate: boolean;
    displayWeekNumber: boolean;
    wideFormat: boolean;
};

class JQuiInputDate extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplJquiInputDate',
            visSet: 'jqui',
            visName: 'Input Date',
            visWidgetLabel: 'jqui_input_date',
            visHelp: 'help_jqui_input_date', // Description in the palette
            visPrev: 'widgets/jqui/img/Prev_InputDate.png',
            visOrder: 30,
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'oid',
                            type: 'id',
                        },
                        {
                            name: 'variant',
                            label: 'jqui_variant',
                            type: 'select',
                            options: [
                                { label: 'standard', value: 'standard' },
                                { label: 'outlined', value: 'outlined' },
                                { label: 'filled', value: 'filled' },
                            ],
                            default: 'standard',
                        },
                        {
                            name: 'autoFocus',
                            type: 'checkbox',
                        },
                        {
                            name: 'clearable',
                            label: 'jqui_clearable',
                            type: 'checkbox',
                        },
                        {
                            name: 'widgetTitle',
                            label: 'jqui_widgetTitle',
                            type: 'text',
                        },
                        {
                            name: 'disableFuture',
                            label: 'jqui_disableFuture',
                            type: 'checkbox',
                            hidden: '!!data.disablePast',
                        },
                        {
                            name: 'disablePast',
                            label: 'jqui_disablePast',
                            type: 'checkbox',
                            hidden: '!!data.disableFuture',
                        },
                        {
                            name: 'asFullDate',
                            label: 'jqui_asFullDate',
                            type: 'checkbox',
                        },
                        {
                            name: 'displayWeekNumber',
                            label: 'jqui_displayWeekNumber',
                            type: 'checkbox',
                        },
                        {
                            name: 'wideFormat',
                            label: 'jqui_wideFormat',
                            type: 'checkbox',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 250,
                height: 56,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return JQuiInputDate.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);
        props.style.overflow = 'visible';

        return (
            <div className="vis-widget-body">
                <React.Suspense fallback={null}>
                    <VisDatePicker
                        value={this.state.values[`${this.state.rxData.oid}.val`]}
                        lang={this.props.context.lang}
                        variant={this.state.rxData.variant}
                        autoFocus={this.state.rxData.autoFocus}
                        clearable={this.state.rxData.clearable}
                        widgetTitle={this.state.rxData.widgetTitle}
                        asFullDate={this.state.rxData.asFullDate}
                        disableFuture={this.state.rxData.disableFuture}
                        disablePast={this.state.rxData.disablePast}
                        displayWeekNumber={this.state.rxData.displayWeekNumber}
                        wideFormat={this.state.rxData.wideFormat}
                        onChange={val => this.props.context.setValue(this.state.rxData.oid, val)}
                    />
                </React.Suspense>
            </div>
        );
    }
}

export default JQuiInputDate;
